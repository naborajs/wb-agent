"""
Simulator LLM Provider: deterministic, context-aware conversational engine for tests and offline development.
"""

import re
import time
from typing import Any, Dict, List, Optional
from app.agent.providers.base import LLMMessage, LLMProvider, LLMResponse


class SimulatorProvider(LLMProvider):
    """
    High-fidelity simulation model emulating sales consultant behavior for North Bengal Tea Co.
    Exercises the full tool router, structured decisions, and validation paths offline.
    """

    def __init__(self, model_name: str = "simulator-sales-consultant-v1"):
        self.model_name = model_name

    async def generate(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.2,
        max_tokens: int = 1024,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> LLMResponse:
        start_t = time.time()

        # Find latest user message and conversation history
        user_msg = ""
        user_msg_raw = ""
        prior_assistant_msgs = []
        prior_user_msgs = []

        for m in messages:
            if m.role == "user":
                user_msg = m.content.lower().strip()
                user_msg_raw = m.content.strip()
                prior_user_msgs.append(user_msg)
            elif m.role == "assistant":
                prior_assistant_msgs.append(m.content)

        is_ongoing = len(prior_assistant_msgs) > 0
        last_assistant = prior_assistant_msgs[-1].lower() if prior_assistant_msgs else ""

        # Detect language preference request in user message
        is_hinglish_request = any(
            k in user_msg for k in [
                "hinglish", "hindi", "bol skat", "bol sakte", "muja english",
                "mujhe english", "problem hota", "hindi me", "hinglish me", "tora problem"
            ]
        )

        # Context-aware conversational responses
        if is_hinglish_request:
            if "packaging" in last_assistant or "jute" in last_assistant or "foil" in last_assistant:
                reply = (
                    "Haan bilkul! Hum Hinglish me baat kar sakte hain. "
                    "Aapke order ke liye packaging confirm karni thi — aapko 20kg food-grade jute bags chahiye ya vacuum-sealed foil chests?"
                )
            elif "50kg" in last_assistant or "100kg" in last_assistant or "order" in last_assistant:
                reply = (
                    "Haan bilkul! Hum Hinglish me aage baat kar sakte hain. "
                    "Aapke order details mere paas note hain. Kya aap packaging preference aur delivery location confirm kar sakte hain?"
                )
            else:
                reply = (
                    "Haan bilkul! Hum Hinglish me baat kar sakte hain. "
                    "Aapke business requirement ke bare me batayein — kitni quantity aur kis tarah ki chai chahiye?"
                )
        elif "jute" in user_msg or "foil" in user_msg or "bag" in user_msg or "chest" in user_msg:
            reply = (
                "Excellent! I have noted your packaging preference. "
                "Our wholesale commercial manager Rajiv will now finalize your dispatch timeline and share the formal pro-forma invoice shortly."
            )
        elif "sample" in user_msg:
            reply = (
                "We certainly provide sample kits! For verified café and restaurant operators, "
                "we offer a 200g commercial tasting kit covering our Darjeeling First Flush and Assam Kadak CTC. "
                "Would you like me to note your business shipping address for dispatch?"
            )
        elif "price" in user_msg or "rate" in user_msg or "cost" in user_msg:
            if "100" in user_msg or "bulk" in user_msg:
                reply = (
                    "For a commercial volume of 100kg, our Assam Kadak CTC comes to ₹306/kg (with our 10% volume discount applied), "
                    "or our Darjeeling First Flush Special at ₹1,305/kg. Both ship in heavy-duty food-grade sacks. "
                    "Which profile better fits your menu?"
                )
            else:
                reply = (
                    "Our wholesale pricing starts at ₹230/kg for bulk Dooars Hotel Blend, ₹340/kg for Assam Kadak CTC, "
                    "and ₹1,450/kg for Darjeeling First Flush Special in 20kg chests. "
                    "What approximate monthly volume does your business require?"
                )
        elif "expensive" in user_msg or "discount" in user_msg or "high" in user_msg:
            reply = (
                "I understand budget is crucial for high-volume operations. Our Darjeeling teas are single-estate whole leaf, "
                "which delivers roughly 20% higher cuppage per kilo than blended auction leaf. Alternatively, our Dooars Hotel Blend "
                "is specifically optimized for low cost-per-cup without sacrificing rich color. Would you like a comparative quote on both?"
            )
        elif "order" in user_msg or "buy" in user_msg or "purchase" in user_msg or "ready" in user_msg:
            reply = (
                "Excellent! I'll prepare your commercial order specifications right now. "
                "I am connecting our wholesale manager Rajiv directly to confirm GST billing, payment terms, and delivery timeline."
            )
        elif "delivery" in user_msg or "shipping" in user_msg:
            reply = (
                "We ship door-to-door across all major Indian cities via surface express logistics. "
                "Transit time is typically 3-5 business days, and shipping is included for bulk shipments above 100kg."
            )
        elif "human" in user_msg or "person" in user_msg or "call" in user_msg or "talk to" in user_msg:
            reply = (
                "I am handing you over to our wholesale sales director Rajiv right now. "
                "He will step into this WhatsApp chat shortly to assist you directly."
            )
        elif is_ongoing:
            # Context-preserving fallback instead of amnesiac greeting reset
            reply = (
                "Understood. I have updated your conversation profile with those details. "
                "Could you please confirm if you would like me to proceed with finalizing this order specifications?"
            )
        else:
            reply = (
                "Thank you for contacting North Bengal Tea Co. We supply direct estate teas to cafes, hotels, "
                "and wholesale distributors across India. How can we help your business today?"
            )

        latency_ms = int((time.time() - start_t) * 1000)

        return LLMResponse(
            content=reply,
            model=self.model_name,
            provider="simulator",
            latency_ms=max(1, latency_ms),
            prompt_tokens=len(user_msg.split()),
            completion_tokens=len(reply.split()),
            total_tokens=len(user_msg.split()) + len(reply.split()),
        )

    async def health_check(self) -> bool:
        return True
