"""
Unit tests for Meta WhatsApp webhook signature verification.
"""

from app.whatsapp.security import verify_meta_signature, generate_meta_signature


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
