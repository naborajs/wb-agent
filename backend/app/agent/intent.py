"""
Intent detection, objection classification, and language recognition (Section 33 & 34).
"""

import re
from typing import Tuple


def detect_language(text: str) -> str:
    """
    Detects customer language / code-switching dialect: English, Hindi, Bengali, Hinglish.
    """
    lower = text.lower().strip()

    # Bengali Unicode Range (\u0980-\u09FF) or common transliterated words
    bengali_chars = re.findall(r"[\u0980-\u09FF]", text)
    if len(bengali_chars) > 2:
        return "Bengali"
    if any(w in lower for w in ["koto dam", "cha chai", "amader dokan", "bhalo cha", "dokaner jonne"]):
        return "Bengali"

    # Devanagari Unicode Range (\u0900-\u097F)
    devanagari_chars = re.findall(r"[\u0900-\u097F]", text)
    if len(devanagari_chars) > 2:
        return "Hindi"

    # Hinglish / Romanized Hindi keywords
    hinglish_markers = [
        "chai", "patti", "kya rate", "kitna", "bhai", "namaste", "chahiye", "dam",
        "sample bhej", "bhejo", "humara cafe", "bahut mehenga", "kam karo", "maal",
        "hinglish", "hindi", "bol", "sakta", "sakate", "skat", "muja", "mujhe",
        "mera", "meri", "hum", "aap", "tora", "thoda", "problem", "bataye", "batao",
        "hota ha", "hota hai", "karo na", "lekin", "kaise"
    ]
    if any(marker in lower for marker in hinglish_markers):
        return "Hinglish"

    return "English"


def detect_intent_and_objection(text: str) -> Tuple[str, float, str]:
    """
    Classifies customer intent, confidence score, and primary objection category.

    Returns:
        (intent: str, confidence: float, objection_category: str)
    """
    lower = text.lower().strip()

    # 1. Opt-out (WhatsApp anti-spam & consent requirement - strict phrase matching only)
    opt_out_pattern = r"(?:^\s*(?:stop|unsubscribe|opt[\s-]?out|halt)\s*$|\b(?:unsubscribe me|opt me out|stop messaging me|do not message me|don't message me|kripya message na kare|ab message mat bhejo|message band karo)\b)"
    if re.search(opt_out_pattern, lower):
        return "opt_out", 1.0, "NONE"

    # 2. Explicit Human Takeover Request
    if any(k in lower for k in ("talk to human", "real person", "call me", "manager", "director", "insan se baat")):
        return "human_request", 0.95, "TRUST"

    # 3. Purchase Intent
    if any(k in lower for k in (
        "place the order", "place order", "buy now", "send invoice", "ready to order",
        "let's do it", "finalise order", "finalize order", "finalize the order",
        "finalise the order", "finalize", "finalise", "confirm order"
    )):
        return "purchase_intent", 0.95, "NONE"

    # 4. Objections
    if any(k in lower for k in (
        "too expensive", "expensive", "costly", "high price", "cheaper elsewhere",
        "kam karo", "slightly high", "rate is high", "rate is slightly high", "cheaper",
        "50% discount", "discount or", "current supplier", "other supplier", "competitor"
    )):
        return "objection", 0.90, "PRICE"

    if any(k in lower for k in ("bad quality", "sample was bitter", "is it authentic", "fake", "original darjeeling")):
        return "objection", 0.85, "QUALITY"

    if any(k in lower for k in ("delayed delivery", "too slow", "can you deliver in 2 days", "transit time")):
        return "objection", 0.85, "DELIVERY"

    # 5. Pricing & Samples
    if any(k in lower for k in ("sample", "testing kit", "sample pack", "trial")):
        return "sample_request", 0.90, "NONE"

    if re.search(r"\b(price|prices|rate|rates|cost|costs|quote|quotes|discount|discounts|per kg)\b", lower):
        return "price_inquiry", 0.88, "NONE"

    # 6. Product Inquiry
    if any(k in lower for k in ("darjeeling", "assam", "ctc", "dooars", "orthodox", "green tea", "blend", "grade", "ftgfop")):
        return "product_inquiry", 0.85, "NONE"

    # 7. Greeting / Opening
    if lower in ("hi", "hello", "hey", "namaste", "good morning", "good evening"):
        return "greeting", 0.95, "NONE"

    return "discovery_inquiry", 0.70, "NONE"
