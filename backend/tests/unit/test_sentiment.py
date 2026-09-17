"""
Unit tests for customer sentiment and urgency analyzer.
"""

from app.agent.sentiment import analyze_sentiment, SentimentScore


def test_positive_sentiment():
    result = analyze_sentiment("The tea samples are great! We are interested and ready to buy.")
    assert result.sentiment == SentimentScore.POSITIVE
    assert result.urgency_level >= 2
    assert "great" in result.detected_keywords
    assert not result.requires_human_escalation


def test_negative_sentiment_and_escalation():
    result = analyze_sentiment("The previous shipment was delayed and the quality was terrible. Unacceptable!")
    assert result.sentiment == SentimentScore.NEGATIVE
    assert result.requires_human_escalation is True
    assert "terrible" in result.detected_keywords
    assert "unacceptable" in result.detected_keywords


def test_urgent_inquiry():
    result = analyze_sentiment("Our cafe is running out of stock! Need 200kg delivered urgently asap today.")
    assert result.sentiment == SentimentScore.URGENT
    assert result.urgency_level >= 4
    assert result.requires_human_escalation is True


def test_neutral_inquiry():
    result = analyze_sentiment("What is the packaging size for the CTC Premium Grade?")
    assert result.sentiment == SentimentScore.NEUTRAL
    assert result.urgency_level == 1
    assert not result.requires_human_escalation
