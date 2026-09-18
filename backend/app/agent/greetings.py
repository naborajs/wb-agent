"""
Timezone-Aware Greeting & Salutation Utility for EDITH.
Generates context-aware conversational salutations based on buyer time-of-day and identity.
"""

from datetime import datetime, timezone
from typing import Optional


def get_time_of_day_greeting(hour: Optional[int] = None) -> str:
    """
    Returns time-appropriate greeting based on 24-hour integer.
    Defaults to current UTC or local hour if not specified.
    """
    if hour is None:
        hour = datetime.now().hour

    if 5 <= hour < 12:
        return "Good morning"
    elif 12 <= hour < 17:
        return "Good afternoon"
    elif 17 <= hour < 22:
        return "Good evening"
    else:
        return "Hello"


def generate_personalized_salutation(
    name: Optional[str] = None,
    company_name: Optional[str] = None,
    hour: Optional[int] = None,
) -> str:
    """
    Generates a natural, professional B2B opening salutation.
    Example: 'Good morning, Rohan!' or 'Good afternoon, team at Darjeeling Cafe!'
    """
    greeting = get_time_of_day_greeting(hour)

    clean_name = name.strip() if name and name.strip() else None
    clean_company = company_name.strip() if company_name and company_name.strip() else None

    if clean_name:
        first_name = clean_name.split()[0]
        return f"{greeting}, {first_name}!"
    elif clean_company:
        return f"{greeting}, team at {clean_company}!"
    else:
        return f"{greeting}!"
