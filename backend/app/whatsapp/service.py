"""
WhatsApp Service: factory and router for active WhatsApp messaging provider (Section 38).
"""

from typing import Optional
from app.config import settings
from app.whatsapp.base import WhatsAppProvider
from app.whatsapp.providers.bridge import BridgeWhatsAppProvider
from app.whatsapp.providers.meta_cloud import MetaCloudWhatsAppProvider
from app.whatsapp.providers.simulator import SimulatorWhatsAppProvider


class WhatsAppService:
    """
    Unified entry point for WhatsApp messaging across all channels.
    Includes hardware-level test detection so unit/E2E tests can never leak messages to real phones.
    """

    _instance: Optional[WhatsAppProvider] = None

    @classmethod
    def get_provider(cls) -> WhatsAppProvider:
        import sys
        import os

        # ABSOLUTE SAFETY LOCK: When running under pytest, tests, or explicit dry-run, NEVER hit the live bridge or Meta Cloud!
        if (
            "pytest" in sys.modules
            or os.getenv("PYTEST_CURRENT_TEST")
            or getattr(settings, "DRY_RUN_MODE", False)
        ):
            return SimulatorWhatsAppProvider(verify_token=settings.WHATSAPP_VERIFY_TOKEN)

        # Check if existing instance matches the configured provider
        if cls._instance is not None:
            if settings.WHATSAPP_PROVIDER == "bridge" and not isinstance(cls._instance, BridgeWhatsAppProvider):
                cls._instance = None
            elif settings.WHATSAPP_PROVIDER == "simulator" and not isinstance(cls._instance, SimulatorWhatsAppProvider):
                cls._instance = None
            elif settings.WHATSAPP_PROVIDER == "meta_cloud" and not isinstance(cls._instance, MetaCloudWhatsAppProvider):
                cls._instance = None

        if cls._instance is None:
            if settings.WHATSAPP_PROVIDER == "meta_cloud":
                cls._instance = MetaCloudWhatsAppProvider(
                    phone_number_id=settings.WHATSAPP_PHONE_NUMBER_ID,
                    access_token=settings.WHATSAPP_ACCESS_TOKEN,
                    verify_token=settings.WHATSAPP_VERIFY_TOKEN,
                    api_version=settings.WHATSAPP_API_VERSION,
                    app_secret=settings.WHATSAPP_WEBHOOK_SECRET,
                )
            elif settings.WHATSAPP_PROVIDER == "bridge":
                bridge_url = getattr(settings, "WHATSAPP_BRIDGE_URL", "http://localhost:3001")
                cls._instance = BridgeWhatsAppProvider(bridge_url=bridge_url)
            else:
                cls._instance = SimulatorWhatsAppProvider(
                    verify_token=settings.WHATSAPP_VERIFY_TOKEN
                )
        return cls._instance

    @classmethod
    def reset(cls) -> None:
        cls._instance = None
