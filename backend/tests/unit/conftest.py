"""
Global pytest configuration and fixtures for backend unit tests.
Ensures complete isolation from live external WhatsApp bridge and external services.
"""

import pytest
from app.config import settings
from app.whatsapp.providers.simulator import SimulatorWhatsAppProvider
from app.whatsapp.service import WhatsAppService


@pytest.fixture(autouse=True)
def isolate_whatsapp_provider(monkeypatch):
    """
    Guarantees that all unit tests use SimulatorWhatsAppProvider,
    never the live bridge or Meta Cloud API.
    """
    monkeypatch.setattr(settings, "WHATSAPP_PROVIDER", "simulator")
    sim = SimulatorWhatsAppProvider(verify_token=settings.WHATSAPP_VERIFY_TOKEN)
    monkeypatch.setattr(WhatsAppService, "get_provider", lambda: sim)
    yield
