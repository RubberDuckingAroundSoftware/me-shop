"""LLM configuration resolution.

Reads config from the shared SQLite `llm_config` table when available, falling
back to environment variables (loaded from the repo-root .env.local).
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# .env.local lives one directory up (the Next.js project root).
_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env.local")


@dataclass
class LLMConfig:
    provider: str  # "ollama" | "cloud" | "none"
    base_url: str
    api_key: str | None
    model: str


def _env_config() -> LLMConfig:
    return LLMConfig(
        provider=os.getenv("LLM_PROVIDER", "ollama"),
        base_url=os.getenv("LLM_BASE_URL", "http://localhost:11434/v1"),
        api_key=os.getenv("LLM_API_KEY") or None,
        model=os.getenv("LLM_MODEL", "gemma3:4b"),
    )


def get_llm_config(user_id: str | None = None) -> LLMConfig:
    """Return the effective config, preferring the DB row over env defaults.

    Pass a user_id to resolve that user's per-user config.
    """
    from db import read_llm_config

    row = read_llm_config(user_id)
    if row is not None:
        return LLMConfig(
            provider=row["provider"],
            base_url=row["base_url"],
            api_key=row["api_key"] or None,
            model=row["model"],
        )
    return _env_config()


def database_path() -> Path:
    """Absolute path to the shared SQLite database."""
    raw = os.getenv("DATABASE_PATH", "./db/meshop.db")
    p = Path(raw)
    if not p.is_absolute():
        p = _ROOT / p
    return p
