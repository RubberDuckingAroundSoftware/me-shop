"""Shared LangGraph utilities.

Kept intentionally small in v1. As more agents are added, common state shapes,
nodes, and edges live here.
"""

from __future__ import annotations

from langgraph.checkpoint.memory import MemorySaver

# A process-wide in-memory checkpointer. Upgradeable to SqliteSaver /
# PostgresSaver without touching graph definitions.
_shared_memory = MemorySaver()


def get_checkpointer() -> MemorySaver:
    return _shared_memory
