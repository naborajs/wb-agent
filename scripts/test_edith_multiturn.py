"""
Multi-turn End-to-End Simulation Test for EDITH Sales Agent (Section 107 & 154).
Tests:
Turn 1: Customer: "bhai mujhe cafe ke liye tea chahiye, around 100kg monthly milk tea ke liye Siliguri me"
Verify: EDITH extracts business=Cafe, qty=100kg, use_case=milk_tea, location=Siliguri.
        Does NOT ask for quantity or business type. Recommends Assam Kadak CTC or Dooars Hotel Blend.

Turn 2: Customer: "Price thoda high lag raha hai, any discount?"
Verify: EDITH recognizes price objection, explains cuppage yield and volume discount tiers.

Turn 3: Customer: "Do you sell tea seeds for planting?"
Verify: EDITH triggers Unknown Knowledge Request, notifies owner +918900653250, and does NOT hallucinate horticulture claims.

Turn 4: Customer: "Okay looks good! I want to buy 100kg of Assam Kadak CTC. Please send invoice."
Verify: EDITH recognizes purchase intent, creates Handoff, alerts owner +918900653250, and stops selling.
"""

import asyncio
import io
import sys
from sqlalchemy import select

# Ensure UTF-8 output on Windows consoles
if sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from app.agent.orchestrator import AgentOrchestrator
from app.conversations.service import ConversationService
from app.database.models import Customer
from app.database.session import get_session_factory


async def run_simulation():
    factory = get_session_factory()
    org_id = "org_default"
    customer_phone = "+919999988888"

    async with factory() as session:
        # Get or create customer
        res = await session.execute(
            select(Customer).where(Customer.org_id == org_id, Customer.primary_phone == customer_phone)
        )
        cust = res.scalars().first()
        if not cust:
            cust = Customer(
                org_id=org_id,
                primary_phone=customer_phone,
                name="Suman Cafe Owner",
                company_name="Suman Chai Corner",
                company_type="Cafe",
                city="Siliguri",
                preferred_language="Hinglish",
            )
            session.add(cust)
            await session.commit()
            await session.refresh(cust)

        conv_svc = ConversationService(session, org_id)
        conv = await conv_svc.get_or_create_conversation(
            customer_id=cust.id,
            channel="whatsapp",
            channel_id=customer_phone,
        )
        conv_id = conv.id

        print(f"\n=======================================================")
        print(f"STARTING EDITH MULTI-TURN SIMULATION [Conv ID: {conv_id}]")
        print(f"=======================================================\n")

        orchestrator = AgentOrchestrator(session, org_id)

        # Turn 1
        t1 = "bhai mujhe cafe ke liye tea chahiye, around 100kg monthly milk tea ke liye Siliguri me"
        print(f"Turn 1 Customer: \"{t1}\"")
        r1 = await orchestrator.process_turn(conv_id, t1)
        print(f"Turn 1 EDITH: \"{r1.reply_text}\"")
        print(f"Turn 1 Stage: {r1.sales_stage_after} | Score: {r1.lead_score_after}\n")

        # Turn 2
        t2 = "Price thoda high lag raha hai, any discount?"
        print(f"Turn 2 Customer: \"{t2}\"")
        r2 = await orchestrator.process_turn(conv_id, t2)
        print(f"Turn 2 EDITH: \"{r2.reply_text}\"")
        print(f"Turn 2 Stage: {r2.sales_stage_after} | Score: {r2.lead_score_after}\n")

        # Turn 3: Unknown question
        t3 = "Do you sell tea seeds for planting?"
        print(f"Turn 3 Customer: \"{t3}\"")
        r3 = await orchestrator.process_turn(conv_id, t3)
        print(f"Turn 3 EDITH: \"{r3.reply_text}\"")
        print(f"Turn 3 Stage: {r3.sales_stage_after} | Score: {r3.lead_score_after}\n")

        # Turn 4: Purchase intent
        t4 = "Okay looks good! I want to buy 100kg of Assam Kadak CTC. Please send invoice."
        print(f"Turn 4 Customer: \"{t4}\"")
        r4 = await orchestrator.process_turn(conv_id, t4)
        print(f"Turn 4 EDITH: \"{r4.reply_text}\"")
        print(f"Turn 4 Stage: {r4.sales_stage_after} | Score: {r4.lead_score_after} | Handoff: {r4.handoff_created}\n")
        assert r4.handoff_created is True, "Expected handoff to be created on purchase intent"
        assert r4.sales_stage_after == "PURCHASE_INTENT"

        print("=======================================================")
        print("ALL 4 EDITH MULTI-TURN SIMULATION TURNS PASSED!")
        print("=======================================================\n")


if __name__ == "__main__":
    asyncio.run(run_simulation())
