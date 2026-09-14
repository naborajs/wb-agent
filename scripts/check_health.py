"""
Autonomous System Health & Readiness Verification CLI.
Runs non-destructive health checks across database, AI routing, WhatsApp provider, and background queues.
"""

import asyncio
import os
import sys

# Ensure backend package is discoverable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.config import settings
from app.database.session import check_database_health, get_db_context
from app.whatsapp.service import WhatsAppService
from sqlalchemy import func, select
from app.database.models import Customer, Lead, Conversation, Job, AgentNotification, Campaign, WatchdogAlert


async def main():
    print("=" * 60)
    print(f"  {settings.PROJECT_NAME} - System Health Diagnostics")
    print(f"  Environment: {settings.APP_ENV} | Org: {settings.DEFAULT_ORG_ID}")
    print("=" * 60)

    # 1. Database Health
    print("\n[1/4] Probing Database Connectivity...")
    db_ok = await check_database_health()
    if db_ok:
        print("  -> Database connection: OK [HEALTHY]")
    else:
        print("  -> Database connection: FAILED [UNHEALTHY]")

    # 2. Database Record Counts
    print("\n[2/4] Inspecting Database Record Metrics...")
    try:
        async with get_db_context() as session:
            lead_count = (await session.execute(select(func.count(Lead.id)))).scalar_one()
            cust_count = (await session.execute(select(func.count(Customer.id)))).scalar_one()
            conv_count = (await session.execute(select(func.count(Conversation.id)))).scalar_one()
            campaign_count = (await session.execute(select(func.count(Campaign.id)))).scalar_one()
            pending_jobs = (
                await session.execute(
                    select(func.count(Job.id)).where(Job.status == "pending")
                )
            ).scalar_one()
            unread_notifs = (
                await session.execute(
                    select(func.count(AgentNotification.id)).where(
                        AgentNotification.is_read == False
                    )
                )
            ).scalar_one()
            active_alerts = (
                await session.execute(
                    select(func.count(WatchdogAlert.id)).where(
                        WatchdogAlert.is_resolved == False
                    )
                )
            ).scalar_one()

            print(f"  -> Total Leads: {lead_count}")
            print(f"  -> Total Customers: {cust_count}")
            print(f"  -> Active Conversations: {conv_count}")
            print(f"  -> Total Campaigns: {campaign_count}")
            print(f"  -> Pending Background Jobs: {pending_jobs}")
            print(f"  -> Unread Agent Notifications: {unread_notifs}")
            print(f"  -> Active Watchdog Alerts: {active_alerts}")
    except Exception as e:
        print(f"  -> Database metrics query notice: {e}")

    # 3. AI & LLM Provider Configuration
    print("\n[3/4] Checking AI / LLM Configuration...")
    print(f"  -> LLM Provider: {settings.LLM_PROVIDER}")
    print(f"  -> NVIDIA Model: {settings.NVIDIA_MODEL}")
    print(f"  -> Gemini Model: {settings.GEMINI_MODEL}")
    print(f"  -> Autonomous Mode Enabled: {settings.GLOBAL_AUTONOMOUS_ENABLED}")

    # 4. WhatsApp Channel Health
    print("\n[4/4] Probing WhatsApp Channel...")
    try:
        wa_provider = WhatsAppService.get_provider()
        wa_ok = await wa_provider.health_check()
        status_label = "OK [HEALTHY]" if wa_ok else "DEGRADED [SIMULATOR/INACTIVE]"
        print(f"  -> Provider: {settings.WHATSAPP_PROVIDER} -> {status_label}")
    except Exception as e:
        print(f"  -> WhatsApp probe notice: {e}")

    print("\n" + "=" * 60)
    print("  Health Check Completed Successfully.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
