"""
Unit tests for multi-currency conversion and international monetary formatting.
"""

import pytest
from app.pricing.currency import (
    SUPPORTED_CURRENCIES,
    convert_currency,
    format_international_currency,
)


def test_supported_currencies():
    assert "INR" in SUPPORTED_CURRENCIES
    assert "USD" in SUPPORTED_CURRENCIES
    assert "EUR" in SUPPORTED_CURRENCIES
    assert "AED" in SUPPORTED_CURRENCIES
    assert SUPPORTED_CURRENCIES["USD"]["symbol"] == "$"
    assert SUPPORTED_CURRENCIES["INR"]["symbol"] == "₹"


def test_currency_conversion():
    # Identity
    assert convert_currency(100.0, "INR", "INR") == 100.0
    assert convert_currency(50.0, "USD", "USD") == 50.0

    # INR to USD (10,000 INR * 0.012 = 120.0 USD)
    assert convert_currency(10000.0, "INR", "USD") == 120.0

    # USD to INR (120 USD / 0.012 = 10,000 INR)
    assert convert_currency(120.0, "USD", "INR") == 10000.0

    # Error handling for unsupported currency
    with pytest.raises(ValueError):
        convert_currency(100.0, "XYZ", "USD")


def test_international_formatting():
    # Indian numbering (₹1,50,000.00)
    assert format_international_currency(150000.0, "INR") == "₹1,50,000.00"

    # US / International numbering ($150,000.00)
    assert format_international_currency(150000.0, "USD") == "$150,000.00"

    # Euro (€5,432.50)
    assert format_international_currency(5432.50, "EUR") == "€5,432.50"

    # Negative amount (-$500.00)
    assert format_international_currency(-500.0, "USD") == "-$500.00"
