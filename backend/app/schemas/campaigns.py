"""
Pydantic schemas for Campaign CRUD, launch, stats, and chat-driven creation.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SchedulingWindow(BaseModel):
    """Business-hours scheduling constraint for campaign dispatch."""
    start_hour: int = Field(9, ge=0, le=23, description="Start hour (24h format)")
    end_hour: int = Field(18, ge=0, le=23, description="End hour (24h format)")
    days_of_week: List[int] = Field(
        default_factory=lambda: [0, 1, 2, 3, 4],
        description="ISO weekday numbers: 0=Mon, 6=Sun",
    )


class StopConditions(BaseModel):
    """Auto-pause triggers for a campaign."""
    max_replies: Optional[int] = Field(None, ge=1, description="Pause after N replies")
    min_response_rate: Optional[float] = Field(
        None, ge=0, le=100, description="Pause if response rate drops below X%"
    )


class RetryConfig(BaseModel):
    """Retry/fallback behavior for undelivered messages."""
    max_attempts: int = Field(3, ge=1, le=10, description="Max delivery attempts per lead")
    delay_hours: int = Field(24, ge=1, le=168, description="Hours between retry attempts")


class LeadFilter(BaseModel):
    """Structured lead filter for campaign targeting."""
    company_types: Optional[List[str]] = Field(None, description="Filter by company_type values")
    cities: Optional[List[str]] = Field(None, description="Filter by city values")
    statuses: Optional[List[str]] = Field(None, description="Filter by lead status")
    min_score: Optional[int] = Field(None, ge=0, le=100, description="Minimum lead score")
    product_interests: Optional[List[str]] = Field(None, description="Filter by product interest")
    lead_ids: Optional[List[str]] = Field(None, description="Explicit list of lead IDs to target")


class CampaignCreate(BaseModel):
    """Payload for creating a new outreach campaign."""
    name: str = Field(..., min_length=2, max_length=255, description="Campaign display name")
    description: Optional[str] = Field(None, description="Campaign description or notes")
    target_segment: str = Field("all", description="Segment label (e.g. 'B2B Commercial Accounts')")
    lead_filter: Optional[LeadFilter] = Field(None, description="Structured lead filter criteria")
    initial_message_template: str = Field(
        ..., min_length=5, description="WhatsApp message template"
    )
    daily_limit: int = Field(50, ge=1, le=500, description="Max messages per day")
    scheduling_window: Optional[SchedulingWindow] = Field(None, description="Business-hours constraint")
    jitter_min_seconds: int = Field(25, ge=15, le=90, description="Minimum inter-message delay")
    jitter_max_seconds: int = Field(45, ge=15, le=90, description="Maximum inter-message delay")
    stop_conditions: Optional[StopConditions] = Field(None, description="Auto-pause triggers")
    retry_config: Optional[RetryConfig] = Field(None, description="Retry/fallback settings")
    opt_out_handling: str = Field(
        "stop", description="How to handle opted-out leads: stop | skip | flag"
    )
    personalization_enabled: bool = Field(
        False, description="Let EDITH personalize messages per recipient"
    )


class CampaignUpdate(BaseModel):
    """Partial update payload for campaign settings."""
    name: Optional[str] = None
    description: Optional[str] = None
    target_segment: Optional[str] = None
    lead_filter: Optional[LeadFilter] = None
    initial_message_template: Optional[str] = None
    daily_limit: Optional[int] = Field(None, ge=1, le=500)
    scheduling_window: Optional[SchedulingWindow] = None
    jitter_min_seconds: Optional[int] = Field(None, ge=15, le=90)
    jitter_max_seconds: Optional[int] = Field(None, ge=15, le=90)
    stop_conditions: Optional[StopConditions] = None
    retry_config: Optional[RetryConfig] = None
    opt_out_handling: Optional[str] = None
    personalization_enabled: Optional[bool] = None


class CampaignLeadDetail(BaseModel):
    """Per-lead dispatch detail within a campaign."""
    id: str
    lead_id: str
    lead_name: Optional[str] = None
    lead_phone: Optional[str] = None
    lead_company: Optional[str] = None
    status: str
    delivery_status: str = "pending"
    personalized_message: Optional[str] = None
    sent_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    current_step: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CampaignStats(BaseModel):
    """Computed campaign statistics from real data."""
    total_leads: int = 0
    sent_count: int = 0
    delivered_count: int = 0
    replied_count: int = 0
    failed_count: int = 0
    opted_out_count: int = 0
    response_rate: float = 0.0
    delivery_rate: float = 0.0


class CampaignResponse(BaseModel):
    """Full campaign representation returned by API."""
    id: str
    name: str
    description: Optional[str] = None
    target_segment: str
    lead_filter: Optional[Dict[str, Any]] = None
    initial_message_template: str
    daily_limit: int
    status: str
    scheduling_window: Optional[Dict[str, Any]] = None
    jitter_min_seconds: int = 25
    jitter_max_seconds: int = 45
    stop_conditions: Optional[Dict[str, Any]] = None
    retry_config: Optional[Dict[str, Any]] = None
    opt_out_handling: str = "stop"
    personalization_enabled: bool = False
    actor: Optional[str] = None
    stats: CampaignStats = Field(default_factory=CampaignStats)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SegmentInfo(BaseModel):
    """Segment with live lead count from the leads table."""
    segment_value: str
    lead_count: int
    field: str = "company_type"


class CampaignDraftRequest(BaseModel):
    """Operator message for chat-driven campaign creation via Friday."""
    message: str = Field(
        ..., min_length=3, description="Natural language campaign description"
    )
    history: Optional[List[Dict[str, str]]] = Field(
        default_factory=list, description="Previous chat turns"
    )


class CampaignDraft(BaseModel):
    """Structured campaign spec drafted by Friday from natural language."""
    name: str
    target_segment: str
    lead_filter: Optional[LeadFilter] = None
    daily_limit: int = 50
    initial_message_template: str
    personalization_instructions: Optional[str] = None
    scheduling_window: Optional[SchedulingWindow] = None
    jitter_min_seconds: int = 25
    jitter_max_seconds: int = 45
    stop_conditions: Optional[StopConditions] = None
    opt_out_handling: str = "stop"
    personalization_enabled: bool = False


class CampaignDraftResponse(BaseModel):
    """Response from the chat-driven campaign drafting flow."""
    draft: CampaignDraft
    friday_explanation: str
    edith_verdict: str  # ACCEPTED, DENIED, CLARIFICATION_NEEDED
    edith_reasoning: str
    matched_lead_count: int
    draft_id: str
    ready_to_launch: bool
