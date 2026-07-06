"""Map extracted recipe data onto the meShop Recipe shape.

The Recipe Extractor's final step. Takes merged structured + LLM data and
produces the object the Next.js recipe form/API expects (name, ingredients,
instructions, timings), folding provenance/extra metadata into `notes`.
"""

from __future__ import annotations


def map_to_recipe(extracted: dict, source_url: str) -> dict:
    """Map extracted recipe data to the meShop Recipe shape."""
    ingredients = []
    for ing in extracted.get("ingredients", []):
        if isinstance(ing, dict):
            ingredients.append(
                {
                    "name": ing.get("name", ""),
                    "quantity": ing.get("quantity", ""),
                    "unit": ing.get("unit"),
                    "notes": ing.get("notes"),
                    "found": ing.get("found", False),
                    "sourceStore": ing.get("sourceStore"),
                }
            )
        elif isinstance(ing, str):
            ingredients.append({"name": ing, "quantity": "", "found": False})

    recipe = {
        "name": extracted.get("name") or "Untitled Recipe",
        "description": extracted.get("description"),
        "servings": extracted.get("servings"),
        "prepTime": extracted.get("prep_time"),
        "cookTime": extracted.get("cook_time"),
        "ingredients": ingredients,
        "instructions": extracted.get("instructions", []) or [],
        "notes": build_notes(extracted, source_url),
        "image": extracted.get("image"),
        "sourceUrl": source_url,
    }

    return recipe


def build_notes(extracted: dict, source_url: str) -> str:
    """Build a notes string with provenance and extra metadata."""
    parts = []

    if extracted.get("author"):
        parts.append(f"Author: {extracted['author']}")

    if extracted.get("cuisine"):
        parts.append(f"Cuisine: {extracted['cuisine']}")

    if extracted.get("category"):
        parts.append(f"Category: {extracted['category']}")

    if extracted.get("calories"):
        parts.append(f"Calories: {extracted['calories']}")

    if source_url:
        parts.append(f"Source: {source_url}")

    return "\n".join(parts)
