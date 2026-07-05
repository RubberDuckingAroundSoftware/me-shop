"""Product Extractor LangGraph graph.

The second graph in meShop, alongside the Rubber Duck. The extraction pipeline
is a StateGraph where each step is a node and the gap-check is a conditional edge:

    START → fetch → extract_structured → has_gaps?
                                          ├── no  → map_structured_only → END
                                          └── yes → llm_extract → map_after_llm → END

Stateless: each invocation is a one-shot pipeline (no checkpointer, no threads).
"""

from __future__ import annotations

import json
from typing import Literal, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

from config import get_llm_config
from extractors.fetcher import clean_html_for_llm, fetch_page
from extractors.mapper import map_to_product
from extractors.structured_data import extract_structured_data
from llm import create_chat_model


# --- State ---


class ExtractionState(TypedDict, total=False):
    # Input
    url: str
    scenario_id: str
    scenario_fields: list[dict]
    user_id: Optional[str]

    # Intermediate
    html: str
    final_url: str
    cleaned_content: str
    structured_data: dict
    llm_data: dict
    has_gaps: bool
    llm_available: bool

    # Output
    extracted: dict
    product: dict
    extraction_method: str  # "structured_data" | "structured_data+llm" | "llm_only"
    error: Optional[str]


# --- Nodes ---


async def fetch_node(state: ExtractionState) -> dict:
    """Fetch the URL and return raw HTML + cleaned text."""
    try:
        page = await fetch_page(state["url"])
        return {
            "html": page["html"],
            "final_url": page["url"],
            "cleaned_content": clean_html_for_llm(page["html"]),
            "error": None,
        }
    except Exception as e:  # noqa: BLE001 — surfaced to the caller as a fetch error
        return {
            "html": "",
            "final_url": state["url"],
            "cleaned_content": "",
            "error": str(e),
        }


def extract_structured_node(state: ExtractionState) -> dict:
    """Pass 1: extract product data from JSON-LD, OpenGraph, meta tags."""
    if state.get("error"):
        return {"structured_data": {}, "has_gaps": True, "llm_available": False}

    structured = extract_structured_data(state["html"])
    core_fields_present = all(structured.get(f) for f in ["name", "price"])

    config = get_llm_config(state.get("user_id"))
    llm_available = config.provider != "none"

    return {
        "structured_data": structured,
        "has_gaps": not core_fields_present,
        "llm_available": llm_available,
    }


def llm_extract_node(state: ExtractionState) -> dict:
    """Pass 2: use the LLM to extract data from cleaned page content."""
    config = get_llm_config(state.get("user_id"))
    llm = create_chat_model(config)
    if llm is None:
        return {"llm_data": {}, "extraction_method": "structured_data"}

    fields_desc = "\n".join(
        f"- {f['key']} ({f['type']}): {f['label']}"
        for f in state.get("scenario_fields", [])
    )

    common_fields = """- name (text): Product name
- description (text): Product description
- price (number): Price as a number
- currency (text): Currency code (USD, EUR, RON, etc.)
- image (text): Main product image URL
- brand (text): Brand name
- seller (text): Store or seller name"""

    prompt = f"""You are a product data extractor. Given the text content of a product page
and a target schema, extract the product information into a structured JSON object.

Target schema fields:
{common_fields}
{fields_desc}

Rules:
- Return ONLY valid JSON, no markdown fences, no explanation.
- Use null for fields you cannot determine from the page content.
- For price, return a number (not a string). Separate currency into its own field.
- For tags or categories, return an array of strings.
- Be precise — do not invent data that isn't on the page.

Page content:
{state.get('cleaned_content', '')}

Source URL: {state['url']}"""

    try:
        response = llm.invoke(prompt)
        content = response.content.strip()

        # Strip markdown fences if present
        if content.startswith("```"):
            content = content.split("\n", 1)[1]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

        llm_data = json.loads(content)

        has_structured = bool(state.get("structured_data", {}).get("name"))
        method = "structured_data+llm" if has_structured else "llm_only"

        return {"llm_data": llm_data, "extraction_method": method}

    except Exception as e:  # noqa: BLE001 — fall back to structured data on any LLM failure
        print(f"LLM extraction failed: {e}")
        return {"llm_data": {}, "extraction_method": "structured_data"}


def map_node(state: ExtractionState) -> dict:
    """Merge all extracted data and map to the product schema."""
    # Merge: structured data takes priority over LLM data.
    llm_data = state.get("llm_data", {})
    structured = state.get("structured_data", {})
    merged = {**llm_data, **{k: v for k, v in structured.items() if v is not None}}

    product = map_to_product(merged, state["scenario_id"], state["final_url"])
    method = state.get("extraction_method", "structured_data")

    return {"extracted": merged, "product": product, "extraction_method": method}


def map_structured_only_node(state: ExtractionState) -> dict:
    """Map structured data directly when no LLM pass is needed."""
    structured = state.get("structured_data", {})
    product = map_to_product(structured, state["scenario_id"], state["final_url"])

    return {
        "extracted": structured,
        "product": product,
        "extraction_method": "structured_data",
    }


# --- Conditional Edge ---


def should_use_llm(
    state: ExtractionState,
) -> Literal["llm_extract", "map_structured_only"]:
    """Route to LLM extraction if there are gaps and the LLM is available."""
    if state.get("error"):
        return "map_structured_only"
    if state.get("has_gaps") and state.get("llm_available"):
        return "llm_extract"
    return "map_structured_only"


# --- Graph Builder ---


def build_product_extractor_graph():
    """Build the Product Extractor LangGraph StateGraph."""
    graph = StateGraph(ExtractionState)

    graph.add_node("fetch", fetch_node)
    graph.add_node("extract_structured", extract_structured_node)
    graph.add_node("llm_extract", llm_extract_node)
    graph.add_node("map_after_llm", map_node)
    graph.add_node("map_structured_only", map_structured_only_node)

    graph.add_edge(START, "fetch")
    graph.add_edge("fetch", "extract_structured")

    graph.add_conditional_edges(
        "extract_structured",
        should_use_llm,
        {
            "llm_extract": "llm_extract",
            "map_structured_only": "map_structured_only",
        },
    )

    graph.add_edge("llm_extract", "map_after_llm")
    graph.add_edge("map_after_llm", END)
    graph.add_edge("map_structured_only", END)

    return graph.compile()


# --- Module-level singleton ---

extractor_graph = build_product_extractor_graph()
