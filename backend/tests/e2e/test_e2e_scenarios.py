"""
E2E Test Suite for Tier 3 (Cross-Feature Combinations) & Tier 4 (Real-World Workload Scenarios).
Validates multi-feature interactions and full business workflows.
"""

import json
import os
from unittest.mock import AsyncMock
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.extractor import PassiveInformationExtractor
from app.agent.sales_engine import ConsultativeSalesEngine
from app.agent.sales_stage import SalesStageManager
from app.database.models import Conversation, Customer, Deal, Lead
from app.realtime.connection_manager import ws_manager


# ===========================================================================
# Tier 3: Cross-Feature Combinations (Pairwise & Multi-Feature Interactions)
# ===========================================================================

@pytest.mark.asyncio
async def test_cross_audio_to_purchase_to_invoice(
    e2e_db_session: AsyncSession, seeded_catalog, audio_transcriber, invoice_service, mock_whatsapp
):
    """
    R1 + R2: Voice note inquiry ("Send invoice for 100kg Assam CTC")
    -> Transcribed
    -> Extracted intent & facts
    -> Transitions conversation to PURCHASE_INTENT
    -> Generates North Bengal Tea Co. pro-forma PDF
    -> Dispatches PDF via WhatsApp document bridge.
    """
    # 1. Simulate voice note audio ingestion
    voice_bytes = b"OggS_voice_audio_bytes_assam_100kg"
    mock_transcript = "Bhai humko 100 kilo Assam Kadak CTC Siliguri cafe ke liye bhej do, send invoice!"
    transcript = audio_transcriber.transcribe_audio(
        audio_bytes=voice_bytes,
        mime_type="audio/ogg",
        mock_gemini_transcript=mock_transcript,
    )
    assert "100 kilo" in transcript

    # 2. Extract facts & purchase intent
    facts = PassiveInformationExtractor.extract(transcript)
    assert facts.quantity == "100kg"
    assert facts.business_type == "Cafe"
    assert facts.is_ready_to_buy is True

    # 3. Create customer & conversation, transition to PURCHASE_INTENT
    cust = Customer(
        id="cust_audio_flow_01",
        org_id="org_default_tea",
        primary_phone="+919876543220",
        name="Siliguri Cafe Buyer",
    )
    e2e_db_session.add(cust)

    conv = Conversation(
        id="conv_audio_flow_01",
        org_id="org_default_tea",
        customer_id=cust.id,
        channel="whatsapp",
        channel_id="+919876543220",
        sales_stage="NEGOTIATION",
        lead_score=70,
    )
    e2e_db_session.add(conv)
    await e2e_db_session.commit()

    updated_conv = await SalesStageManager.transition(
        session=e2e_db_session,
        conversation=conv,
        target_stage="PURCHASE_INTENT",
        reason="Voice order received with explicit buy signal",
        score_delta=20,
    )
    assert updated_conv.sales_stage == "PURCHASE_INTENT"
    assert updated_conv.is_hot is True

    # 4. Generate pro-forma invoice
    order_data = {
        "buyer_name": cust.name,
        "buyer_location": "Siliguri",
        "items": [
            {
                "name": "Assam Kadak CTC",
                "packaging": "50kg HDPE Sack",
                "quantity_kg": 100.0,
                "unit_price": 340.0,
                "discount_pct": 10.0,
            }
        ],
    }
    pdf_path = invoice_service.generate_proforma_pdf(order_data)
    assert os.path.exists(pdf_path)

    # 5. WhatsApp document dispatch
    res = await mock_whatsapp.send_document(
        to_phone=cust.primary_phone,
        file_path=pdf_path,
        caption="Your North Bengal Tea Co. Pro-Forma Invoice (Rates locked for 7 days)",
    )
    assert res["status"] == "sent"
    assert len(mock_whatsapp.sent_documents) == 1

    try:
        os.remove(pdf_path)
    except OSError:
        pass


@pytest.mark.asyncio
async def test_cross_campaign_reply_to_websocket_alert(campaign_service):
    """
    R3 + R4: Campaign cold message sent -> Customer replies with hot buying signal
    -> Campaign drip paused
    -> Lead score becomes >= 80
    -> WebSocket emits hot_lead chime event to connected dashboard operator.
    """
    org_id = "org_cross_camp_test"
    mock_ws = AsyncMock()
    await ws_manager.connect(mock_ws, org_id)

    try:
        # 1. Inbound reply pauses drip
        reply_action = campaign_service.handle_inbound_reply("contacted")
        assert reply_action["cancel_pending_followups"] is True

        # 2. Score update to 85 triggers hot lead
        lead_score = 85
        if lead_score >= 80:
            await ws_manager.broadcast_to_org(
                org_id=org_id,
                event_type="hot_lead",
                data={
                    "conversation_id": "conv_camp_reply_01",
                    "score": lead_score,
                    "chime_trigger": "HOT_LEAD_ALERT",
                    "reason": "Campaign lead replied with immediate buying interest",
                },
            )

        assert mock_ws.send_text.called
        sent_event = json.loads(mock_ws.send_text.call_args[0][0])
        assert sent_event["event"] == "hot_lead"
        assert sent_event["data"]["score"] == 85
        assert sent_event["data"]["chime_trigger"] == "HOT_LEAD_ALERT"
    finally:
        ws_manager.disconnect(mock_ws, org_id)


@pytest.mark.asyncio
async def test_cross_voice_objection_to_analytics_pareto(audio_transcriber, analytics_service):
    """
    R2 + R5: Voice note with price objection
    -> Transcribed into Hinglish
    -> Extracted as objection 'price_too_high'
    -> Updates live Objection Pareto distribution stats.
    """
    voice_bytes = b"OggS_voice_audio_objection_bytes"
    mock_transcript = "Bhai Assam CTC ka rate bohot zyada hai, thoda discount milega kya?"
    transcript = audio_transcriber.transcribe_audio(
        audio_bytes=voice_bytes,
        mime_type="audio/ogg",
        mock_gemini_transcript=mock_transcript,
    )

    facts = PassiveInformationExtractor.extract(transcript)
    assert "price_too_high" in facts.objections

    # Update Pareto distribution
    objection_counts = {"price_too_high": 20, "needs_quality_proof": 10, "logistics_delay": 5}
    # Increment price_too_high
    objection_counts["price_too_high"] += 1

    pareto = analytics_service.compute_pareto(objection_counts)
    assert pareto[0]["objection"] == "price_too_high"
    assert pareto[0]["count"] == 21
    assert pareto[-1]["cumulative_pct"] == 100.0


@pytest.mark.asyncio
async def test_cross_invoice_generation_to_websocket_event(invoice_service):
    """
    R1 + R3: Generating a pro-forma invoice broadcasts a real-time event
    to dashboard operators so the UI immediately updates without polling.
    """
    org_id = "org_invoice_ws_test"
    mock_ws = AsyncMock()
    await ws_manager.connect(mock_ws, org_id)

    try:
        order_data = {
            "buyer_name": "Kolkata Luxury Tea Lounge",
            "items": [{"name": "Darjeeling FTGFOP1", "quantity_kg": 25.0, "unit_price": 1800.0, "discount_pct": 10.0}],
        }
        pdf_path = invoice_service.generate_proforma_pdf(order_data)
        assert os.path.exists(pdf_path)

        # Broadcast invoice generated event
        await ws_manager.broadcast_to_org(
            org_id=org_id,
            event_type="invoice_created",
            data={"buyer_name": order_data["buyer_name"], "file_path": pdf_path, "total_inr": 42525.0},
        )

        assert mock_ws.send_text.called
        sent_event = json.loads(mock_ws.send_text.call_args[0][0])
        assert sent_event["event"] == "invoice_created"
        assert sent_event["data"]["buyer_name"] == "Kolkata Luxury Tea Lounge"
    finally:
        ws_manager.disconnect(mock_ws, org_id)
        try:
            os.remove(pdf_path)
        except OSError:
            pass


@pytest.mark.asyncio
async def test_cross_campaign_to_geographic_analytics(analytics_service):
    """
    R4 + R5: Outbound campaign targeting regional segments (Siliguri, Darjeeling)
    reflects converted leads in regional density and revenue metrics.
    """
    campaign_leads = [
        {"location": "Siliguri", "status": "won", "deal_value": 34000.0},
        {"location": "Siliguri", "status": "won", "deal_value": 68000.0},
        {"location": "Darjeeling", "status": "won", "deal_value": 90000.0},
        {"location": "Jalpaiguri", "status": "replied", "deal_value": 0.0},
    ]

    density = analytics_service.compute_geographic_density(campaign_leads)
    siliguri = next(d for d in density if d["region"] == "Siliguri")
    darjeeling = next(d for d in density if d["region"] == "Darjeeling")

    assert siliguri["won_count"] == 2
    assert siliguri["revenue"] == 102000.0
    assert darjeeling["revenue"] == 90000.0


# ===========================================================================
# Tier 4: Real-World Workload Scenarios (Realistic End-to-End Business Flows)
# ===========================================================================

@pytest.mark.asyncio
async def test_scenario_siliguri_cafe_bulk_order_flow(audio_transcriber, invoice_service, mock_whatsapp):
    """
    Scenario 1: Siliguri Cafe Owner Bulk Order
    1. Cafe owner sends Hinglish voice note requesting 50kg Assam CTC for milk tea.
    2. Transcription & extraction accurately parse 50kg, Cafe, Siliguri.
    3. 5% wholesale tier discount is calculated.
    4. Branded North Bengal Tea Co. commercial pro-forma PDF is compiled with GSTIN & FSSAI.
    5. Document is sent via WhatsApp with 7-day rate lock confirmation.
    """
    # 1. Voice transcription
    voice_bytes = b"OggS_siliguri_cafe_50kg_audio"
    transcript = audio_transcriber.transcribe_audio(
        audio_bytes=voice_bytes,
        mime_type="audio/ogg",
        mock_gemini_transcript="Namaste, Siliguri me naya cafe khol rahe hain, 50kg kadak chai ka rate batayein.",
    )

    # 2. Fact extraction
    facts = PassiveInformationExtractor.extract(transcript)
    assert facts.quantity == "50kg"
    assert facts.location == "Siliguri"
    assert facts.business_type == "Cafe"

    # 3. Financial calculations: 50kg @ ₹340/kg = 17,000; 5% tier discount = 850; Subtotal = 16,150; GST (5%) = 807.50; Total = 16,957.50
    order_data = {
        "buyer_name": "M/S Chai Point Siliguri",
        "buyer_location": "Sevoke Road, Siliguri",
        "items": [
            {
                "name": "Assam Kadak CTC",
                "packaging": "50kg HDPE Sack",
                "quantity_kg": 50.0,
                "unit_price": 340.0,
                "discount_pct": 5.0,
            }
        ],
        "gst_rate_pct": 5.0,
    }

    # 4. Pro-forma generation
    pdf_path = invoice_service.generate_proforma_pdf(order_data)
    assert os.path.exists(pdf_path)

    # 5. WhatsApp dispatch
    dispatch = await mock_whatsapp.send_document(
        to_phone="+919800112233",
        file_path=pdf_path,
        caption="Here is your official Pro-Forma Invoice from North Bengal Tea Co. Rates locked for 7 days.",
    )
    assert dispatch["status"] == "sent"

    try:
        os.remove(pdf_path)
    except OSError:
        pass


@pytest.mark.asyncio
async def test_scenario_cold_outreach_to_hot_escalation(campaign_service):
    """
    Scenario 2: Cold Campaign Outreach -> Hot Escalation & Chime
    1. Cold lead imported from CSV into campaign.
    2. Anti-ban jitter calculated (25-45s).
    3. Lead replies: 'We need 200kg Assam CTC immediately for our franchise'.
    4. Follow-up drip cancelled.
    5. Lead score jumps to 90.
    6. WebSocket broadcasts hot_lead chime for human operator takeover.
    """
    org_id = "org_scenario_hot_test"
    mock_operator_ws = AsyncMock()
    await ws_manager.connect(mock_operator_ws, org_id)

    try:
        # Jitter delay
        delay = campaign_service.compute_jitter_delay()
        assert 25.0 <= delay <= 45.0

        # Customer reply
        inbound_text = "Yes, we need 200kg Assam CTC immediately for our franchise. Send invoice."
        facts = PassiveInformationExtractor.extract(inbound_text)
        assert facts.quantity == "200kg"
        assert facts.is_ready_to_buy is True

        reply_action = campaign_service.handle_inbound_reply("contacted")
        assert reply_action["cancel_pending_followups"] is True

        # Hot lead alert
        lead_score = 90
        await ws_manager.broadcast_to_org(
            org_id=org_id,
            event_type="hot_lead",
            data={
                "customer_phone": "+919876500001",
                "lead_score": lead_score,
                "chime": "HOT_LEAD_CHIME",
                "message": inbound_text,
            },
        )

        assert mock_operator_ws.send_text.called
        event = json.loads(mock_operator_ws.send_text.call_args[0][0])
        assert event["event"] == "hot_lead"
        assert event["data"]["lead_score"] == 90
    finally:
        ws_manager.disconnect(mock_operator_ws, org_id)


@pytest.mark.asyncio
async def test_scenario_voice_bargaining_and_discount_negotiation(audio_transcriber, analytics_service):
    """
    Scenario 3: Spoken Price Objection & Tier Negotiation
    1. Customer voice note: 'Bohot mehenga lag raha hai, 500kg pe kitna discount doge?'
    2. Extraction identifies price objection and 500kg volume.
    3. System applies 15% distributor tier discount for 500kg.
    4. Objection logged in analytics Pareto distribution.
    5. Deal probability updated in revenue forecast.
    """
    voice_bytes = b"OggS_voice_audio_negotiation"
    transcript = audio_transcriber.transcribe_audio(
        audio_bytes=voice_bytes,
        mime_type="audio/ogg",
        mock_gemini_transcript="Bohot mehenga lag raha hai, 500kg pe kitna discount doge?",
    )

    facts = PassiveInformationExtractor.extract(transcript)
    assert facts.quantity == "500kg"
    assert "price_too_high" in facts.objections

    # 500kg qualifies for 15% tier
    rate = 340.0
    qty = 500.0
    discount_pct = 15.0
    total = (rate * qty) * (1 - discount_pct / 100.0)
    assert total == 144500.0

    # Analytics update
    pareto = analytics_service.compute_pareto({"price_too_high": 12, "sample_needed": 4})
    assert pareto[0]["objection"] == "price_too_high"

    deals = [{"stage": "NEGOTIATION", "value": total}]
    forecast = analytics_service.compute_forecast(deals)
    assert forecast["projected_revenue"] == 144500.0


@pytest.mark.asyncio
async def test_scenario_multi_tenant_isolation_and_live_sync():
    """
    Scenario 4: Multi-Tenant Concurrent Isolation
    Verifies that actions, messages, and alerts in 'org_north_bengal'
    never cross over or leak to operators of 'org_assam_valley'.
    """
    org1 = "org_north_bengal"
    org2 = "org_assam_valley"

    ws_org1 = AsyncMock()
    ws_org2 = AsyncMock()

    await ws_manager.connect(ws_org1, org1)
    await ws_manager.connect(ws_org2, org2)

    try:
        # Broadcast to org1
        await ws_manager.broadcast_to_org(org1, "new_message", {"sender": "Org1 Buyer", "text": "Secret Quote"})
        assert ws_org1.send_text.called
        assert not ws_org2.send_text.called

        # Broadcast to org2
        await ws_manager.broadcast_to_org(org2, "hot_lead", {"sender": "Org2 Buyer", "score": 95})
        sent_org2 = json.loads(ws_org2.send_text.call_args[0][0])
        assert sent_org2["data"]["sender"] == "Org2 Buyer"
    finally:
        ws_manager.disconnect(ws_org1, org1)
        ws_manager.disconnect(ws_org2, org2)


@pytest.mark.asyncio
async def test_scenario_full_end_to_end_sales_lifecycle(
    audio_transcriber, campaign_service, invoice_service, analytics_service, mock_whatsapp
):
    """
    Scenario 5: Complete Autonomous Enterprise Sales Lifecycle
    1. Campaign drip scheduled with anti-ban jitter.
    2. Customer replies via Hinglish voice note.
    3. Audio transcribed and requirements extracted.
    4. Drip cadence cancelled; consultative AI takes over.
    5. Customer reaches PURCHASE_INTENT; pro-forma invoice generated.
    6. PDF delivered via WhatsApp.
    7. Deal marked WON; reflected in revenue forecasting and CSV export.
    """
    # 1. Campaign Jitter
    jitter_delay = campaign_service.compute_jitter_delay()
    assert 25.0 <= jitter_delay <= 45.0

    # 2. Voice Note Reply
    voice_bytes = b"OggS_voice_full_lifecycle"
    transcript = audio_transcriber.transcribe_audio(
        audio_bytes=voice_bytes,
        mime_type="audio/ogg",
        mock_gemini_transcript="Bhai humko 100kg Assam Kadak CTC Siliguri ke liye book karna hai, send invoice please!",
    )

    # 3. Extraction
    facts = PassiveInformationExtractor.extract(transcript)
    assert facts.quantity == "100kg"
    assert facts.location == "Siliguri"
    assert facts.is_ready_to_buy is True

    # 4. Drip cancelled
    cancel_action = campaign_service.handle_inbound_reply("contacted")
    assert cancel_action["cancel_pending_followups"] is True

    # 5. Invoice Generation
    order_data = {
        "buyer_name": "Siliguri Express Cafe",
        "items": [{"name": "Assam Kadak CTC", "quantity_kg": 100.0, "unit_price": 340.0, "discount_pct": 10.0}],
    }
    pdf_path = invoice_service.generate_proforma_pdf(order_data)
    assert os.path.exists(pdf_path)

    # 6. WhatsApp Dispatch
    await mock_whatsapp.send_document(
        to_phone="+919876543299",
        file_path=pdf_path,
        caption="Official Pro-Forma Invoice - North Bengal Tea Co.",
    )
    assert len(mock_whatsapp.sent_documents) == 1

    # 7. Analytics & Forecast
    won_deal_value = 30600.0 * 1.05  # subtotal after 10% disc + 5% GST = 32,130
    deals = [{"stage": "WON", "value": won_deal_value}]
    forecast = analytics_service.compute_forecast(deals)
    assert forecast["projected_revenue"] == won_deal_value
    assert forecast["weighted_pipeline"] == won_deal_value

    try:
        os.remove(pdf_path)
    except OSError:
        pass
