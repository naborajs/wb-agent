"""
Customer Sentiment & Urgency Analysis Utility.
Analyzes inbound WhatsApp messages for sentiment polarity and commercial urgency.
"""

import re
from enum import Enum
from typing import Dict, List, Set
from pydantic import BaseModel


class SentimentScore(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    URGENT = "urgent"


class SentimentAnalysisResult(BaseModel):
    sentiment: SentimentScore
    urgency_level: int  # 1 (low) to 5 (critical)
    detected_keywords: List[str]
    requires_human_escalation: bool


_POSITIVE_KEYWORDS: Set[str] = {
    "great", "excellent", "love", "good", "perfect", "interested", "ready", "buy",
    "order", "agree", "send invoice", "payment done", "confirm", "deal", "super",
    "awesome", "thanks", "thank you", "nice", "satisfied"
}

_NEGATIVE_KEYWORDS: Set[str] = {
    "bad", "terrible", "worst", "delay", "delayed", "late", "scam", "cheat",
    "expensive", "too high", "angry", "disappointed", "complaint", "faulty",
    "damaged", "poor", "unacceptable", "cancel", "refund", "return"
}

_URGENT_KEYWORDS: Set[str] = {
    "urgent", "asap", "immediately", "today", "emergency", "running out",
    "out of stock", "critical", "rush", "fast delivery", "need now"
}


def analyze_sentiment(text: str) -> SentimentAnalysisResult:
    """
    Analyzes message sentiment and urgency score without requiring expensive LLM roundtrips.
    """
    if not text:
        return SentimentAnalysisResult(
            sentiment=SentimentScore.NEUTRAL,
            urgency_level=1,
            detected_keywords=[],
            requires_human_escalation=False,
        )

    clean_text = text.lower()
    words = set(re.findall(r"\b\w+\b", clean_text))
    
    # Check multi-word phrase matching
    detected_urgent = [kw for kw in _URGENT_KEYWORDS if kw in clean_text]
    detected_positive = [kw for kw in _POSITIVE_KEYWORDS if kw in clean_text]
    detected_negative = [kw for kw in _NEGATIVE_KEYWORDS if kw in clean_text]

    all_detected = detected_urgent + detected_positive + detected_negative

    # Urgency scoring (1 to 5)
    urgency = 1
    if detected_urgent:
        urgency = min(5, 3 + len(detected_urgent))
    elif detected_negative:
        urgency = min(4, 2 + len(detected_negative))
    elif detected_positive:
        urgency = 2

    # Polarity determination
    escalate = False
    if len(detected_urgent) >= 2 or (detected_urgent and detected_negative):
        sentiment = SentimentScore.URGENT
        escalate = True
    elif len(detected_negative) > len(detected_positive):
        sentiment = SentimentScore.NEGATIVE
        escalate = len(detected_negative) >= 2 or "scam" in clean_text or "cheat" in clean_text
    elif len(detected_positive) > 0:
        sentiment = SentimentScore.POSITIVE
    else:
        sentiment = SentimentScore.NEUTRAL

    return SentimentAnalysisResult(
        sentiment=sentiment,
        urgency_level=urgency,
        detected_keywords=all_detected,
        requires_human_escalation=escalate,
    )
