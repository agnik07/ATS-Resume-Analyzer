import pytest
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hashing():
    raw = "SecurePassword123!"
    hashed = hash_password(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_access_and_refresh_tokens():
    user_id = "user-uuid-12345"
    role = "recruiter"

    access_token = create_access_token(subject=user_id, role=role)
    refresh_token = create_refresh_token(subject=user_id)

    # Decode access token
    access_payload = decode_token(access_token, is_refresh=False)
    assert access_payload["sub"] == user_id
    assert access_payload["role"] == role
    assert access_payload["type"] == "access"

    # Decode refresh token
    refresh_payload = decode_token(refresh_token, is_refresh=True)
    assert refresh_payload["sub"] == user_id
    assert refresh_payload["type"] == "refresh"
