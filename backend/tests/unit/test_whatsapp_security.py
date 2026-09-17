"""
Unit tests for Meta WhatsApp webhook signature verification.
"""

from app.whatsapp.security import verify_meta_signature, generate_meta_signature, validate_whatsapp_template


def test_valid_meta_signature():
    secret = "super-secret-app-key-123"
    payload = b'{"object": "whatsapp_business_account", "entry": []}'

    signature = generate_meta_signature(payload, secret)
    assert signature.startswith("sha256=")

    assert verify_meta_signature(payload, signature, secret) is True


def test_invalid_signature_and_tampered_payload():
    secret = "super-secret-app-key-123"
    payload = b'{"object": "whatsapp_business_account"}'
    tampered = b'{"object": "whatsapp_business_account", "malicious": true}'

    valid_sig = generate_meta_signature(payload, secret)
    # Tampered payload must fail
    assert verify_meta_signature(tampered, valid_sig, secret) is False

    # Wrong secret must fail
    assert verify_meta_signature(payload, valid_sig, "wrong-secret") is False


def test_malformed_signature_headers():
    secret = "secret"
    payload = b"test"

    assert verify_meta_signature(payload, None, secret) is False
    assert verify_meta_signature(payload, "", secret) is False
    assert verify_meta_signature(payload, "invalid_no_prefix", secret) is False
    assert verify_meta_signature(payload, "sha256=", secret) is False


def test_validate_whatsapp_template():
    # Valid templates
    ok, err = validate_whatsapp_template("sample_welcome_1", "en_US")
    assert ok is True
    assert err is None

    ok, err = validate_whatsapp_template(
        "order_confirm",
        "en",
        components=[{"type": "HEADER"}, {"type": "BODY"}]
    )
    assert ok is True
    assert err is None

    # Invalid template names
    ok, err = validate_whatsapp_template("Sample Welcome!", "en")
    assert ok is False
    assert "lowercase alphanumeric" in err

    # Invalid language code
    ok, err = validate_whatsapp_template("sample_welcome", "invalid_long_code")
    assert ok is False
    assert "ISO" in err

    # Invalid component structure
    ok, err = validate_whatsapp_template("sample_welcome", "en", components=["not_dict"])
    assert ok is False
    assert "dictionary" in err

