"""
Pydantic schemas for Lead ingestion, updates, queries, and batch imports.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LeadBase(BaseModel):
    """Base fields representing prospective leads."""
    phone: str = Field(..., description="Lead contact phone number")
    country_code: str = Field(default="+91", description="Country code prefix")
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    postal_code: Optional[str] = None
    company_name: Optional[str] = None
    company_type: Optional[str] = None  # Café, Restaurant, Hotel, Retailer, Distributor
    job_title: Optional[str] = None
    lead_source: str = "csv"
    lead_source_id: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    product_interest: Optional[str] = None
    category_interest: Optional[str] = None
    estimated_quantity: Optional[str] = None
    estimated_budget: Optional[str] = None
    preferred_language: str = "English"
    timezone: str = "Asia/Kolkata"
    opt_in_status: bool = True
    opt_in_source: str = "import"
    opt_in_timestamp: Optional[datetime] = None
    notes: Optional[str] = None
    extra_metadata: Dict[str, Any] = Field(default_factory=dict)


class LeadCreate(LeadBase):
    """Payload for creating a single lead."""
    pass


class LeadUpdate(BaseModel):
    """Payload for updating lead details."""
    name: Optional[str] = None
    email: Optional[str] = None
    company_name: Optional[str] = None
    company_type: Optional[str] = None
    product_interest: Optional[str] = None
    estimated_quantity: Optional[str] = None
    estimated_budget: Optional[str] = None
    preferred_language: Optional[str] = None
    status: Optional[str] = None
    score: Optional[int] = None
    notes: Optional[str] = None
    opt_in_status: Optional[bool] = None


class LeadResponse(LeadBase):
    """Serialized lead representation returned by API."""
    id: str
    org_id: str
    status: str
    score: int
    customer_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeadImportSummary(BaseModel):
    """Summary of batch CSV or Apify lead ingestion pipeline."""
    total_rows: int = 0
    valid: int = 0
    invalid: int = 0
    duplicate: int = 0
    missing_required_fields: int = 0
    ineligible: int = 0
    imported: int = 0
    errors: List[Dict[str, Any]] = Field(default_factory=list)
