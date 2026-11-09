"""Shared helpers for extractors: platform detection, HTTP client, HTML parsing."""

import json
import re
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from app.core.config import get_settings
from app.schemas import Platform

_LINKEDIN_HOSTS = ("linkedin.com", "lnkd.in")
_X_HOSTS = ("x.com", "twitter.com", "fxtwitter.com", "vxtwitter.com", "fixupx.com", "nitter.net")


def _host(url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def _matches(host: str, domains: tuple[str, ...]) -> bool:
    return any(host == d or host.endswith("." + d) for d in domains)


def detect_platform(url: str) -> Platform:
    host = _host(url)
    if _matches(host, _LINKEDIN_HOSTS):
        return "linkedin"
    if _matches(host, _X_HOSTS):
        return "x"
    return "other"


def clean_text(text: str) -> str:
    """Normalize whitespace while keeping paragraph breaks."""
    text = text.replace("\xa0", " ").replace("​", "").replace("\r\n", "\n")
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def http_client() -> httpx.AsyncClient:
    settings = get_settings()
    return httpx.AsyncClient(
        timeout=settings.http_timeout_seconds,
        follow_redirects=True,
        headers={
            "User-Agent": settings.user_agent,
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        },
    )


def soup(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, "html.parser")


def meta_content(doc: BeautifulSoup, *names: str) -> str | None:
    for name in names:
        tag = doc.find("meta", attrs={"property": name}) or doc.find("meta", attrs={"name": name})
        if tag and tag.get("content"):
            return str(tag["content"]).strip()
    return None


def json_ld_objects(doc: BeautifulSoup) -> list[dict]:
    objects: list[dict] = []
    for script in doc.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            if isinstance(item, dict):
                objects.append(item)
                graph = item.get("@graph")
                if isinstance(graph, list):
                    objects.extend(g for g in graph if isinstance(g, dict))
    return objects


def json_ld_body(doc: BeautifulSoup) -> tuple[str | None, str | None]:
    """Return (body text, author name) from JSON-LD article-like objects."""
    for obj in json_ld_objects(doc):
        body = obj.get("articleBody") or obj.get("text")
        if isinstance(body, str) and len(body.strip()) > 20:
            author = obj.get("author")
            if isinstance(author, list) and author:
                author = author[0]
            name = author.get("name") if isinstance(author, dict) else author if isinstance(author, str) else None
            return body, name
    return None, None
