"""JWT sessions plus Google Sign-In (ID token) verification."""

from __future__ import annotations

import time
from dataclasses import dataclass

import httpx
import jwt

from .config import Settings

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}
ALGORITHM = "HS256"


class AuthError(Exception):
    pass


@dataclass(frozen=True)
class User:
    email: str
    name: str = ""
    # "user" for browser sessions, "agent" for a laptop agent connected to the hub.
    scope: str = "user"


def issue_token(settings: Settings, user: User) -> str:
    now = int(time.time())
    ttl = settings.agent_ttl_seconds if user.scope == "agent" else settings.jwt_ttl_seconds
    claims = {"sub": user.email, "name": user.name, "scope": user.scope, "iat": now, "exp": now + ttl}
    return jwt.encode(claims, settings.jwt_secret, algorithm=ALGORITHM)


def verify_token(settings: Settings, token: str | None, scope: str = "user") -> User:
    if not token:
        raise AuthError("missing token")
    try:
        claims = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM], options={"require": ["sub", "exp"]})
    except jwt.PyJWTError as exc:
        raise AuthError(f"invalid token: {exc}") from exc
    if claims.get("scope", "user") != scope:
        raise AuthError(f"not a {scope} token")
    return User(email=claims["sub"], name=claims.get("name", ""), scope=scope)


def bearer(header: str | None) -> str | None:
    if header and header.lower().startswith("bearer "):
        return header[7:].strip()
    return None


async def verify_google_credential(
    settings: Settings, credential: str, *, transport: httpx.AsyncBaseTransport | None = None
) -> User:
    """Validate a Google Identity Services ID token and map it to a user."""
    if not settings.google_client_id:
        raise AuthError("Google sign-in is not configured")
    try:
        async with httpx.AsyncClient(timeout=10, transport=transport) as client:
            resp = await client.post(GOOGLE_TOKENINFO_URL, data={"id_token": credential})
    except httpx.HTTPError as exc:
        raise AuthError("could not reach Google") from exc
    if resp.status_code != 200:
        raise AuthError("Google rejected the credential")
    info = resp.json()
    if info.get("aud") != settings.google_client_id:
        raise AuthError("credential was issued for another app")
    if info.get("iss") not in GOOGLE_ISSUERS:
        raise AuthError("unexpected issuer")
    if int(info.get("exp", 0)) < time.time():
        raise AuthError("credential expired")
    if str(info.get("email_verified")).lower() != "true":
        raise AuthError("email is not verified")
    email = str(info.get("email", "")).lower()
    if settings.allowed_emails and email not in settings.allowed_emails:
        raise AuthError("this account is not allowed")
    return User(email=email, name=info.get("name", ""))


def is_loopback(host: str | None) -> bool:
    return host in {"127.0.0.1", "::1", "localhost"}
