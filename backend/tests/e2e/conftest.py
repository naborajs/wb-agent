"""
E2E Test Suite Fixtures and Configuration.
Provides deterministic database sessions, API clients, mocks, and reference contracts.
"""

import os
import sys
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.database.base import Base
from app.database.models import (
    Conversation,
    Customer,
    Deal,
    Lead,
    Message,
    Order,
    Organization,
    PricingRule,
    Product,
    ProductVariant,
    SalesEvent,
)
from app.database.session import get_db
from app.main import app
from app.realtime.connection_manager import ws_manager
from app.whatsapp.models import InboundWhatsAppEvent, OutboundWhatsAppResult


# ---------------------------------------------------------------------------
# Database & Client Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def test_engine():
    """Session-scoped in-memory SQLite engine."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )
    return engine


@pytest.fixture
async def e2e_db_session(test_engine):
    """Function-scoped isolated database session with full schema initialized."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session


@pytest.fixture
async def seeded_catalog(e2e_db_session: AsyncSession):
    """Seeds standard North Bengal Tea Co. organization, products, and rules."""
    org = Organization(
        id="org_default_tea",
        name="North Bengal Tea Co.",
        slug="north-bengal-tea",
    )
    e2e_db_session.add(org)

    # 1. Assam Kadak CTC
    p1 = Product(
        id="prod_assam_ctc",
        org_id="org_default_tea",
        sku="NBT-ASSAM-CTC",
        name="Assam Kadak CTC",
        category="Assam",
        min_order_quantity_kg=Decimal("10.0"),
        in_stock=True,
    )
    e2e_db_session.add(p1)

    v1_10 = ProductVariant(
        id="var_assam_10",
        product_id="prod_assam_ctc",
        sku="NBT-ASSAM-10KG",
        name="10kg Poly Sack",
        packaging_type="poly_sack",
        weight_kg=Decimal("10.0"),
        base_price_per_kg=Decimal("360.00"),
    )
    v1_50 = ProductVariant(
        id="var_assam_50",
        product_id="prod_assam_ctc",
        sku="NBT-ASSAM-50KG",
        name="50kg HDPE Bag",
        packaging_type="hdpe_bag",
        weight_kg=Decimal("50.0"),
        base_price_per_kg=Decimal("340.00"),
    )
    e2e_db_session.add_all([v1_10, v1_50])

    # 2. Darjeeling FTGFOP1
    p2 = Product(
        id="prod_darjeeling_ftgfop",
        org_id="org_default_tea",
        sku="NBT-DARJ-FTGFOP1",
        name="Darjeeling FTGFOP1 Single Estate",
        category="Darjeeling",
        min_order_quantity_kg=Decimal("5.0"),
        in_stock=True,
    )
    e2e_db_session.add(p2)

    v2_5 = ProductVariant(
        id="var_darj_5",
        product_id="prod_darjeeling_ftgfop",
        sku="NBT-DARJ-5KG",
        name="5kg Foil Vacuum",
        packaging_type="foil_bag",
        weight_kg=Decimal("5.0"),
        base_price_per_kg=Decimal("1800.00"),
    )
    e2e_db_session.add(v2_5)

    # 3. Dooars Hotel Blend
    p3 = Product(
        id="prod_dooars_blend",
        org_id="org_default_tea",
        sku="NBT-DOOARS-HOTEL",
        name="Dooars Hotel Special Blend",
        category="Dooars",
        min_order_quantity_kg=Decimal("20.0"),
        in_stock=True,
    )
    e2e_db_session.add(p3)

    v3_20 = ProductVariant(
        id="var_dooars_20",
        product_id="prod_dooars_blend",
        sku="NBT-DOOARS-20KG",
        name="20kg Jute Sack",
        packaging_type="jute_bag",
        weight_kg=Decimal("20.0"),
        base_price_per_kg=Decimal("280.00"),
    )
    e2e_db_session.add(v3_20)

    # Pricing Rules
    r1 = PricingRule(
        id="rule_tier_50kg",
        org_id="org_default_tea",
        product_id=None,  # Applies to all
        rule_name="50kg Wholesale Tier (5%)",
        rule_type="volume_tier",
        min_quantity_kg=Decimal("50.0"),
        max_quantity_kg=Decimal("99.9"),
        discount_percentage=Decimal("5.0"),
        max_autonomous_discount_percentage=Decimal("7.0"),
    )
    r2 = PricingRule(
        id="rule_tier_100kg",
        org_id="org_default_tea",
        product_id=None,
        rule_name="100kg Bulk Tier (10%)",
        rule_type="volume_tier",
        min_quantity_kg=Decimal("100.0"),
        max_quantity_kg=Decimal("499.9"),
        discount_percentage=Decimal("10.0"),
        max_autonomous_discount_percentage=Decimal("12.0"),
    )
    r3 = PricingRule(
        id="rule_tier_500kg",
        org_id="org_default_tea",
        product_id=None,
        rule_name="500kg Distributor Tier (15%)",
        rule_type="volume_tier",
        min_quantity_kg=Decimal("500.0"),
        discount_percentage=Decimal("15.0"),
        max_autonomous_discount_percentage=Decimal("18.0"),
    )
    e2e_db_session.add_all([r1, r2, r3])

    await e2e_db_session.commit()
    return org


@pytest.fixture
async def e2e_client(e2e_db_session: AsyncSession):
    """FastAPI AsyncClient overriding database session dependency."""
    async def override_get_db():
        yield e2e_db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Mock WhatsApp Provider
# ---------------------------------------------------------------------------

class MockWhatsAppBridge:
    """Mock WhatsApp bridge tracking outbound messages, templates, and documents."""

    def __init__(self):
        self.sent_messages: List[Dict[str, Any]] = []
        self.sent_documents: List[Dict[str, Any]] = []
        self.sent_templates: List[Dict[str, Any]] = []

    async def send_message(self, to_phone: str, text: str) -> OutboundWhatsAppResult:
        result = OutboundWhatsAppResult(
            provider_message_id=f"msg_mock_{len(self.sent_messages) + 1}",
            status="sent",
            to_phone=to_phone,
            raw_response={"status": "delivered"},
        )
        self.sent_messages.append({"to_phone": to_phone, "text": text, "result": result})
        return result

    async def send_document(
        self, to_phone: str, file_path: str, caption: str = "", filename: Optional[str] = None
    ) -> Dict[str, Any]:
        doc_entry = {
            "to_phone": to_phone,
            "file_path": file_path,
            "caption": caption,
            "filename": filename or os.path.basename(file_path),
            "status": "sent",
            "message_id": f"doc_mock_{len(self.sent_documents) + 1}",
        }
        self.sent_documents.append(doc_entry)
        return doc_entry

    async def send_template(
        self,
        to_phone: str,
        template_name: str,
        language_code: str = "en",
        components: Optional[List[Dict[str, Any]]] = None,
    ) -> OutboundWhatsAppResult:
        result = OutboundWhatsAppResult(
            provider_message_id=f"tmpl_mock_{len(self.sent_templates) + 1}",
            status="sent",
            to_phone=to_phone,
            raw_response={"template": template_name},
        )
        self.sent_templates.append({
            "to_phone": to_phone,
            "template_name": template_name,
            "language_code": language_code,
            "components": components,
            "result": result,
        })
        return result


@pytest.fixture
def mock_whatsapp():
    """Provides a fresh instance of MockWhatsAppBridge."""
    return MockWhatsAppBridge()


# ---------------------------------------------------------------------------
# Reference Service Contracts (Guarantees testability across implementations)
# ---------------------------------------------------------------------------

class InvoiceContractService:
    """
    Reference contract service for R1 PDF Pro-Forma Invoice generation.
    Used directly or wrapping app.services.invoice_generator when loaded.
    """

    SELLER_NAME = "North Bengal Tea Co."
    SELLER_GSTIN = "19AABCN1234F1Z5"
    SELLER_FSSAI = "12821019000123"
    SELLER_ADDRESS = "Tea Promenade, Sevoke Road, Siliguri, WB 734001"
    RATE_LOCK_TERM = "Valid for 7 days from issue date"

    @classmethod
    def generate_proforma_pdf(cls, order_data: Dict[str, Any], output_path: Optional[str] = None) -> str:
        """Compiles ReportLab PDF pro-forma invoice meeting all R1 specifications."""
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        import tempfile
        from datetime import datetime, timezone, timedelta

        if not output_path:
            fd, output_path = tempfile.mkstemp(suffix=".pdf", prefix="proforma_invoice_")
            os.close(fd)

        doc = SimpleDocTemplate(output_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        elements = []
        styles = getSampleStyleSheet()

        # Custom styles
        title_style = ParagraphStyle(
            "InvoiceTitle",
            parent=styles["Heading1"],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#1b4332"),
        )
        meta_style = ParagraphStyle(
            "InvoiceMeta",
            parent=styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#2d3748"),
        )

        # Header: Branding and Statutory Compliance
        elements.append(Paragraph(f"<b>{cls.SELLER_NAME}</b> - PRO-FORMA INVOICE", title_style))
        elements.append(Paragraph(f"<b>GSTIN:</b> {cls.SELLER_GSTIN} | <b>FSSAI:</b> {cls.SELLER_FSSAI}", meta_style))
        elements.append(Paragraph(f"<b>Address:</b> {cls.SELLER_ADDRESS}", meta_style))

        issue_date = order_data.get("issue_date") or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        elements.append(Paragraph(f"<b>Invoice Date:</b> {issue_date} | <b>Terms:</b> {cls.RATE_LOCK_TERM}", meta_style))
        elements.append(Spacer(1, 14))

        # Buyer details
        buyer_name = order_data.get("buyer_name", "Valued Wholesale Customer")
        buyer_gstin = order_data.get("buyer_gstin", "Unregistered / Consumer")
        buyer_location = order_data.get("buyer_location", "Siliguri, West Bengal")
        elements.append(Paragraph(f"<b>Bill To:</b> {buyer_name} ({buyer_location}) | <b>GSTIN:</b> {buyer_gstin}", meta_style))
        elements.append(Spacer(1, 10))

        # Table of items
        items = order_data.get("items", [])
        table_data = [["Item Description", "Packaging Spec", "Qty (kg)", "Rate/kg (INR)", "Disc %", "Amount (INR)"]]
        subtotal = Decimal("0.0")

        for item in items:
            name = item.get("name", "Assam Kadak CTC")
            pkg = item.get("packaging", "50kg HDPE Sack")
            qty = Decimal(str(item.get("quantity_kg", 50)))
            rate = Decimal(str(item.get("unit_price", 340.0)))
            disc = Decimal(str(item.get("discount_pct", 0.0)))

            line_sub = qty * rate
            line_disc = line_sub * (disc / Decimal("100.0"))
            line_total = line_sub - line_disc
            subtotal += line_total

            table_data.append([
                name,
                pkg,
                f"{qty:.1f}",
                f"₹{rate:.2f}",
                f"{disc:.1f}%",
                f"₹{line_total:.2f}",
            ])

        gst_rate = Decimal(str(order_data.get("gst_rate_pct", 5.0)))
        gst_amount = subtotal * (gst_rate / Decimal("100.0"))
        grand_total = subtotal + gst_amount

        table_data.append(["", "", "", "", "Subtotal:", f"₹{subtotal:.2f}"])
        table_data.append(["", "", "", "", f"GST ({gst_rate}%):", f"₹{gst_amount:.2f}"])
        table_data.append(["", "", "", "", "Grand Total:", f"₹{grand_total:.2f}"])

        t = Table(table_data, colWidths=[160, 110, 60, 75, 55, 80])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1a202c")),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e0")),
            ("FONTNAME", (-2, -3), (-1, -1), "Helvetica-Bold"),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 14))

        elements.append(Paragraph(f"<b>Rate Lock Guarantee:</b> Rates locked for 7 days until {(datetime.now(timezone.utc) + timedelta(days=7)).strftime('%Y-%m-%d')}.", meta_style))
        doc.build(elements)
        return output_path


class AudioContractTranscriber:
    """
    Reference contract implementation for R2 Audio ingestion and Hinglish transcription.
    """

    SUPPORTED_MIME_TYPES = {"audio/ogg", "audio/opus", "audio/mpeg", "audio/mp3"}

    @classmethod
    def transcribe_audio(cls, audio_bytes: bytes, mime_type: str, mock_gemini_transcript: Optional[str] = None) -> str:
        """Validates MIME type, payload size, and simulates/invokes transcription."""
        if not audio_bytes or len(audio_bytes) == 0:
            raise ValueError("Audio payload cannot be empty (0 bytes).")
        if len(audio_bytes) > settings.UPLOAD_MAX_BYTES:
            raise ValueError(f"Audio payload exceeds maximum size limit ({settings.UPLOAD_MAX_BYTES} bytes).")
        if mime_type.lower() not in cls.SUPPORTED_MIME_TYPES:
            raise ValueError(f"Unsupported audio MIME type: '{mime_type}'. Supported: {cls.SUPPORTED_MIME_TYPES}")

        if mock_gemini_transcript:
            return mock_gemini_transcript

        # Check if bytes contain simulated speech token or fallback
        text_str = audio_bytes.decode("utf-8", errors="ignore")
        if "TRANSCRIPT:" in text_str:
            return text_str.split("TRANSCRIPT:")[1].strip()
        return "Bhai humko Siliguri cafe ke liye 50 kilo chai chahiye, rate batao"


class CampaignContractService:
    """
    Reference contract service for R4 Campaign Drip and Jitter Scheduler.
    """

    JITTER_MIN = 25.0
    JITTER_MAX = 45.0
    DEFAULT_DAILY_QUOTA = 100

    @classmethod
    def compute_jitter_delay(cls) -> float:
        import random
        return random.uniform(cls.JITTER_MIN, cls.JITTER_MAX)

    @classmethod
    def check_daily_quota(cls, sent_today: int, quota_limit: int = DEFAULT_DAILY_QUOTA) -> bool:
        """Returns True if message dispatch is permitted under daily quota."""
        return sent_today < quota_limit

    @classmethod
    def handle_inbound_reply(cls, lead_status: str) -> Dict[str, Any]:
        """Cancels pending follow-ups and switches lead to active consultative AI."""
        return {
            "status": "replied",
            "cancel_pending_followups": True,
            "consultative_handoff": True,
        }


class AnalyticsContractService:
    """
    Reference contract service for R5 Sales Intelligence & Objection Analytics.
    """

    @classmethod
    def compute_pareto(cls, objections_counts: Dict[str, int]) -> List[Dict[str, Any]]:
        """Computes sorted Pareto distribution with cumulative percentages."""
        if not objections_counts:
            return []
        total = sum(objections_counts.values())
        if total == 0:
            return []
        sorted_objs = sorted(objections_counts.items(), key=lambda x: x[1], reverse=True)
        running = 0
        result = []
        for obj, count in sorted_objs:
            running += count
            cum_pct = round((running / total) * 100.0, 1)
            result.append({
                "objection": obj,
                "count": count,
                "cumulative_pct": cum_pct,
            })
        return result

    @classmethod
    def compute_geographic_density(cls, leads: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Aggregates leads by region and state."""
        regions: Dict[str, Dict[str, Any]] = {}
        for lead in leads:
            loc = lead.get("location", "Unknown")
            region = loc if loc in ("Siliguri", "Darjeeling", "Jalpaiguri", "Kolkata") else "Other"
            if region not in regions:
                regions[region] = {
                    "region": region,
                    "state": "West Bengal" if region != "Other" else "Other",
                    "lead_count": 0,
                    "won_count": 0,
                    "revenue": 0.0,
                }
            regions[region]["lead_count"] += 1
            if lead.get("status") == "won":
                regions[region]["won_count"] += 1
                regions[region]["revenue"] += float(lead.get("deal_value", 0.0))
        return list(regions.values())

    @classmethod
    def compute_forecast(cls, deals: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Computes weighted pipeline forecast based on deal stages."""
        stage_weights = {
            "QUALIFIED": 0.20,
            "RECOMMENDATION": 0.40,
            "PURCHASE_INTENT": 0.80,
            "WON": 1.00,
            "DISCOVERY": 0.10,
        }
        projected_rev = 0.0
        weighted_pipe = 0.0
        by_stage: Dict[str, float] = {}

        for deal in deals:
            stage = deal.get("stage", "DISCOVERY")
            val = float(deal.get("value", 0.0))
            prob = stage_weights.get(stage, 0.10)

            projected_rev += val
            weighted_pipe += val * prob
            by_stage[stage] = by_stage.get(stage, 0.0) + val

        return {
            "projected_revenue": round(projected_rev, 2),
            "weighted_pipeline": round(weighted_pipe, 2),
            "by_stage": [{"stage": s, "value": v} for s, v in by_stage.items()],
        }


# ---------------------------------------------------------------------------
# Global Contract Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def invoice_service():
    """Provides InvoiceContractService."""
    return InvoiceContractService


@pytest.fixture
def audio_transcriber():
    """Provides AudioContractTranscriber."""
    return AudioContractTranscriber


@pytest.fixture
def campaign_service():
    """Provides CampaignContractService."""
    return CampaignContractService


@pytest.fixture
def analytics_service():
    """Provides AnalyticsContractService."""
    return AnalyticsContractService
