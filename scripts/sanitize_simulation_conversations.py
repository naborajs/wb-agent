#!/usr/bin/env python3
"""
Sanitizes the WB-Agent database by isolating simulated/sandbox conversations
from live production WhatsApp channels.

Identifies:
1. Conversations using known sandbox/dummy phone numbers (e.g., +919876543210, +919999988888).
2. Conversations generated from inbound simulator prompts (e.g., "250 units").
3. Sets channel = 'simulation', updates metadata_json, and flags raw message payloads.
"""

import asyncio
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select
from app.database.session import get_session_factory
from app.database.models.conversation import Conversation, Message
from app.database.models.lead_customer import Customer
from app.utils.phone import is_sandbox_test_phone


async def sanitize_database():
    print("===================================================================")
    print("  WB-AGENT: Database Simulation & Sandbox Channel Sanitizer")
    print("===================================================================")

    factory = get_session_factory()
    async with factory() as session:
        # 1. Fetch all conversations
        convs = (await session.execute(select(Conversation))).scalars().all()
        sanitized_conv_count = 0
        sanitized_msg_count = 0

        for conv in convs:
            msgs = (
                await session.execute(
                    select(Message).where(Message.conversation_id == conv.id)
                )
            ).scalars().all()

            # Check if this conversation is simulated
            is_dummy_phone = is_sandbox_test_phone(conv.channel_id)
            has_sim_prompt = any("250 units" in (m.content or "") for m in msgs)
            is_simulation_channel = conv.channel in ("simulation", "simulator", "sandbox")

            if is_dummy_phone or has_sim_prompt or is_simulation_channel:
                orig_channel = conv.channel
                conv.channel = "simulation"
                meta = dict(conv.metadata_json or {})
                meta["is_simulation"] = True
                meta["sanitized_at"] = "2026-09-19"
                conv.metadata_json = meta

                print(
                    f"[ISOLATED CONVERSATION] ID: {conv.id[:8]}... | "
                    f"Phone: {conv.channel_id} | Channel: {orig_channel} -> simulation"
                )
                sanitized_conv_count += 1

                for m in msgs:
                    payload = dict(m.raw_payload or {})
                    if not payload.get("is_simulation"):
                        payload["is_simulation"] = True
                        m.raw_payload = payload
                        sanitized_msg_count += 1

        # 2. Tag customers with dummy numbers
        custs = (await session.execute(select(Customer))).scalars().all()
        sanitized_cust_count = 0
        for cust in custs:
            if is_sandbox_test_phone(cust.primary_phone) or "Simulation" in (cust.name or "") or cust.name == "Wholesale Partner":
                if cust.company_type != "simulation":
                    cust.company_type = "simulation"
                    sanitized_cust_count += 1
                    print(f"[TAGGED CUSTOMER] ID: {cust.id[:8]}... | Name: {cust.name} | Phone: {cust.primary_phone} -> simulation")

        await session.commit()

        print("-------------------------------------------------------------------")
        print(f"Sanitization complete:")
        print(f"  - Conversations isolated to 'simulation': {sanitized_conv_count}")
        print(f"  - Messages tagged as 'is_simulation':      {sanitized_msg_count}")
        print(f"  - Customer records marked as simulation:   {sanitized_cust_count}")
        print("===================================================================")


if __name__ == "__main__":
    asyncio.run(sanitize_database())
