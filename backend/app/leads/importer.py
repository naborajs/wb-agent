"""
End-to-end Lead Ingestion Pipeline.

Executes the 10-step ingestion sequence:
detect -> map -> validate -> normalize -> consent check -> deduplicate ->
segment -> import -> emit events -> assign campaign.

Supports row-level error collection (Section 14).
"""

from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import CampaignLead, Lead, LeadEvent
from app.leads.deduplicator import LeadDeduplicator
from app.leads.normalizer import normalize_lead_data
from app.leads.sources.base import LeadSource
from app.leads.validator import validate_lead_record
from app.schemas.leads import LeadImportSummary
from app.utils.logging import logger


class LeadImportPipeline:
    """
    Transactional, fault-tolerant ingestion pipeline for batch leads.
    """

    def __init__(self, session: AsyncSession, org_id: str):
        self.session = session
        self.org_id = org_id
        self.deduplicator = LeadDeduplicator(session, org_id)

    async def run(
        self,
        source: LeadSource,
        campaign_id: Optional[str] = None,
        campaign_name: Optional[str] = None,
    ) -> LeadImportSummary:
        summary = LeadImportSummary()
        row_index = 0

        async for raw_lead in source.fetch_leads():
            row_index += 1
            summary.total_rows += 1

            # 1. Normalize
            normalized = normalize_lead_data(raw_lead)

            # 2. Validate
            is_valid, validation_errors, is_eligible = validate_lead_record(normalized)
            if not is_valid:
                summary.invalid += 1
                if "phone" in str(validation_errors).lower():
                    summary.missing_required_fields += 1
                summary.errors.append({
                    "row": row_index,
                    "lead_data": raw_lead,
                    "errors": validation_errors,
                    "reason": "validation_failed"
                })
                continue

            if not is_eligible:
                summary.ineligible += 1
                summary.errors.append({
                    "row": row_index,
                    "phone": normalized.get("phone"),
                    "reason": "ineligible_or_opted_out"
                })
                continue

            # 3. Deduplicate
            phone = normalized["phone"]
            is_dup = await self.deduplicator.is_duplicate(phone=phone, email=normalized.get("email"))
            if is_dup:
                summary.duplicate += 1
                summary.errors.append({
                    "row": row_index,
                    "phone": phone,
                    "reason": "duplicate_lead"
                })
                continue

            # 4. Valid lead passed all filters
            summary.valid += 1

            # 5. Determine initial status and score based on enrichment
            initial_score = 10
            if normalized.get("company_name"):
                initial_score += 10
            if normalized.get("product_interest"):
                initial_score += 15
            if normalized.get("estimated_quantity"):
                initial_score += 15

            # 6. Create Lead entity
            new_lead = Lead(
                org_id=self.org_id,
                phone=phone,
                country_code=normalized.get("country_code", "+91"),
                name=normalized.get("name"),
                first_name=normalized.get("first_name"),
                last_name=normalized.get("last_name"),
                email=normalized.get("email"),
                city=normalized.get("city"),
                state=normalized.get("state"),
                country=normalized.get("country", "India"),
                postal_code=normalized.get("postal_code"),
                company_name=normalized.get("company_name"),
                company_type=normalized.get("company_type"),
                job_title=normalized.get("job_title"),
                lead_source=normalized.get("lead_source", "csv"),
                lead_source_id=normalized.get("lead_source_id"),
                campaign_id=campaign_id or normalized.get("campaign_id"),
                campaign_name=campaign_name or normalized.get("campaign_name"),
                product_interest=normalized.get("product_interest"),
                category_interest=normalized.get("category_interest"),
                estimated_quantity=normalized.get("estimated_quantity"),
                estimated_budget=normalized.get("estimated_budget"),
                preferred_language=normalized.get("preferred_language", "English"),
                timezone=normalized.get("timezone", "Asia/Kolkata"),
                opt_in_status=normalized.get("opt_in_status", True),
                opt_in_source=normalized.get("opt_in_source", "csv_import"),
                status="new",
                score=initial_score,
                notes=normalized.get("notes"),
                extra_metadata=normalized.get("extra_metadata", {}),
            )
            self.session.add(new_lead)
            await self.session.flush()

            # 7. Emit LeadEvent
            event = LeadEvent(
                org_id=self.org_id,
                lead_id=new_lead.id,
                event_type="lead.imported",
                details={
                    "source": new_lead.lead_source,
                    "campaign_id": campaign_id,
                    "initial_score": initial_score
                }
            )
            self.session.add(event)

            # 8. Assign to CampaignLead if campaign specified
            if campaign_id:
                camp_lead = CampaignLead(
                    campaign_id=campaign_id,
                    lead_id=new_lead.id,
                    status="pending",
                    current_step=0
                )
                self.session.add(camp_lead)

            summary.imported += 1

        await self.session.commit()
        logger.info(
            f"Lead import pipeline complete: {summary.imported}/{summary.total_rows} imported, "
            f"{summary.duplicate} duplicates, {summary.invalid} invalid, {summary.ineligible} ineligible."
        )
        return summary
