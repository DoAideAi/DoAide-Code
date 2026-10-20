from __future__ import annotations

import time

import httpx
import jwt
import pytest

from doaide_code.auth import AuthError, User, bearer, issue_token, verify_google_credential, verify_token


def test_token_round_trip(settings):
    token = issue_token(settings, User(email="a@b.c", name="A"))
    assert verify_token(settings, token) == User(email="a@b.c", name="A")


def test_rejects_missing_tampered_and_expired_tokens(settings):
    with pytest.raises(AuthError):
        verify_token(settings, None)
    with pytest.raises(AuthError):
        verify_token(settings, issue_token(settings, User("a@b.c")) + "x")
    expired = jwt.encode({"sub": "a@b.c", "exp": int(time.time()) - 10}, settings.jwt_secret, algorithm="HS256")
    with pytest.raises(AuthError, match="expired"):
        verify_token(settings, expired)
    other = jwt.encode({"sub": "a@b.c", "exp": int(time.time()) + 60}, "another-secret-" + "y" * 32, algorithm="HS256")
    with pytest.raises(AuthError):
        verify_token(settings, other)


def test_bearer():
    assert bearer("Bearer abc") == "abc"
    assert bearer("Basic abc") is None and bearer(None) is None


def google(info: dict, status: int = 200) -> httpx.MockTransport:
    return httpx.MockTransport(lambda request: httpx.Response(status, json=info))


def good_info(**overrides) -> dict:
    info = {
        "aud": "client-1",
        "iss": "https://accounts.google.com",
        "exp": str(int(time.time()) + 600),
        "email": "Me@Example.com",
        "email_verified": "true",
        "name": "Me",
    }
    return info | overrides


@pytest.mark.anyio
async def test_google_credential_accepted(settings):
    settings.google_client_id = "client-1"
    user = await verify_google_credential(settings, "cred", transport=google(good_info()))
    assert user == User(email="me@example.com", name="Me")


@pytest.mark.anyio
@pytest.mark.parametrize(
    "info",
    [good_info(aud="other"), good_info(iss="evil.com"), good_info(email_verified="false"), good_info(exp="1")],
)
async def test_google_credential_rejected(settings, info):
    settings.google_client_id = "client-1"
    with pytest.raises(AuthError):
        await verify_google_credential(settings, "cred", transport=google(info))


@pytest.mark.anyio
async def test_google_allowlist_and_unconfigured(settings):
    with pytest.raises(AuthError, match="not configured"):
        await verify_google_credential(settings, "cred", transport=google(good_info()))
    settings.google_client_id = "client-1"
    settings.allowed_emails = frozenset({"someone@else.com"})
    with pytest.raises(AuthError, match="not allowed"):
        await verify_google_credential(settings, "cred", transport=google(good_info()))
