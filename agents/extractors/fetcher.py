"""Fetch a URL and clean its HTML for downstream extraction."""

from __future__ import annotations

import httpx
from bs4 import BeautifulSoup

USER_AGENT = "meShop/1.0 (product extraction)"
TIMEOUT = 15  # seconds
MAX_CONTENT_LENGTH = 2_000_000  # 2MB — skip huge pages


async def fetch_page(url: str) -> dict:
    """Fetch a URL and return raw HTML + status info."""
    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=TIMEOUT,
        headers={"User-Agent": USER_AGENT},
    ) as client:
        response = await client.get(url)
        response.raise_for_status()

        if len(response.content) > MAX_CONTENT_LENGTH:
            raise ValueError("Page too large to process")

        return {
            "html": response.text,
            "url": str(response.url),  # final URL after redirects
            "status_code": response.status_code,
        }


def clean_html_for_llm(html: str) -> str:
    """Strip nav, footer, scripts, styles — keep product-relevant content."""
    soup = BeautifulSoup(html, "lxml")

    # Remove noise elements
    for tag in soup.find_all(
        ["script", "style", "nav", "footer", "header", "iframe", "noscript", "svg"]
    ):
        tag.decompose()

    # Remove common non-content sections by class/id patterns
    noise_patterns = [
        "cookie",
        "banner",
        "popup",
        "modal",
        "newsletter",
        "sidebar",
        "menu",
        "breadcrumb",
        "social",
        "share",
    ]
    for el in soup.find_all(True):
        # An earlier decompose() of a parent detaches its descendants (which are
        # still in this list); those have attrs == None. Skip them.
        if el.attrs is None:
            continue
        el_class = el.get("class") or []
        if isinstance(el_class, str):
            el_class = [el_class]
        el_id = el.get("id") or ""
        combined = f"{' '.join(el_class)} {el_id}".lower()
        if any(pattern in combined for pattern in noise_patterns):
            el.decompose()

    # Get text with some structure preserved
    text = soup.get_text(separator="\n", strip=True)

    # Collapse excessive whitespace
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    cleaned = "\n".join(lines)

    # Truncate to ~4000 tokens (~16000 chars) for LLM context
    return cleaned[:16000]
