"""LLM provider factory.

Uses litellm (via LangChain's ChatLiteLLM wrapper) for provider-agnostic access.
litellm routes to Ollama, Anthropic, OpenAI, etc. based on the model-string prefix.
"""

from __future__ import annotations

from config import LLMConfig, get_llm_config


def get_litellm_model_string(config: LLMConfig) -> str:
    """Map a meShop config to a litellm model string."""
    if config.provider == "ollama":
        # e.g. "ollama/gemma3:4b"
        return f"ollama/{config.model}"
    # Cloud: the model already carries its provider prefix,
    # e.g. "anthropic/claude-3-haiku" or "gpt-4o".
    return config.model


def create_chat_model(config: LLMConfig | None = None):
    """Return a streaming ChatLiteLLM, or None when the provider is disabled."""
    config = config or get_llm_config()
    if config.provider == "none":
        return None

    # ChatLiteLLM moved from langchain-community (now sunset) to the standalone
    # langchain-litellm package. Prefer the new location, fall back for older envs.
    try:
        from langchain_litellm import ChatLiteLLM
    except ImportError:  # pragma: no cover - legacy fallback
        from langchain_community.chat_models import ChatLiteLLM

    model_string = get_litellm_model_string(config)

    return ChatLiteLLM(
        model=model_string,
        # Ollama needs an explicit api_base; cloud providers infer it.
        api_base=_ollama_api_base(config) if config.provider == "ollama" else None,
        api_key=config.api_key or "not-needed",
        streaming=True,
    )


def _ollama_api_base(config: LLMConfig) -> str:
    """Normalize the Ollama base URL for litellm's native `ollama/` provider.

    litellm appends its own path (e.g. `/api/chat`) to this base, so it must be
    the Ollama root (http://host:11434) — NOT the OpenAI-compat `/v1` endpoint.
    We accept either form and strip a trailing `/v1` so both work.
    """
    base = config.base_url.rstrip("/")
    if base.endswith("/v1"):
        base = base[: -len("/v1")].rstrip("/")
    return base
