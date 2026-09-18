"""
Unit tests for timezone-aware greetings and personalized salutations.
"""

from app.agent.greetings import get_time_of_day_greeting, generate_personalized_salutation


def test_time_of_day_greeting_buckets():
    # Morning: 5:00 to 11:59
    assert get_time_of_day_greeting(5) == "Good morning"
    assert get_time_of_day_greeting(11) == "Good morning"

    # Afternoon: 12:00 to 16:59
    assert get_time_of_day_greeting(12) == "Good afternoon"
    assert get_time_of_day_greeting(16) == "Good afternoon"

    # Evening: 17:00 to 21:59
    assert get_time_of_day_greeting(17) == "Good evening"
    assert get_time_of_day_greeting(21) == "Good evening"

    # Night / late hours: 22:00 to 4:59
    assert get_time_of_day_greeting(22) == "Hello"
    assert get_time_of_day_greeting(2) == "Hello"


def test_personalized_salutations():
    # Salutation with individual contact name
    sal_name = generate_personalized_salutation(name="Vikram Chatterjee", hour=9)
    assert sal_name == "Good morning, Vikram!"

    # Salutation with company name only
    sal_comp = generate_personalized_salutation(name="", company_name="Darjeeling Boutique Cafe", hour=14)
    assert sal_comp == "Good afternoon, team at Darjeeling Boutique Cafe!"

    # Generic fallback
    sal_gen = generate_personalized_salutation(hour=19)
    assert sal_gen == "Good evening!"
