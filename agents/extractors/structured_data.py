"""Pass 1: extract product data from JSON-LD, OpenGraph, and meta tags (no LLM)."""

from __future__ import annotations

import json
from typing import Optional

from bs4 import BeautifulSoup


def extract_structured_data(html: str) -> dict:
    """Extract product data from JSON-LD, OpenGraph, and meta tags."""
    soup = BeautifulSoup(html, "lxml")
    result: dict = {}

    # 1. JSON-LD
    jsonld_data = extract_jsonld(soup)
    if jsonld_data:
        result.update(jsonld_data)

    # 2. OpenGraph — only fill gaps, don't overwrite JSON-LD data
    og_data = extract_opengraph(soup)
    if og_data:
        for key, value in og_data.items():
            if key not in result or not result[key]:
                result[key] = value

    # 3. Meta tags / title fallback
    if "name" not in result or not result["name"]:
        title_tag = soup.find("title")
        if title_tag:
            result["name"] = title_tag.get_text(strip=True)

    if "description" not in result or not result["description"]:
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc:
            result["description"] = meta_desc.get("content", "")

    return result


def extract_jsonld(soup: BeautifulSoup) -> Optional[dict]:
    """Extract product data from JSON-LD script tags."""
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string)

            # Handle @graph arrays / lists of entities
            if isinstance(data, list):
                for item in data:
                    product = find_product_in_jsonld(item)
                    if product:
                        return product
            else:
                product = find_product_in_jsonld(data)
                if product:
                    return product
        except (json.JSONDecodeError, TypeError):
            continue
    return None


def find_product_in_jsonld(data: dict) -> Optional[dict]:
    """Find and normalize a Product entity in JSON-LD data."""
    if not isinstance(data, dict):
        return None

    schema_type = data.get("@type", "")

    # Handle both "Product" and ["Product", "Book"] forms
    types = schema_type if isinstance(schema_type, list) else [schema_type]

    product_types = {
        "Product",
        "Book",
        "IndividualProduct",
        "SomeProducts",
        "Offer",
        "AggregateOffer",
        "CreativeWork",
    }

    if not any(t in product_types for t in types):
        # Check nested @graph
        if "@graph" in data:
            for item in data["@graph"]:
                result = find_product_in_jsonld(item)
                if result:
                    return result
        return None

    result = {
        "name": data.get("name"),
        "description": data.get("description"),
        "image": normalize_image(data.get("image")),
        "brand": extract_brand(data),
        "sku": data.get("sku"),
        "isbn": data.get("isbn"),
        "author": extract_author(data),
    }

    # Price from offers
    offers = data.get("offers", data.get("offer"))
    if offers:
        if isinstance(offers, list):
            offers = offers[0]
        if isinstance(offers, dict):
            result["price"] = offers.get("price")
            result["currency"] = offers.get("priceCurrency")
            result["availability"] = offers.get("availability", "").split("/")[-1]
            result["seller"] = (
                offers.get("seller", {}).get("name")
                if isinstance(offers.get("seller"), dict)
                else None
            )
            result["url"] = offers.get("url")

    # Direct price (some schemas)
    if not result.get("price"):
        result["price"] = data.get("price")
        result["currency"] = data.get("priceCurrency")

    # Clean up None values
    return {k: v for k, v in result.items() if v is not None}


def normalize_image(img) -> Optional[str]:
    if isinstance(img, str):
        return img
    if isinstance(img, list) and img:
        return normalize_image(img[0])
    if isinstance(img, dict):
        return img.get("url") or img.get("contentUrl")
    return None


def extract_brand(data: dict) -> Optional[str]:
    brand = data.get("brand")
    if isinstance(brand, dict):
        return brand.get("name")
    if isinstance(brand, str):
        return brand
    return None


def extract_author(data: dict) -> Optional[str]:
    author = data.get("author")
    if isinstance(author, dict):
        return author.get("name")
    if isinstance(author, list) and author:
        first = author[0]
        return first.get("name") if isinstance(first, dict) else str(first)
    if isinstance(author, str):
        return author
    return None


def extract_opengraph(soup: BeautifulSoup) -> dict:
    """Extract data from OpenGraph meta tags."""
    og_map = {
        "og:title": "name",
        "og:description": "description",
        "og:image": "image",
        "og:url": "url",
        "product:price:amount": "price",
        "product:price:currency": "currency",
        "og:price:amount": "price",
        "og:price:currency": "currency",
        "product:brand": "brand",
        "product:isbn": "isbn",
        "og:isbn": "isbn",
    }

    result: dict = {}
    for meta in soup.find_all("meta", attrs={"property": True}):
        prop = meta.get("property", "")
        if prop in og_map and meta.get("content"):
            result[og_map[prop]] = meta["content"]

    return result
