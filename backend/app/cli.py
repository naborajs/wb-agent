"""
Unified CLI Tooling for WB-Agent (EDITH) (Section 91).
Commands:
- python -m app.cli doctor     : Comprehensive system diagnostic and connectivity check
- python -m app.cli status     : Live system status, database metrics, and queue indicators
- python -m app.cli simulate   : Run an interactive or canned consultative persona simulation
- python -m app.cli backup     : Create a point-in-time snapshot backup of the local database
"""

import argparse
import asyncio
import os
import shutil
import sys
import time
from datetime import datetime, timezone
import httpx
from sqlalchemy import func, select

from app.config import settings
from app.database.models import Conversation, Customer, Lead, Order, Quote, Product
from app.database.session import get_db_context


async def run_doctor():
    """Runs end-to-end diagnostic checks on all WB-Agent subsystems."""
    print("=" * 60)
    print(" WB-AGENT / EDITH -- SYSTEM DOCTOR DIAGNOSTICS")
    print("=" * 60)

    # 1. Python Environment
    print(f"[*] Python Version: {sys.version.split()[0]} ({sys.executable})")

    # 2. Database Connectivity & Schema Sync
    try:
        from app.database.base import Base
        from app.database.session import get_engine
        async with get_engine().begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with get_db_context() as session:
            res = await session.execute(select(func.count()).select_from(Product))
            prod_count = res.scalar() or 0
            print(f"[OK] Database Connectivity: CONNECTED ({prod_count} catalog products found)")
    except Exception as e:
        print(f"[FAIL] Database Connectivity: FAILED ({e})")

    # 3. WhatsApp Baileys Bridge
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get("http://localhost:3001/health")
            if resp.status_code == 200:
                data = resp.json()
                print(f"[OK] WhatsApp Bridge (Port 3001): ONLINE (Connected: {data.get('connected')})")
            else:
                print(f"[!] WhatsApp Bridge (Port 3001): Responded HTTP {resp.status_code}")
    except Exception:
        print("[!] WhatsApp Bridge (Port 3001): UNREACHABLE (Is whatsapp-bridge running?)")

    # 4. NVIDIA / LLM Connectivity
    try:
        from app.agent.providers.router import LLMRouter
        router = LLMRouter()
        diag = await router.test_model_connection(
            model=settings.NVIDIA_MODEL,
            api_key=settings.NVIDIA_API_KEY,
            base_url=settings.NVIDIA_BASE_URL,
            timeout=5,
        )
        if diag.get("status") == "connected":
            print(f"[OK] NVIDIA Inference API: CONNECTED (Model: {diag.get('model')}, Latency: {diag.get('latency_ms')}ms)")
        else:
            print(f"[!] NVIDIA Inference API: {diag.get('status', 'ERROR').upper()} ({diag.get('error')})")
            print(f"    Fallback engine ready: Deterministic Simulator")
    except Exception as e:
        print(f"[!] LLM Router check: {e}")

    # 5. Core Environment Configuration
    print(f"[*] Default Organization ID: {settings.DEFAULT_ORG_ID}")
    print(f"[*] Autonomous Mode Enabled: {getattr(settings, 'GLOBAL_AUTONOMOUS_ENABLED', True)}")
    print(f"[*] Owner WhatsApp Number: {getattr(settings, 'OWNER_WHATSAPP_NUMBER', '+918900653250')}")
    print("=" * 60)
    print("Diagnostics complete.\n")


async def run_status():
    """Prints live operating metrics and pipeline volume."""
    print("=" * 60)
    print(" WB-AGENT / EDITH -- LIVE SYSTEM STATUS")
    print("=" * 60)

    try:
        from app.database.base import Base
        from app.database.session import get_engine
        async with get_engine().begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with get_db_context() as session:
            leads_cnt = (await session.execute(select(func.count()).select_from(Lead))).scalar() or 0
            cust_cnt = (await session.execute(select(func.count()).select_from(Customer))).scalar() or 0
            conv_cnt = (await session.execute(select(func.count()).select_from(Conversation))).scalar() or 0
            quote_cnt = (await session.execute(select(func.count()).select_from(Quote))).scalar() or 0
            order_cnt = (await session.execute(select(func.count()).select_from(Order))).scalar() or 0

            hot_convs = (
                await session.execute(
                    select(func.count()).select_from(Conversation).where(Conversation.is_hot == True)
                )
            ).scalar() or 0

            human_convs = (
                await session.execute(
                    select(func.count()).select_from(Conversation).where(Conversation.mode == "HUMAN")
                )
            ).scalar() or 0

            print(f"[*] Total Ingested Leads       : {leads_cnt}")
            print(f"[*] Verified Customer Accounts : {cust_cnt}")
            print(f"[*] Active Conversations       : {conv_cnt}")
            print(f"[*] Hot Leads Flagged          : {hot_convs}")
            print(f"[*] Operator Takeovers (Human) : {human_convs}")
            print(f"[*] Auditable Quotes Generated : {quote_cnt}")
            print(f"[*] Confirmed Orders Placed    : {order_cnt}")
    except Exception as e:
        print(f"[!] Could not query status: {e}")

    print("=" * 60 + "\n")


async def run_simulate(message: str, phone: str = "+919876543210"):
    """Simulates an incoming customer message turn against the Consultative Sales Engine."""
    print(f"\n[*] Simulating message from {phone}: \"{message}\"")

    try:
        from app.agent.orchestrator import AgentOrchestrator
        from app.conversations.service import ConversationService

        async with get_db_context() as session:
            conv_svc = ConversationService(session, settings.DEFAULT_ORG_ID)
            # Find or create customer
            cust_res = await session.execute(
                select(Customer).where(
                    Customer.org_id == settings.DEFAULT_ORG_ID,
                    Customer.primary_phone == phone,
                )
            )
            customer = cust_res.scalar_one_or_none()
            if not customer:
                customer = Customer(
                    org_id=settings.DEFAULT_ORG_ID,
                    primary_phone=phone,
                    name="Simulation Buyer",
                    company_name="Simulation Cafe",
                )
                session.add(customer)
                await session.commit()
                await session.refresh(customer)

            conv = await conv_svc.get_or_create_conversation(customer.id, channel_id=phone)

            # Record customer inbound message
            await conv_svc.add_message(
                conversation_id=conv.id,
                direction="inbound",
                sender_type="customer",
                content=message,
                delivery_status="read",
            )

            orchestrator = AgentOrchestrator(session, settings.DEFAULT_ORG_ID)
            resp = await orchestrator.process_turn(
                conversation_id=conv.id,
                inbound_message=message,
            )

            print("\n" + "-" * 50)
            print(f"[EDITH Response] (Sales Stage: {resp.sales_stage_after}, Action: {resp.decision.recommended_action})")
            print(f"\"{resp.reply_text}\"")
            if resp.handoff_created:
                print(f"[!] Human Escalation Triggered: {resp.decision.handoff_reason}")
            print("-" * 50 + "\n")
    except Exception as e:
        print(f"[!] Simulation error: {e}")


def run_backup():
    """Creates a point-in-time timestamped backup of the database."""
    now_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_dir = os.path.join(os.getcwd(), "backups")
    os.makedirs(backup_dir, exist_ok=True)

    db_path = os.path.join(os.getcwd(), "backend", "wb_agent.db")
    if os.path.exists(db_path):
        target = os.path.join(backup_dir, f"wb_agent_{now_str}.db")
        shutil.copy2(db_path, target)
        print(f"[OK] SQLite database backup created successfully: {target}")
    else:
        # For postgres or in-memory, write notification
        target = os.path.join(backup_dir, f"backup_manifest_{now_str}.txt")
        with open(target, "w") as f:
            f.write(f"WB-Agent Backup Manifest\nTimestamp: {now_str}\nDB_URI: {settings.DATABASE_URL}\n")
        print(f"[OK] Backup manifest generated: {target}")


def main():
    parser = argparse.ArgumentParser(description="WB-Agent (EDITH) CLI Management Tool")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    subparsers.add_parser("doctor", help="Run comprehensive system diagnostics")
    subparsers.add_parser("status", help="Print live operating metrics and pipeline counts")
    subparsers.add_parser("backup", help="Create point-in-time database snapshot")

    sim_parser = subparsers.add_parser("simulate", help="Simulate a consultative sales conversation turn")
    sim_parser.add_argument("--message", "-m", type=str, default="Hi, what is your wholesale price for 50kg Assam CTC?", help="Inbound customer message")
    sim_parser.add_argument("--phone", "-p", type=str, default="+919876543210", help="Simulated customer phone number")

    args = parser.parse_args()

    if args.command == "doctor":
        asyncio.run(run_doctor())
    elif args.command == "status":
        asyncio.run(run_status())
    elif args.command == "simulate":
        asyncio.run(run_simulate(args.message, args.phone))
    elif args.command == "backup":
        run_backup()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
