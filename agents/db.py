"""Read-only access to the shared meShop SQLite database.

The Node.js side owns writes; the agent service only needs to read the LLM
config (and, in future, project/product data for richer context).
"""

from __future__ import annotations

import sqlite3
from typing import Any

from config import database_path


def _connect() -> sqlite3.Connection | None:
    path = database_path()
    if not path.exists():
        return None
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    return conn


def read_llm_config(user_id: str | None = None) -> dict[str, Any] | None:
    """Return an llm_config row as a dict, or None if unavailable.

    With a user_id, returns that user's config. Without one, returns any row
    (useful for a generic health check before a user context exists).
    """
    conn = _connect()
    if conn is None:
        return None
    try:
        if user_id is not None:
            cur = conn.execute(
                "SELECT * FROM llm_config WHERE user_id = ?", (user_id,)
            )
        else:
            cur = conn.execute("SELECT * FROM llm_config LIMIT 1")
        row = cur.fetchone()
        return dict(row) if row else None
    except sqlite3.Error:
        return None
    finally:
        conn.close()
