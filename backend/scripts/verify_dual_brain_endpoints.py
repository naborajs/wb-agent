import asyncio
import os
import sys

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.stdout.reconfigure(encoding='utf-8')

from app.brain import inter_brain_bus
from app.database.session import get_session_factory
from app.config import settings

async def main():
    print("Testing Dual Brain Agentic Capabilities...")
    factory = get_session_factory()
    async with factory() as session:
        org_id = settings.DEFAULT_ORG_ID

        # 1. Test Executive Briefing (Today)
        print("\n--- 1. Executive Briefing ---")
        briefing = await inter_brain_bus.get_executive_briefing(session, org_id, "today")
        print("Audio Script:", briefing["audio_script"])
        print("Metrics:", briefing["metrics"])
        assert "WhatsApp gateway is connected" in briefing["audio_script"]

        # 2. Test 24-Hour Velocity & Heatmap Telemetry
        print("\n--- 2. 24-Hour Hourly Velocity ---")
        velocity = await inter_brain_bus.get_hourly_velocity(session, org_id)
        print("Total 24h Inquiries:", velocity["total_inquiries_24h"])
        print("Autonomous Conversion Rate:", velocity["autonomous_rate_pct"], "%")
        print("Peak Hours:", velocity["peak_hour_labels"])
        assert velocity["autonomous_rate_pct"] == 94.2
        assert len(velocity["hourly_series"]) == 24

        # 3. Test EDITH -> Friday Delegation with Friday Refusal & EDITH Fallback Alert
        print("\n--- 3. EDITH -> Friday Delegation (Non-urgent voice interruption -> Denied -> Fallback Alert) ---")
        res = await inter_brain_bus.edith_request_friday(
            session=session,
            org_id=org_id,
            action="VOICE_INTERRUPT",
            details={
                "topic": "Lead +91 9800123456 requested custom Darjeeling quotation",
                "severity": "medium",
                "urgency": "normal",
                "target_phone": "+91 9800123456",
            }
        )
        print("Friday Decision:", res["friday_decision"])
        print("Friday Reasoning:", res["friday_reasoning"])
        print("Fallback Executed:", res["fallback_executed"])
        print("Fallback Details:", res["fallback_details"])
        assert res["friday_decision"] == "DENIED"
        assert res["fallback_executed"] is True
        assert res["fallback_details"]["fallback_channel"] == "DIRECT_AGENT_NOTIFICATION"

        # 4. Test Background Thinking Cycle
        print("\n--- 4. Background Thinking Cycle ---")
        think_res = await inter_brain_bus.run_background_thinking_cycle(session, org_id)
        print("Status:", think_res["status"])
        print("EDITH Thought:", think_res["edith_thought"])
        print("Friday Thought:", think_res["friday_thought"])
        assert think_res["status"] == "synchronized"

        # 5. Test Friday Chat answering briefing and traffic
        print("\n--- 5. Friday Chat answering briefing ---")
        chat_brief = await inter_brain_bus.friday.chat("give me today's brief", session, org_id)
        print("Friday Briefing Reply:", chat_brief["speak_text"])
        assert "WhatsApp gateway is connected" in chat_brief["speak_text"]

        print("\n--- 6. Friday Chat answering traffic velocity ---")
        chat_traffic = await inter_brain_bus.friday.chat("What are our peak hours and traffic velocity?", session, org_id)
        print("Friday Traffic Reply:", chat_traffic["reply"][:150], "...")
        assert "Peak Operational Hours" in chat_traffic["reply"]

        # 6. Test Safe Mode
        print("\n--- 7. Safe Mode Toggle ---")
        sm = inter_brain_bus.toggle_safe_mode()
        print("Safe Mode State:", sm)
        assert inter_brain_bus.safe_mode_enabled == sm
        inter_brain_bus.toggle_safe_mode(False)
        print("Safe Mode Reset to:", inter_brain_bus.safe_mode_enabled)

    print("\n✅ All Dual-Brain Agentic Features Verified Successfully!")

if __name__ == "__main__":
    asyncio.run(main())
