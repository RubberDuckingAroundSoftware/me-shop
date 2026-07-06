"""Recipe-specific structured-data extraction (schema.org/Recipe JSON-LD).

Pass 1 of the Recipe Extractor: parse the richest structured source available
on recipe pages — `@type: "Recipe"` JSON-LD — with OpenGraph and title-tag
fallbacks for name/description/image. Mirrors the product `structured_data`
extractor's shape, but tuned for recipes (ingredients, instructions, timings).
"""

from __future__ import annotations

import json
import re
from typing import Optional

from bs4 import BeautifulSoup


def extract_recipe_structured_data(html: str) -> dict:
    """Extract recipe data from JSON-LD, with OG/meta fallbacks."""
    soup = BeautifulSoup(html, "lxml")
    result: dict = {}

    # 1. JSON-LD — look for @type: "Recipe"
    jsonld = extract_recipe_jsonld(soup)
    if jsonld:
        result.update(jsonld)

    # 2. OG fallbacks for name, description, image
    if not result.get("name"):
        og_title = soup.find("meta", attrs={"property": "og:title"})
        if og_title and og_title.get("content"):
            result["name"] = og_title.get("content", "")

    if not result.get("description"):
        og_desc = soup.find("meta", attrs={"property": "og:description"})
        if og_desc and og_desc.get("content"):
            result["description"] = og_desc.get("content", "")

    if not result.get("image"):
        og_image = soup.find("meta", attrs={"property": "og:image"})
        if og_image and og_image.get("content"):
            result["image"] = og_image.get("content", "")

    # 3. Title fallback
    if not result.get("name"):
        title_tag = soup.find("title")
        if title_tag:
            # Clean common suffixes like " - Freshful.ro - Freshful.ro"
            name = title_tag.get_text(strip=True)
            name = re.split(r"\s*[-|–—]\s*", name)[0].strip()
            result["name"] = name

    return result


def extract_recipe_jsonld(soup: BeautifulSoup) -> Optional[dict]:
    """Find and parse a Recipe entity from JSON-LD script tags."""
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue

        # Handle arrays and @graph
        if isinstance(data, list):
            for item in data:
                recipe = parse_recipe_entity(item)
                if recipe:
                    return recipe
        else:
            recipe = parse_recipe_entity(data)
            if recipe:
                return recipe
    return None


def parse_recipe_entity(data) -> Optional[dict]:
    """Parse a single JSON-LD entity if it's a Recipe."""
    if not isinstance(data, dict):
        return None

    # Check @graph
    if "@graph" in data:
        for item in data["@graph"]:
            recipe = parse_recipe_entity(item)
            if recipe:
                return recipe

    schema_type = data.get("@type", "")
    types = schema_type if isinstance(schema_type, list) else [schema_type]
    if "Recipe" not in types:
        return None

    result = {
        "name": data.get("name"),
        "description": data.get("description"),
        "image": normalize_image(data.get("image")),
        "author": extract_author(data),
        "category": data.get("recipeCategory"),
        "cuisine": data.get("recipeCuisine"),
    }

    # Ingredients — can be array of strings or array of objects
    result["ingredients"] = parse_ingredients(data.get("recipeIngredient", []))

    # Instructions — can be string, array of strings, or array of HowToStep
    result["instructions"] = parse_instructions(data.get("recipeInstructions", []))

    # Timings — ISO 8601 durations like "PT15M", "PT1H30M"
    result["prep_time"] = parse_duration(data.get("prepTime"))
    result["cook_time"] = parse_duration(data.get("cookTime"))
    result["total_time"] = parse_duration(data.get("totalTime"))

    # Servings — can be string "4 servings" or number
    result["servings"] = parse_servings(data.get("recipeYield"))

    # Nutrition
    nutrition = data.get("nutrition")
    if isinstance(nutrition, dict):
        result["calories"] = nutrition.get("calories")

    # Clean None/empty values so downstream "gap" checks are accurate.
    return {k: v for k, v in result.items() if v is not None and v != []}


def parse_ingredients(raw) -> list[dict]:
    """Normalize ingredients into structured format."""
    if not isinstance(raw, list):
        raw = [raw] if raw else []
    ingredients = []
    for item in raw:
        if isinstance(item, str):
            # Parse "600g carne de vită cu os" or "3 or 4 ripe bananas, smashed"
            if item.strip():
                ingredients.append(
                    {"name": item.strip(), "quantity": "", "found": False}
                )
        elif isinstance(item, dict):
            # PropertyValue format: { "value": 1, "name": "egg" }
            name = item.get("name", "")
            value = item.get("value", "")
            ingredients.append(
                {
                    "name": name,
                    "quantity": str(value) if value != "" else "",
                    "found": False,
                }
            )
    return ingredients


def parse_instructions(raw) -> list[str]:
    """Normalize instructions into a list of strings."""
    if isinstance(raw, str):
        # Single string — split on newlines or numbered patterns
        steps = re.split(r"\n+|\d+\.\s+", raw)
        return [s.strip() for s in steps if s.strip()]

    if isinstance(raw, list):
        instructions = []
        for item in raw:
            if isinstance(item, str):
                if item.strip():
                    instructions.append(item.strip())
            elif isinstance(item, dict):
                # HowToStep or HowToSection
                if item.get("@type") == "HowToSection":
                    for step in item.get("itemListElement", []):
                        if isinstance(step, dict):
                            text = step.get("text", "").strip()
                            if text:
                                instructions.append(text)
                        elif isinstance(step, str) and step.strip():
                            instructions.append(step.strip())
                else:
                    text = item.get("text", "")
                    if text:
                        instructions.append(text.strip())
        return [i for i in instructions if i]

    return []


def parse_duration(duration: Optional[str]) -> Optional[str]:
    """Convert ISO 8601 duration to human-readable string."""
    if not duration or not isinstance(duration, str):
        return None

    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration)
    if not match:
        return duration  # return as-is if we can't parse

    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)

    parts = []
    if hours:
        parts.append(f"{hours}h")
    if minutes:
        parts.append(f"{minutes} min")

    return " ".join(parts) if parts else None


def parse_servings(raw) -> Optional[int]:
    """Extract servings count from string or number."""
    if raw is None:
        return None
    if isinstance(raw, bool):
        return None
    if isinstance(raw, int):
        return raw
    # recipeYield can be a list like ["4", "4 servings"]
    if isinstance(raw, list) and raw:
        return parse_servings(raw[0])
    if isinstance(raw, (str, float)):
        match = re.search(r"(\d+)", str(raw))
        return int(match.group(1)) if match else None
    return None


def normalize_image(img) -> Optional[str]:
    if isinstance(img, str):
        return img
    if isinstance(img, list) and img:
        return normalize_image(img[0])
    if isinstance(img, dict):
        return img.get("url") or img.get("contentUrl")
    return None


def extract_author(data: dict) -> Optional[str]:
    author = data.get("author")
    if isinstance(author, dict):
        return author.get("name")
    if isinstance(author, str):
        return author
    if isinstance(author, list) and author:
        first = author[0]
        return first.get("name") if isinstance(first, dict) else str(first)
    return None
