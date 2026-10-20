"""Runtime settings, read from the environment once at startup."""

from __future__ import annotations

import os
import secrets
from dataclasses import dataclass, field
from pathlib import Path

KEYS_DIR = Path(os.environ.get("DOAIDE_KEYS_DIR", "/Users/dev/projects/keys"))


def _read_secret(env_name: str, *files: str) -> str:
    """Return a secret from `env_name`, or else from the first readable key file."""
    value = os.environ.get(env_name, "").strip()
    if value:
        return value
    file_override = os.environ.get(f"{env_name}_FILE")
    candidates = [Path(file_override)] if file_override else [KEYS_DIR / name for name in files]
    for path in candidates:
        try:
            text = path.read_text().strip()
        except OSError:
            continue
        if text:
            return text
    return ""


def _flag(name: str, default: bool = False) -> bool:
    return os.environ.get(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


@dataclass
class Settings:
    # "local": this machine runs the executors (laptop). "hub": sync server only; prompts are
    # relayed to the owner's laptop agent and no model runs here.
    mode: str = field(default_factory=lambda: os.environ.get("DOAIDE_MODE", "local").strip().lower())
    # Laptop agent: the hub socket to connect to and the agent token issued by the hub.
    hub_url: str = field(default_factory=lambda: os.environ.get("DOAIDE_HUB_URL", "wss://code.doaide.com/agent"))
    hub_token: str = field(default_factory=lambda: os.environ.get("DOAIDE_HUB_TOKEN", "").strip())
    host: str = field(default_factory=lambda: os.environ.get("DOAIDE_HOST", "127.0.0.1"))
    port: int = field(default_factory=lambda: int(os.environ.get("DOAIDE_PORT", "3097")))
    db_path: Path = field(
        default_factory=lambda: Path(os.environ.get("DOAIDE_DB", str(Path.home() / ".doaide-code" / "doaide.db")))
    )
    frontend_dist: Path = field(
        default_factory=lambda: Path(
            os.environ.get("DOAIDE_FRONTEND_DIST", str(Path(__file__).resolve().parents[2] / "frontend" / "dist"))
        )
    )

    ollama_url: str = field(default_factory=lambda: os.environ.get("OLLAMA_URL", "http://localhost:11434"))
    ollama_model: str = field(default_factory=lambda: os.environ.get("DOAIDE_OLLAMA_MODEL", "qwen3-coder"))

    claude_bin: str = field(default_factory=lambda: os.environ.get("DOAIDE_CLAUDE_BIN", "claude"))
    claude_haiku_model: str = field(default_factory=lambda: os.environ.get("DOAIDE_CLAUDE_HAIKU_MODEL", "haiku"))
    claude_sonnet_model: str = field(
        default_factory=lambda: os.environ.get("DOAIDE_CLAUDE_SONNET_MODEL", "claude-sonnet-4-5-20250514")
    )
    claude_opus_model: str = field(default_factory=lambda: os.environ.get("DOAIDE_CLAUDE_OPUS_MODEL", "opus"))

    codex_bin: str = field(default_factory=lambda: os.environ.get("DOAIDE_CODEX_BIN", "codex"))
    codex_model: str = field(default_factory=lambda: os.environ.get("DOAIDE_CODEX_MODEL", "o4-mini"))

    # Default workspace on the laptop; `/workspace <path>` overrides it in the local database.
    workspace: str = field(default_factory=lambda: os.environ.get("DOAIDE_WORKSPACE", "~/doaide-code-workspace"))

    cli_timeout: float = field(default_factory=lambda: float(os.environ.get("DOAIDE_CLI_TIMEOUT", "600")))

    gemini_api_key: str = field(default_factory=lambda: _read_secret("GEMINI_API_KEY", "gemini_api_key.txt", "gemini_api_key"))
    gemini_model: str = field(default_factory=lambda: os.environ.get("DOAIDE_GEMINI_MODEL", "gemini-3.5-flash-lite"))
    typesafe_api_key: str = field(default_factory=lambda: _read_secret("TYPESAFE_API_KEY", "typesafe_api_key.txt"))

    jwt_secret: str = field(default_factory=lambda: os.environ.get("DOAIDE_JWT_SECRET", "") or secrets.token_urlsafe(48))
    # Access tokens are short-lived; the browser renews them with its never-expiring refresh token.
    jwt_ttl_seconds: int = field(default_factory=lambda: int(os.environ.get("DOAIDE_JWT_TTL", str(24 * 3600))))
    google_client_id: str = field(default_factory=lambda: os.environ.get("GOOGLE_CLIENT_ID", ""))
    allowed_emails: frozenset[str] = field(
        default_factory=lambda: frozenset(
            e.strip().lower() for e in os.environ.get("DOAIDE_ALLOWED_EMAILS", "").split(",") if e.strip()
        )
    )
    # Identity for loopback (desktop) sessions; set it to your Google email so phone and desktop share chats.
    owner_email: str = field(default_factory=lambda: os.environ.get("DOAIDE_OWNER_EMAIL", "local").strip().lower())
    # When false, loopback clients may get a token without Google SSO (single-user desktop use).
    require_sso: bool = field(default_factory=lambda: _flag("DOAIDE_REQUIRE_SSO"))
    # Heuristic-only routing: skips Jev and Gemini calls (used by tests and offline use).
    offline_router: bool = field(default_factory=lambda: _flag("DOAIDE_OFFLINE_ROUTER"))

    @property
    def is_hub(self) -> bool:
        return self.mode == "hub"
