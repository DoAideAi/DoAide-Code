"""Runtime settings, read from the environment once at startup."""

from __future__ import annotations

import os
import secrets
from dataclasses import dataclass, field
from pathlib import Path

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
    # The laptop agent also serves the app locally on host:port (see agent.py); 0 turns that off.
    local_ui: bool = field(default_factory=lambda: os.environ.get("DOAIDE_LOCAL_UI", "1").strip() != "0")
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
    # Tier 1 (explain, small edits, debugging): empty picks the largest installed coder model that
    # fits in 40% of memory (qwen2.5-coder:32b on a 96 GB Mac).
    ollama_coder_model: str = field(default_factory=lambda: os.environ.get("DOAIDE_OLLAMA_CODER_MODEL", "").strip())
    ollama_bin: str = field(default_factory=lambda: os.environ.get("DOAIDE_OLLAMA_BIN", "ollama"))

    claude_bin: str = field(default_factory=lambda: os.environ.get("DOAIDE_CLAUDE_BIN", "claude"))
    claude_haiku_model: str = field(default_factory=lambda: os.environ.get("DOAIDE_CLAUDE_HAIKU_MODEL", "haiku"))
    claude_sonnet_model: str = field(
        default_factory=lambda: os.environ.get("DOAIDE_CLAUDE_SONNET_MODEL", "sonnet")
    )
    claude_opus_model: str = field(default_factory=lambda: os.environ.get("DOAIDE_CLAUDE_OPUS_MODEL", "opus"))

    codex_bin: str = field(default_factory=lambda: os.environ.get("DOAIDE_CODEX_BIN", "codex"))
    # Empty: Codex uses the model in its own config.toml. With a ChatGPT login Codex rejects most
    # `--model` names (o4-mini, o3 and gpt-4o all fail), so the user's own setting is the safe default.
    codex_model: str = field(default_factory=lambda: os.environ.get("DOAIDE_CODEX_MODEL", "").strip())
    # Extra Codex models listed as installed, e.g. "o3,gpt-4o" on an API-key login.
    codex_models: tuple[str, ...] = field(
        default_factory=lambda: tuple(
            m.strip() for m in os.environ.get("DOAIDE_CODEX_MODELS", "").split(",") if m.strip()
        )
    )
    codex_home: Path = field(
        default_factory=lambda: Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex"))).expanduser()
    )

    # Default workspace on the laptop; `/workspace <path>` overrides it in the local database.
    workspace: str = field(default_factory=lambda: os.environ.get("DOAIDE_WORKSPACE", "~/doaide-code-workspace"))

    # Seconds a cached answer stays valid (0 disables the response cache).
    cache_ttl: float = field(default_factory=lambda: float(os.environ.get("DOAIDE_CACHE_TTL", str(24 * 3600))))

    cli_timeout: float = field(default_factory=lambda: float(os.environ.get("DOAIDE_CLI_TIMEOUT", "600")))

    # Switches that drop the subscription CLIs from the executor list.
    use_claude_cli: bool = field(default_factory=lambda: not _flag("DOAIDE_DISABLE_CLAUDE_CLI"))
    use_codex_cli: bool = field(default_factory=lambda: not _flag("DOAIDE_DISABLE_CODEX_CLI"))

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
    # Kept for compatibility: routing is always local heuristics now (no API calls).
    offline_router: bool = field(default_factory=lambda: _flag("DOAIDE_OFFLINE_ROUTER"))

    # The free code tools (codetools.py) on the public site: a server-side Gemini key, never sent
    # to the browser. Empty turns the tools off.
    gemini_api_key: str = field(default_factory=lambda: os.environ.get("GEMINI_API_KEY", "").strip())
    gemini_model: str = field(default_factory=lambda: os.environ.get("DOAIDE_GEMINI_MODEL", "gemini-2.5-flash").strip())

    @property
    def is_hub(self) -> bool:
        return self.mode == "hub"
