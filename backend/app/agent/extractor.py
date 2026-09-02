"""
Passive Information Extraction Engine for EDITH (Section 13 & 14).
Extracts business context, requirements, quantities, locations, budgets, emotions, and buying signals
naturally from customer messages without rigid interrogations or forms.
"""

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ExtractedFacts:
    """Structured operational facts extracted passively from natural customer text."""
    quantity: Optional[str] = None
    quantity_numeric_kg: Optional[float] = None
    frequency: Optional[str] = None  # e.g. monthly, one-time, weekly
    business_type: Optional[str] = None  # cafe, restaurant, hotel, tea_shop, distributor
    use_case: Optional[str] = None  # milk_tea, orthodox_service, iced_tea, breakfast_buffet
    location: Optional[str] = None
    timeline: Optional[str] = None
    packaging: Optional[str] = None  # jute_bag, vacuum_pack, wooden_chest, pouches
    budget_raw: Optional[str] = None
    budget_numeric_inr: Optional[float] = None
    preferences: List[str] = field(default_factory=list)
    product_interest: Optional[str] = None
    objections: List[str] = field(default_factory=list)
    purchase_intent_signal: Optional[str] = None
    is_ready_to_buy: bool = False
    emotional_state: str = "NEUTRAL"  # CURIOUS, INTERESTED, EXCITED, UNCERTAIN, SKEPTICAL, FRUSTRATED, ANGRY, READY_TO_BUY


class PassiveInformationExtractor:
    """
    High-precision regex and heuristic fact extraction engine for tea sales dialogues.
    Captures operational parameters across English, Hindi, and Hinglish.
    """

    @staticmethod
    def extract(text: str) -> ExtractedFacts:
        facts = ExtractedFacts()
        lower = text.lower()

        # 1. Extract Quantity (e.g. 50kg, 100 kg, 20 chests, 500 kilograms)
        qty_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilo|kilos|kilogram|kilograms|chests|chest|ton|tons)", lower)
        if qty_match:
            val = float(qty_match.group(1))
            unit = "kg"
            if "ton" in lower:
                val *= 1000
            facts.quantity_numeric_kg = val
            facts.quantity = f"{int(val) if val.is_integer() else val}kg"

        # 2. Extract Frequency
        if any(w in lower for w in ["monthly", "every month", "per month", "har mahine", "mahine ka"]):
            facts.frequency = "monthly"
        elif any(w in lower for w in ["weekly", "every week", "per week", "hafte ka"]):
            facts.frequency = "weekly"
        elif any(w in lower for w in ["one-time", "one time", "trial", "single order", "first order"]):
            facts.frequency = "one-time"

        # 3. Extract Business Type
        if any(w in lower for w in ["cafe", "café", "coffee shop"]):
            facts.business_type = "Cafe"
        elif any(w in lower for w in ["restaurant", "hotel", "resort", "dhaba"]):
            facts.business_type = "Restaurant & Hospitality"
        elif any(w in lower for w in ["distributor", "wholesaler", "dealer", "reseller", "trader"]):
            facts.business_type = "Wholesale Distributor"
        elif any(w in lower for w in ["tea shop", "chai shop", "chai stall", "tapri", "tea point"]):
            facts.business_type = "Tea Stall & Specialty Counter"

        # 4. Extract Use Case
        if any(w in lower for w in ["milk tea", "kadak chai", "milk", "doodh", "dudh chai", "tapri style"]):
            facts.use_case = "milk_tea"
        elif any(w in lower for w in ["black tea", "orthodox", "first flush", "second flush", "liquor"]):
            facts.use_case = "orthodox_black_tea"
        elif any(w in lower for w in ["green tea", "health", "detox", "weight loss"]):
            facts.use_case = "green_tea"
        elif any(w in lower for w in ["iced tea", "cold brew", "blends"]):
            facts.use_case = "iced_tea_beverages"

        # 5. Extract Packaging
        if any(w in lower for w in ["jute", "jute bag", "jute bags", "bora", "gunny"]):
            facts.packaging = "Jute Bag"
        elif any(w in lower for w in ["vacuum", "vacuum pack", "foil"]):
            facts.packaging = "Vacuum Sealed Foil"
        elif any(w in lower for w in ["chest", "wooden chest", "tea chest"]):
            facts.packaging = "Wooden Tea Chest"
        elif any(w in lower for w in ["pouch", "pouches", "consumer pack", "retail pack"]):
            facts.packaging = "Commercial Retail Pouches"

        # 6. Extract Location (Focus on common Indian cities/regions)
        cities = [
            "siliguri", "kolkata", "calcutta", "jalpaiguri", "darjeeling", "guwahati",
            "delhi", "mumbai", "bangalore", "bengaluru", "hyderabad", "chennai",
            "pune", "ahmedabad", "jaipur", "lucknow", "patna", "bhubaneswar"
        ]
        for c in cities:
            if re.search(rf"\b{c}\b", lower):
                facts.location = c.title()
                break

        # 7. Extract Timeline
        if any(w in lower for w in ["urgent", "immediately", "asap", "emergency", "today"]):
            facts.timeline = "immediate"
        elif any(w in lower for w in ["1 week", "one week", "within a week", "next week", "7 days"]):
            facts.timeline = "1_week"
        elif any(w in lower for w in ["next month", "agla mahina", "within a month", "30 days"]):
            facts.timeline = "next_month"

        # 8. Extract Budget
        budget_match = re.search(r"(?:rs\.?|inr|₹)?\s*(\d+(?:,\d+)?)\s*(?:k|thousand|lakh|lac)?", lower)
        if "budget" in lower or "around" in lower or "approx" in lower or "₹" in lower or "rs" in lower:
            k_match = re.search(r"(\d+)\s*k\b", lower)
            lakh_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:lakh|lac)", lower)
            num_match = re.search(r"(?:budget|around|approx|rate|total)\s*(?:is|of|around|approx)?\s*(?:rs\.?|₹)?\s*(\d{4,7})", lower)
            if k_match:
                val = float(k_match.group(1)) * 1000
                facts.budget_numeric_inr = val
                facts.budget_raw = f"₹{int(val):,}"
            elif lakh_match:
                val = float(lakh_match.group(1)) * 100000
                facts.budget_numeric_inr = val
                facts.budget_raw = f"₹{int(val):,}"
            elif num_match:
                val = float(num_match.group(1))
                facts.budget_numeric_inr = val
                facts.budget_raw = f"₹{int(val):,}"

        # 9. Extract Preferences
        if any(w in lower for w in ["strong", "kadak", "karak", "hard"]):
            facts.preferences.append("strong_kadak")
        if any(w in lower for w in ["aroma", "aromatic", "khushboo", "flavor"]):
            facts.preferences.append("high_aroma")
        if any(w in lower for w in ["cheap", "low price", "affordable", "sasta", "low cost", "budget"]):
            facts.preferences.append("cost_conscious")
        if any(w in lower for w in ["organic", "pesticide free", "bio"]):
            facts.preferences.append("organic_certified")

        # 10. Extract Product Interest
        if "darjeeling" in lower:
            facts.product_interest = "Darjeeling Single Estate"
        elif "assam" in lower or "ctc" in lower:
            facts.product_interest = "Assam Kadak CTC"
        elif "dooars" in lower or "hotel blend" in lower:
            facts.product_interest = "Dooars Hotel Special Blend"
        elif "green tea" in lower:
            facts.product_interest = "Himalayan Green Whole Leaf"

        # 11. Extract Objections
        if (
            any(w in lower for w in ["too expensive", "mehenga", "budget se bahar", "costly", "expensive"])
            or re.search(r"\b(?:price|rate|cost|budget)\b.*?\b(?:high|zyada|jyada|mehenga|much|issue|tight)", lower)
            or "discount" in lower
        ):
            facts.objections.append("price_too_high")
        if any(w in lower for w in ["quality doubt", "sample chahiye", "can i test", "tasting sample"]):
            facts.objections.append("needs_quality_proof")
        if any(w in lower for w in ["delivery delay", "late delivery", "too far"]):
            facts.objections.append("logistics_concern")

        # 12. Extract Purchase Intent Signals (Buying signals, Section 25)
        buy_triggers = [
            "i'll take it", "ill take it", "i want to order", "i want to buy", "place the order",
            "send me the invoice", "send invoice", "send payment link", "how do i pay", "let's proceed",
            "lets proceed", "book it", "book my order", "finalize the order", "pack it",
            "order confirm", "confirm order", "mai khareedna chahta hu", "deal done", "done deal"
        ]
        if any(t in lower for t in buy_triggers):
            facts.is_ready_to_buy = True
            facts.purchase_intent_signal = "EXPLICIT_BUY_ORDER"
            facts.emotional_state = "READY_TO_BUY"
        elif any(w in lower for w in ["looks good", "sounds good", "reserve it", "can you hold", "final quote"]):
            facts.purchase_intent_signal = "SOFT_BUYING_SIGNAL"
            facts.emotional_state = "INTERESTED"

        # 13. Estimate Emotional State
        if facts.is_ready_to_buy:
            facts.emotional_state = "READY_TO_BUY"
        elif any(w in lower for w in ["angry", "cheat", "scam", "bad service", "bakwas", "useless", "cancel everything"]):
            facts.emotional_state = "ANGRY"
        elif any(w in lower for w in ["frustrated", "irritating", "why again", "i already told", "already said"]):
            facts.emotional_state = "FRUSTRATED"
        elif any(w in lower for w in ["doubt", "skeptical", "guarantee", "proof", "genuine or fake"]):
            facts.emotional_state = "SKEPTICAL"
        elif any(w in lower for w in ["not sure", "confused", "thinking", "partner se baat", "let me think"]):
            facts.emotional_state = "UNCERTAIN"
        elif any(w in lower for w in ["great", "awesome", "perfect", "excited", "loved it"]):
            facts.emotional_state = "EXCITED"
        elif any(w in lower for w in ["what", "how", "tell me", "details", "varieties", "difference"]):
            facts.emotional_state = "CURIOUS"

        return facts
