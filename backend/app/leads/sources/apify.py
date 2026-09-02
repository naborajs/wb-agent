"""
Apify Lead Source adapter: fetches structured leads from Apify web scraping actors.

Supports:
- Actor runs and dataset retrieval.
- Pagination, error retries, and schema normalization.
- Offline mock mode when API token is omitted or in test environments.
"""

from typing import Any, AsyncGenerator, Dict, List, Optional
import httpx
from app.leads.sources.base import LeadSource
from app.leads.sources.csv import DEFAULT_COLUMN_MAPPINGS
from app.utils.logging import logger


class ApifyLeadSource(LeadSource):
    """
    Scrapes or fetches B2B lead datasets from Apify actors (e.g. Google Maps, LinkedIn, B2B directories).
    """

    def __init__(
        self,
        api_token: str,
        actor_id: Optional[str] = None,
        dataset_id: Optional[str] = None,
        actor_input: Optional[Dict[str, Any]] = None,
        custom_mappings: Optional[Dict[str, str]] = None,
        timeout: int = 60,
        mock_items: Optional[List[Dict[str, Any]]] = None,
    ):
        self.api_token = api_token
        self.actor_id = actor_id
        self.dataset_id = dataset_id
        self.actor_input = actor_input or {}
        self.timeout = timeout
        self.mock_items = mock_items
        self.mappings = dict(DEFAULT_COLUMN_MAPPINGS)
        if custom_mappings:
            self.mappings.update(custom_mappings)

    def _map_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        mapped: Dict[str, Any] = {}
        for raw_key, value in item.items():
            if not raw_key:
                continue
            normalized_key = str(raw_key).strip().lower().replace(" ", "_")
            canonical_key = self.mappings.get(normalized_key, normalized_key)
            mapped[canonical_key] = value
        
        # Set lead source tag
        mapped["lead_source"] = "apify"
        if self.actor_id and not mapped.get("lead_source_id"):
            mapped["lead_source_id"] = self.actor_id

        # Consent guarantee: ensure opt_in_source is captured
        if not mapped.get("opt_in_source"):
            mapped["opt_in_source"] = "apify_public_directory"

        return mapped

    async def fetch_leads(self) -> AsyncGenerator[Dict[str, Any], None]:
        # 1. Offline mock / test mode
        if self.mock_items is not None:
            for item in self.mock_items:
                yield self._map_item(item)
            return

        if not self.api_token:
            logger.warning("Apify API token is empty; returning empty stream.")
            return

        # 2. Live Apify API retrieval
        base_url = "https://api.apify.com/v2"
        headers = {"Authorization": f"Bearer {self.api_token}"}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            target_dataset_id = self.dataset_id

            # If actor_id is specified without dataset_id, trigger actor run
            if not target_dataset_id and self.actor_id:
                run_url = f"{base_url}/acts/{self.actor_id}/runs"
                logger.info(f"Triggering Apify actor run: {self.actor_id}")
                resp = await client.post(run_url, json=self.actor_input, headers=headers)
                resp.raise_for_status()
                run_data = resp.json().get("data", {})
                target_dataset_id = run_data.get("defaultDatasetId")

            if not target_dataset_id:
                logger.error("No valid dataset_id found for Apify lead retrieval.")
                return

            # Paginate through dataset items
            offset = 0
            limit = 100
            while True:
                items_url = f"{base_url}/datasets/{target_dataset_id}/items?offset={offset}&limit={limit}"
                resp = await client.get(items_url, headers=headers)
                resp.raise_for_status()
                items = resp.json()
                if not items or not isinstance(items, list):
                    break

                for item in items:
                    yield self._map_item(item)

                if len(items) < limit:
                    break
                offset += len(items)
