"""
CSV Lead Source: parses local files or uploaded CSV content with schema mapping.
"""

import csv
import io
from typing import Any, AsyncGenerator, Dict, Optional
from app.leads.sources.base import LeadSource


# Canonical column alias mapping dictionary for flexible CSV ingestion
DEFAULT_COLUMN_MAPPINGS = {
    # Phone aliases
    "phone": "phone",
    "mobile": "phone",
    "phone_number": "phone",
    "contact": "phone",
    "whatsapp": "phone",
    "whatsapp_number": "phone",
    # Name aliases
    "name": "name",
    "full_name": "name",
    "contact_name": "name",
    "first_name": "first_name",
    "last_name": "last_name",
    # Company aliases
    "company": "company_name",
    "company_name": "company_name",
    "business_name": "company_name",
    "organization": "company_name",
    "business_type": "company_type",
    "company_type": "company_type",
    "category": "company_type",
    # Location
    "city": "city",
    "state": "state",
    "country": "country",
    "postal_code": "postal_code",
    "pincode": "postal_code",
    "zip": "postal_code",
    # Commercial interests
    "product_interest": "product_interest",
    "product": "product_interest",
    "tea_type": "product_interest",
    "quantity": "estimated_quantity",
    "estimated_quantity": "estimated_quantity",
    "budget": "estimated_budget",
    "estimated_budget": "estimated_budget",
    # Consent
    "opt_in": "opt_in_status",
    "opt_in_status": "opt_in_status",
    "consent": "opt_in_status",
    "language": "preferred_language",
    "preferred_language": "preferred_language",
    "notes": "notes",
}


class CsvLeadSource(LeadSource):
    """
    Parses CSV lead files or raw text strings, applying column mapping.
    """

    def __init__(
        self,
        content_or_path: str,
        is_file_path: bool = False,
        custom_mappings: Optional[Dict[str, str]] = None,
    ):
        self.content_or_path = content_or_path
        self.is_file_path = is_file_path
        self.mappings = dict(DEFAULT_COLUMN_MAPPINGS)
        if custom_mappings:
            self.mappings.update(custom_mappings)

    def _map_row(self, row: Dict[str, str]) -> Dict[str, Any]:
        mapped: Dict[str, Any] = {}
        for raw_key, value in row.items():
            if not raw_key:
                continue
            normalized_key = raw_key.strip().lower().replace(" ", "_")
            canonical_key = self.mappings.get(normalized_key, normalized_key)
            val = value.strip() if isinstance(value, str) else value
            
            # Boolean conversions for opt-in
            if canonical_key == "opt_in_status":
                if isinstance(val, str):
                    val = val.lower() in ("true", "1", "yes", "y", "t")
            mapped[canonical_key] = val
        return mapped

    async def fetch_leads(self) -> AsyncGenerator[Dict[str, Any], None]:
        """Streams normalized rows from the CSV."""
        if self.is_file_path:
            with open(self.content_or_path, mode="r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    yield self._map_row(row)
        else:
            stream = io.StringIO(self.content_or_path)
            reader = csv.DictReader(stream)
            for row in reader:
                yield self._map_row(row)
