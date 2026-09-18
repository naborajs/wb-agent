"""
Multi-Currency and International Pricing Utility.
Supports conversion and formatting across major global commercial trade currencies.
"""

from typing import Dict, Optional


SUPPORTED_CURRENCIES: Dict[str, Dict[str, str]] = {
    "INR": {"symbol": "₹", "name": "Indian Rupee", "locale": "en_IN"},
    "USD": {"symbol": "$", "name": "US Dollar", "locale": "en_US"},
    "EUR": {"symbol": "€", "name": "Euro", "locale": "de_DE"},
    "GBP": {"symbol": "£", "name": "British Pound", "locale": "en_GB"},
    "AED": {"symbol": "AED ", "name": "UAE Dirham", "locale": "ar_AE"},
    "SGD": {"symbol": "S$", "name": "Singapore Dollar", "locale": "en_SG"},
}

# Standard indicative exchange rates relative to INR base
_BASE_INR_EXCHANGE_RATES: Dict[str, float] = {
    "INR": 1.0,
    "USD": 0.012,     # 1 INR ≈ 0.012 USD (~83.3 INR/USD)
    "EUR": 0.011,     # 1 INR ≈ 0.011 EUR (~90.9 INR/EUR)
    "GBP": 0.0094,    # 1 INR ≈ 0.0094 GBP (~106.4 INR/GBP)
    "AED": 0.044,     # 1 INR ≈ 0.044 AED (~22.7 INR/AED)
    "SGD": 0.016,     # 1 INR ≈ 0.016 SGD (~62.5 INR/SGD)
}


def convert_currency(
    amount: float,
    from_currency: str = "INR",
    to_currency: str = "USD",
) -> float:
    """
    Converts monetary amount between supported trade currencies.
    """
    from_curr = from_currency.upper().strip()
    to_curr = to_currency.upper().strip()

    if from_curr not in _BASE_INR_EXCHANGE_RATES:
        raise ValueError(f"Unsupported source currency: {from_curr}")
    if to_curr not in _BASE_INR_EXCHANGE_RATES:
        raise ValueError(f"Unsupported target currency: {to_curr}")

    if from_curr == to_curr:
        return round(float(amount), 2)

    # Convert source -> INR base -> target
    amount_in_inr = float(amount) / _BASE_INR_EXCHANGE_RATES[from_curr]
    converted = amount_in_inr * _BASE_INR_EXCHANGE_RATES[to_curr]
    return round(converted, 2)


def format_international_currency(
    amount: float,
    currency_code: str = "INR",
) -> str:
    """
    Formats monetary amounts with standard international notation and currency symbol.
    """
    code = currency_code.upper().strip()
    meta = SUPPORTED_CURRENCIES.get(code, {"symbol": f"{code} "})
    symbol = meta["symbol"]

    val = round(float(amount), 2)
    is_negative = val < 0
    val = abs(val)

    if code == "INR":
        # Indian comma notation: 1,50,000.00
        parts = f"{val:.2f}".split(".")
        int_part, dec_part = parts[0], parts[1]
        if len(int_part) > 3:
            last_three = int_part[-3:]
            remaining = int_part[:-3]
            groups = []
            while len(remaining) > 2:
                groups.insert(0, remaining[-2:])
                remaining = remaining[:-2]
            if remaining:
                groups.insert(0, remaining)
            formatted_int = ",".join(groups) + "," + last_three
        else:
            formatted_int = int_part
    else:
        # Standard international thousands grouping: 150,000.00
        formatted_int = f"{int(val):,}"
        dec_part = f"{val:.2f}".split(".")[1]

    prefix = "-" if is_negative else ""
    return f"{prefix}{symbol}{formatted_int}.{dec_part}"
