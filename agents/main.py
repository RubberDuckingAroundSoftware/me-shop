"""meShop agent service — FastAPI entrypoint.

Endpoints:
  GET  /health   — health check + LLM connectivity
  POST /chat     — streaming chat via the Rubber Duck agent graph (SSE)
  GET  /config   — current LLM config
  PUT  /config   — update LLM config (in-process env override)
"""

from __future__ import annotations

import json
import os
import uuid

from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from sse_starlette.sse import EventSourceResponse

from agents.rubber_duck_agent import build_system_prompt
from config import get_llm_config
from graphs.product_extractor import extractor_graph
from graphs.recipe_extractor import recipe_extractor_graph
from graphs.rubber_duck import build_rubber_duck_graph
from llm import create_chat_model, get_litellm_model_string
from models import (
    ChatRequest,
    ExtractRecipeRequest,
    ExtractRecipeResponse,
    ExtractRequest,
    ExtractResponse,
    HealthResponse,
    LLMConfigModel,
)

app = FastAPI(title="meShop Agents", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _to_lc_messages(system: str, messages):
    lc = [SystemMessage(content=system)]
    for m in messages:
        if m.role == "user":
            lc.append(HumanMessage(content=m.content))
        elif m.role == "assistant":
            lc.append(AIMessage(content=m.content))
        elif m.role == "system":
            lc.append(SystemMessage(content=m.content))
    return lc


@app.get("/health", response_model=HealthResponse)
def health(user_id: str | None = None) -> HealthResponse:
    config = get_llm_config(user_id)
    if config.provider == "none":
        return HealthResponse(
            status="ok",
            provider="none",
            model=config.model,
            llm="disabled",
            detail="No provider configured.",
        )

    # Attempt a tiny completion to confirm connectivity.
    try:
        model = create_chat_model(config)
        model.invoke([HumanMessage(content="ping")])
        return HealthResponse(
            status="ok",
            provider=config.provider,
            model=config.model,
            llm="reachable",
        )
    except Exception as exc:  # noqa: BLE001 — surface any provider error
        return HealthResponse(
            status="degraded",
            provider=config.provider,
            model=config.model,
            llm="unreachable",
            detail=_friendly_error(str(exc), config),
        )


@app.post("/chat")
async def chat(req: ChatRequest):
    config = get_llm_config(req.user_id)

    if config.provider == "none":
        return _sse_error(
            "no_provider",
            "Connect an LLM to start chatting. Head to Settings to set up "
            "Ollama or a cloud provider.",
        )

    model = create_chat_model(config)
    if model is None:
        return _sse_error("no_provider", "No LLM provider configured.")

    graph = build_rubber_duck_graph(model)
    system_prompt = build_system_prompt(req.project_context)
    lc_messages = _to_lc_messages(system_prompt, req.messages)

    # Fresh thread per request: the client sends full history, so we treat each
    # call statelessly while still exercising the checkpointed graph.
    thread_id = req.thread_id or f"thread_{uuid.uuid4().hex}"
    graph_config = {"configurable": {"thread_id": f"{thread_id}:{uuid.uuid4().hex}"}}

    async def event_stream():
        assembled = ""
        try:
            async for event in graph.astream_events(
                {"messages": lc_messages},
                config=graph_config,
                version="v2",
            ):
                if event["event"] == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    token = getattr(chunk, "content", "") or ""
                    if token:
                        assembled += token
                        yield {"data": json.dumps({"type": "token", "content": token})}
            yield {"data": json.dumps({"type": "done", "content": assembled})}
        except Exception as exc:  # noqa: BLE001
            yield {
                "data": json.dumps(
                    {
                        "type": "error",
                        "code": "llm_error",
                        "content": _friendly_error(str(exc), config),
                    }
                )
            }

    return EventSourceResponse(event_stream())


@app.post("/extract", response_model=ExtractResponse)
async def extract_product(request: ExtractRequest) -> ExtractResponse:
    # Validate URL format up front (400 for malformed input).
    parsed = urlparse(request.url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(status_code=400, detail="Invalid URL")

    # Invoke the Product Extractor graph — all orchestration lives in the graph.
    result = await extractor_graph.ainvoke(
        {
            "url": request.url,
            "scenario_id": request.scenario_id,
            "scenario_fields": request.scenario_fields,
            "user_id": request.user_id,
        }
    )

    # Fetch/processing errors surface as 422 (unreachable, too large, blocked, ...).
    if result.get("error"):
        raise HTTPException(status_code=422, detail=result["error"])

    return ExtractResponse(
        product=result["product"],
        extraction_method=result.get("extraction_method", "structured_data"),
        raw_extracted=result.get("extracted", {}),
        source_url=result.get("final_url", request.url),
    )


@app.post("/extract-recipe", response_model=ExtractRecipeResponse)
async def extract_recipe(request: ExtractRecipeRequest) -> ExtractRecipeResponse:
    # For URL sources, validate the URL format up front (400 for malformed input).
    if request.source == "url":
        parsed = urlparse(request.url or "")
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise HTTPException(status_code=400, detail="Invalid URL")

    # Invoke the Recipe Extractor graph — all orchestration lives in the graph.
    result = await recipe_extractor_graph.ainvoke(
        {
            "source": request.source,
            "url": request.url,
            "text": request.text,
        }
    )

    # Fetch/processing errors surface as 422 (unreachable, too large, blocked, ...).
    if result.get("error"):
        raise HTTPException(status_code=422, detail=result["error"])

    return ExtractRecipeResponse(
        recipe=result["recipe"],
        extraction_method=result.get("extraction_method", "structured_data"),
        raw_extracted=result.get("extracted", {}),
        source_url=result.get("final_url", ""),
    )


@app.get("/config", response_model=LLMConfigModel)
def get_config() -> LLMConfigModel:
    config = get_llm_config()
    return LLMConfigModel(
        provider=config.provider,
        base_url=config.base_url,
        api_key=config.api_key,
        model=config.model,
    )


@app.put("/config", response_model=LLMConfigModel)
def put_config(body: LLMConfigModel) -> LLMConfigModel:
    # The database (written by the Next.js side) is the source of truth, but we
    # also mirror into the process env so this instance reflects changes without
    # a restart even before the DB row updates.
    os.environ["LLM_PROVIDER"] = body.provider
    os.environ["LLM_BASE_URL"] = body.base_url
    os.environ["LLM_API_KEY"] = body.api_key or ""
    os.environ["LLM_MODEL"] = body.model
    return body


def _sse_error(code: str, message: str) -> EventSourceResponse:
    async def gen():
        yield {"data": json.dumps({"type": "error", "code": code, "content": message})}

    return EventSourceResponse(gen())


def _friendly_error(raw: str, config) -> str:
    """Translate common provider errors into actionable messages.

    Order matters: check specific 404 / missing-model / auth cases before the
    broad connection heuristic, otherwise a "404 page not found" gets mislabeled
    as "Ollama is down".
    """
    low = raw.lower()

    # A missing model reports as "model not found" / "no such model".
    if "no such model" in low or "not found, try pulling" in low or (
        "model" in low and "not found" in low
    ):
        return (
            f"Model '{config.model}' isn't pulled. Run `ollama pull {config.model}`, "
            f"or pick an installed model in Settings."
        )

    # A raw 404 (with Ollama) means the request hit the wrong endpoint/URL.
    if "404" in low or "page not found" in low:
        if config.provider == "ollama":
            return (
                f"Ollama returned 404 for model '{config.model}'. Either the model "
                f"isn't pulled (`ollama pull {config.model}`) or the Base URL is wrong "
                f"(use http://localhost:11434)."
            )
        return "Provider returned 404. Check the model name and Base URL in Settings."

    if "api key" in low or "authentication" in low or "401" in low or "unauthorized" in low:
        return "Authentication failed. Check your API key in Settings."

    # Genuine connectivity failures.
    if (
        "connection refused" in low
        or "refused" in low
        or "max retries" in low
        or "failed to establish" in low
        or "connection error" in low
        or "timed out" in low
        or "timeout" in low
    ):
        if config.provider == "ollama":
            return "Can't reach Ollama. Make sure it's running with `ollama serve`"
        return "Can't reach the LLM provider. Check the base URL and network."

    return raw


@app.exception_handler(Exception)
async def unhandled(_request, exc: Exception):  # noqa: ANN001
    return JSONResponse(status_code=500, content={"error": str(exc)})
