import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database.session import get_session_factory
from app.api.routes.knowledge import (
    list_knowledge_items,
    get_knowledge_stats,
    handle_agentic_update_request,
    UpdateChatRequest,
)
from app.api.routes.brain import handle_voice_knowledge_action, VoiceKnowledgeActionRequest
from app.config import settings


async def run_all_tests():
    factory = get_session_factory()
    async with factory() as session:
        print("=== 1. Testing list_knowledge_items ===")
        items = await list_knowledge_items(session=session)
        print(f"Items loaded: {len(items)}")
        assert len(items) > 0, "Items list should not be empty"

        print("\n=== 2. Testing get_knowledge_stats ===")
        stats = await get_knowledge_stats(session=session)
        print(f"Stats: {stats}")
        assert stats["total"] > 0, "Total count should be > 0"

        print("\n=== 3. Testing handle_agentic_update_request (EDITH Deliberation) ===")
        req = UpdateChatRequest(message="Add 12% discount for orders over 150 units")
        chat_res = await handle_agentic_update_request(req, session=session)
        print(f"EDITH Decision: {chat_res.get('decision')} | Reasoning: {chat_res.get('edith_evaluation', {}).get('reasoning')}")
        assert chat_res.get("decision") == "ACCEPTED"

        print("\n=== 4. Testing handle_voice_knowledge_action (Friday -> EDITH Voice Directive) ===")
        voice_req = VoiceKnowledgeActionRequest(
            action="create",
            instruction="Friday create a new file that we can give discount to up to 20% to any of our products for 200+ units",
            category="pricing_rule",
        )
        voice_res = await handle_voice_knowledge_action(voice_req, session=session)
        print(f"Voice Action Decision: {voice_res.get('decision')} | Action: {voice_res.get('action')}")
        print(f"Reasoning: {voice_res.get('reasoning')}")
        assert voice_res.get("decision") == "ACCEPTED"

        print("\n=== 5. Testing Voice Pause Action ===")
        pause_req = VoiceKnowledgeActionRequest(
            action="pause",
            instruction="pause the 20% discount file",
            item_id_or_title="Tier: 200",
        )
        pause_res = await handle_voice_knowledge_action(pause_req, session=session)
        print(f"Pause Decision: {pause_res.get('decision')} | Reasoning: {pause_res.get('reasoning')}")
        assert pause_res.get("decision") == "ACCEPTED"

        print("\n=== 6. Testing Voice Delete Action ===")
        del_req = VoiceKnowledgeActionRequest(
            action="delete",
            instruction="delete the 20% discount file",
            item_id_or_title="Tier: 200",
        )
        del_res = await handle_voice_knowledge_action(del_req, session=session)
        print(f"Delete Decision: {del_res.get('decision')} | Reasoning: {del_res.get('reasoning')}")
        assert del_res.get("decision") == "ACCEPTED"

        print("\n ALL BACKEND SUITE VERIFICATIONS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(run_all_tests())
