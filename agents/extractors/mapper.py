"""Map raw extracted data onto the scenario's reverse-catalog product shape."""

from __future__ import annotations

from typing import Optional
from urllib.parse import urlparse

# Maps extracted data keys → scenario product schema keys.
# Fields prefixed with "_" map to the product/source level, not metadata.
SCENARIO_FIELD_MAP = {
    "books": {
        "isbn": "isbn",
        "author": "author",
        "name": "_product_name",
        "description": "_product_description",
        "price": "_source_price",
        "currency": "_source_currency",
        "seller": "_source_store",
        "image": "_product_image",
    },
    "recipes": {
        "name": "_product_name",
        "description": "_product_description",
        "price": "_source_price",
        "currency": "_source_currency",
        "seller": "_source_store",
        "ingredient_name": "ingredient_name",
        "quality": "quality",
        "image": "_product_image",
    },
    "sneakers-streetwear": {
        "brand": "brand",
        "name": "_product_name",
        "description": "_product_description",
        "price": "_source_price",
        "currency": "_source_currency",
        "seller": "_source_store",
        "image": "_product_image",
        "sku": "model",
    },
}


def map_to_product(extracted: dict, scenario_id: str, source_url: str) -> dict:
    """Map extracted data to the reverse catalog product shape."""
    field_map = SCENARIO_FIELD_MAP.get(scenario_id, {})

    metadata = {}
    for extracted_key, schema_key in field_map.items():
        value = extracted.get(extracted_key)
        if value is not None and not schema_key.startswith("_"):
            metadata[schema_key] = value

    product = {
        "name": extracted.get("name") or "Untitled Product",
        "description": extracted.get("description"),
        "metadata": metadata,
        "sources": [
            {
                "url": source_url,
                "storeName": extracted.get("seller") or extract_domain(source_url),
                "price": to_float(extracted.get("price")),
                "currency": extracted.get("currency"),
                "notes": None,
            }
        ],
        "status": "hunting",
        "image": extracted.get("image"),
    }

    return product


def extract_domain(url: str) -> str:
    """Extract a readable store name from a URL."""
    hostname = urlparse(url).hostname or ""
    if hostname.startswith("www."):
        hostname = hostname[4:]
    return hostname.split(".")[0].capitalize() if hostname else "Unknown"


def to_float(value) -> Optional[float]:
    if value is None:
        return None
    try:
        # Handle strings like "$29.99" or "29,99"
        cleaned = str(value).replace(",", ".").strip("$€£¥ ")
        return float(cleaned)
    except (ValueError, TypeError):
        return None
