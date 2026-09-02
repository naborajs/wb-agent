"""
Unit tests for WhatsApp Provider abstraction, Simulator, and Meta Cloud webhook verification.
"""

import hashlib
import hmac
import pytest
from app.whatsapp.providers.meta_cloud import MetaCloudWhatsAppProvider
from app.whatsapp.providers.simulator import SimulatorWhatsAppProvider


@pytest.mark.asyncio
async def test_simulator_whatsapp_provider():
    sim = SimulatorWhatsAppProvider(verify_token="test_token_123")

    # 1. Health check
    assert await sim.health_check() is True

    # 2. Webhook verification
    challenge = sim.verify_webhook(mode="subscribe", token="test_token_123", challenge="challenge_abc")
    assert challenge == "challenge_abc"

    # Invalid token rejected
    bad_challenge = sim.verify_webhook(mode="subscribe", token="wrong_token", challenge="challenge_abc")
    assert bad_challenge is None

    # 3. Send text message
    res = await sim.send_message(to_phone="+918900653250", text="Hello from North Bengal Tea Co.")
    assert res.success is True
    assert res.provider_message_id is not None
    assert len(sim.outbox) == 1
    assert sim.outbox[0]["to"] == "+918900653250"

    # 4. Mark read
    assert await sim.mark_read(res.provider_message_id) is True

    # 5. Failure simulation
    sim.fail_next_send = True
    fail_res = await sim.send_message(to_phone="+918900653250", text="Failing message")
    assert fail_res.success is False
    assert "Simulated" in fail_res.error_message


def test_meta_cloud_webhook_hmac_and_parsing():
    app_secret = "meta_test_secret_key"
    meta = MetaCloudWhatsAppProvider(
        phone_number_id="123456789",
        access_token="mock_token",
        verify_token="test_verify_token",
        app_secret=app_secret,
    )

    # 1. Test HMAC signature verification
    raw_payload = b'{"object": "whatsapp_business_account"}'
    valid_sig = "sha256=" + hmac.new(app_secret.encode("utf-8"), raw_payload, hashlib.sha256).hexdigest()
    assert meta.verify_signature(raw_payload, valid_sig) is True

    bad_sig = "sha256=invalid_hash_value"
    assert meta.verify_signature(raw_payload, bad_sig) is False

    # 2. Test parsing incoming Meta webhook payload
    webhook_dict = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "messages": [
                                {
                                    "from": "918900653250",
                                    "id": "wamid.HBgLOT",
                                    "timestamp": "1725300000",
                                    "type": "text",
                                    "text": {"body": "Hi, what is the price for bulk Darjeeling tea?"},
                                }
                            ],
                            "statuses": [
                                {
                                    "id": "wamid.OUT123",
                                    "recipient_id": "918900653250",
                                    "status": "delivered",
                                    "timestamp": "1725300001",
                                }
                            ],
                        }
                    }
                ]
            }
        ]
    }

    events = meta.parse_webhook(webhook_dict)
    assert len(events) == 2

    # Inbound message event
    msg_ev = events[0]
    assert msg_ev.event_type == "message"
    assert msg_ev.sender_phone == "+918900653250"
    assert msg_ev.content == "Hi, what is the price for bulk Darjeeling tea?"

    # Status update event
    status_ev = events[1]
    assert status_ev.event_type == "status_update"
    assert status_ev.status == "delivered"
