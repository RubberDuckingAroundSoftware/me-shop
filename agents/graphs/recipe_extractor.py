"""Recipe Extractor LangGraph graph.

The third graph in meShop, alongside the Rubber Duck and Product Extractor.
Handles three input sources (url / text / file) that converge on the same
extract → map pipeline:

    START → route_by_source
              ├── url  → fetch → extract_structured → has_gaps?
              │                                         ├── no  → map_structured_only → END
              │                                         └── yes → llm_extract → map_after_llm → END
              └── text/file → prepare_text → llm_extract → map_after_llm → END

Stateless: each invocation is a one-shot pipeline (no checkpointer, no threads).
"""

from __future__ import annotations

import json
from typing import Literal, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

from config import get_llm_config
from extractors.fetcher import clean_html_for_llm, fetch_page
from extractors.recipe_mapper import map_to_recipe
from extractors.recipe_structured_data import extract_recipe_structured_data
from llm import create_chat_model


# --- State ---


class RecipeExtractionState(TypedDict, total=False):
    # Input — one of these will be populated based on source
    source: str  # "url" | "file" | "text"
    url: Optional[str]  # populated when source == "url"
    text: Optional[str]  # populated when source == "text" or "file" (extracted text)
    file_type: Optional[str]  # "image" | "pdf" | "text" for file uploads

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
    recipe: dict
    extraction_method: str  # "structured_data" | "structured_data+llm" | "llm_only"
    error: Optional[str]


# --- Nodes ---


async def fetch_node(state: RecipeExtractionState) -> dict:
    """Fetch the URL and return raw HTML. Only runs for source == 'url'."""
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
            "final_url": state.get("url", ""),
            "cleaned_content": "",
            "error": str(e),
        }


def extract_structured_node(state: RecipeExtractionState) -> dict:
    """Pass 1: Extract recipe from JSON-LD, OG, meta tags."""
    if state.get("error"):
        return {"structured_data": {}, "has_gaps": True, "llm_available": False}

    structured = extract_recipe_structured_data(state["html"])

    has_ingredients = bool(structured.get("ingredients"))
    has_instructions = bool(structured.get("instructions"))
    has_name = bool(structured.get("name"))
    core_complete = has_name and (has_ingredients or has_instructions)

    config = get_llm_config()
    llm_available = config.provider != "none"

    return {
        "structured_data": structured,
        "has_gaps": not core_complete,
        "llm_available": llm_available,
    }


def prepare_text_node(state: RecipeExtractionState) -> dict:
    """Prepare text/file content for LLM extraction (source == 'text' or 'file')."""
    config = get_llm_config()
    llm_available = config.provider != "none"

    text = state.get("text") or ""
    cleaned = text[:16000]  # truncate to ~4000 tokens

    return {
        "cleaned_content": cleaned,
        "structured_data": {},
        "has_gaps": True,  # text/file always needs LLM
        "llm_available": llm_available,
        "final_url": "",
    }


def llm_extract_node(state: RecipeExtractionState) -> dict:
    """Use LLM to extract recipe from page content, file text, or pasted text."""
    config = get_llm_config()
    llm = create_chat_model(config)
    if llm is None:
        return {"llm_data": {}, "extraction_method": "structured_data"}

    source = state.get("source", "url")
    content = state.get("cleaned_content", "")

    if source == "url":
        content_label = "Page content"
        source_line = f"\nSource URL: {state.get('url', '')}"
    elif source == "file":
        content_label = (
            "Content extracted from an uploaded file (may be OCR'd from an image)"
        )
        source_line = ""
    else:
        content_label = "Recipe text provided by the user"
        source_line = ""

    prompt = f"""You are a recipe data extractor. Given the following content,
extract the recipe into a structured JSON object.

Required fields:
- name (string): Recipe name, in the original language of the content
- description (string): Brief description
- servings (number): Number of servings
- prep_time (string): e.g. "20 min"
- cook_time (string): e.g. "90 min"
- ingredients (array of objects): Each with "name" (string) and "quantity" (string)
- instructions (array of strings): Step-by-step instructions
- cuisine (string, optional): e.g. "Romanian", "Italian"
- category (string, optional): e.g. "Soup", "Dessert"

Rules:
- Return ONLY valid JSON, no markdown fences, no explanation.
- PRESERVE the original language. Do NOT translate. A Romanian recipe stays in Romanian.
- For ingredients, separate quantity from name when possible.
  "600g carne de vită cu os" -> {{"name": "carne de vită cu os", "quantity": "600g"}}
  "sare" -> {{"name": "sare", "quantity": "to taste"}}
- Each instruction step is a separate string in the array.
- Use null for fields you cannot determine.
- Do not invent ingredients or steps not in the content.
- If the content contains multiple recipes, extract only the first/primary one.

{content_label}:
{content}
{source_line}"""

    try:
        response = llm.invoke(prompt)
        result = response.content.strip()

        # Strip markdown fences if present
        if result.startswith("```"):
            result = result.split("\n", 1)[1]
            if result.endswith("```"):
                result = result[:-3]
            result = result.strip()

        llm_data = json.loads(result)

        # Normalize ingredients
        if "ingredients" in llm_data and isinstance(llm_data["ingredients"], list):
            normalized = []
            for ing in llm_data["ingredients"]:
                if isinstance(ing, dict):
                    normalized.append(
                        {
                            "name": ing.get("name", ""),
                            "quantity": ing.get("quantity", ""),
                            "found": False,
                        }
                    )
                elif isinstance(ing, str):
                    normalized.append(
                        {"name": ing, "quantity": "", "found": False}
                    )
            llm_data["ingredients"] = normalized

        has_structured = bool(state.get("structured_data", {}).get("name"))

        if source in ("text", "file"):
            method = "llm_only"
        elif has_structured:
            method = "structured_data+llm"
        else:
            method = "llm_only"

        return {"llm_data": llm_data, "extraction_method": method}

    except Exception as e:  # noqa: BLE001 — fall back to structured data on any failure
        print(f"Recipe LLM extraction failed: {e}")
        return {"llm_data": {}, "extraction_method": "structured_data"}


def map_after_llm_node(state: RecipeExtractionState) -> dict:
    """Merge structured + LLM data and map to Recipe shape."""
    llm_data = state.get("llm_data", {})
    structured = state.get("structured_data", {})
    # Structured data takes priority over LLM data (same as Product Extractor).
    merged = {**llm_data, **{k: v for k, v in structured.items() if v is not None}}

    source_url = state.get("final_url", "") or state.get("url", "") or ""
    recipe = map_to_recipe(merged, source_url)

    return {
        "extracted": merged,
        "recipe": recipe,
        "extraction_method": state.get("extraction_method", "structured_data"),
    }


def map_structured_only_node(state: RecipeExtractionState) -> dict:
    """Map structured data directly when no LLM pass is needed."""
    structured = state.get("structured_data", {})
    source_url = state.get("final_url", "") or state.get("url", "") or ""
    recipe = map_to_recipe(structured, source_url)

    return {
        "extracted": structured,
        "recipe": recipe,
        "extraction_method": "structured_data",
    }


# --- Routing ---


def route_by_source(state: RecipeExtractionState) -> Literal["fetch", "prepare_text"]:
    """Route to the right entry node based on input source."""
    if state.get("source") == "url":
        return "fetch"
    return "prepare_text"  # both "text" and "file" go here


def should_use_llm(
    state: RecipeExtractionState,
) -> Literal["llm_extract", "map_structured_only"]:
    if state.get("error"):
        return "map_structured_only"
    if state.get("has_gaps") and state.get("llm_available"):
        return "llm_extract"
    return "map_structured_only"


# --- Graph Builder ---


def build_recipe_extractor_graph():
    """Build the Recipe Extractor LangGraph StateGraph."""
    graph = StateGraph(RecipeExtractionState)

    graph.add_node("fetch", fetch_node)
    graph.add_node("prepare_text", prepare_text_node)
    graph.add_node("extract_structured", extract_structured_node)
    graph.add_node("llm_extract", llm_extract_node)
    graph.add_node("map_after_llm", map_after_llm_node)
    graph.add_node("map_structured_only", map_structured_only_node)

    # Entry routing
    graph.add_conditional_edges(
        START,
        route_by_source,
        {"fetch": "fetch", "prepare_text": "prepare_text"},
    )

    # URL path
    graph.add_edge("fetch", "extract_structured")
    graph.add_conditional_edges(
        "extract_structured",
        should_use_llm,
        {"llm_extract": "llm_extract", "map_structured_only": "map_structured_only"},
    )

    # Text/file path — always LLM
    graph.add_edge("prepare_text", "llm_extract")

    # Convergence
    graph.add_edge("llm_extract", "map_after_llm")
    graph.add_edge("map_after_llm", END)
    graph.add_edge("map_structured_only", END)

    return graph.compile()


# --- Module-level singleton ---

recipe_extractor_graph = build_recipe_extractor_graph()
