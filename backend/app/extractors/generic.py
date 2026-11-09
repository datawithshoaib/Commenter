"""Best-effort extraction for any other public web page (blogs, Threads, Reddit, etc.)."""

import httpx

from app.core.errors import ExtractionError
from app.extractors.base import clean_text, http_client, json_ld_body, meta_content, soup
from app.schemas import Post

_NOISE_TAGS = ["script", "style", "noscript", "nav", "header", "footer", "aside", "form", "svg"]


def parse_generic_html(html: str, url: str) -> Post | None:
    doc = soup(html)
    body, author = json_ld_body(doc)
    text = body

    if not text:
        for tag in doc(_NOISE_TAGS):
            tag.decompose()
        container = doc.find("article") or doc.find("main") or doc.body
        if container:
            paragraphs = [p.get_text(" ", strip=True) for p in container.find_all(["p", "h1", "h2", "li"])]
            joined = "\n\n".join(p for p in paragraphs if len(p) > 30)
            text = joined if len(joined) > 80 else None

    if not text:
        title = meta_content(doc, "og:title", "twitter:title")
        description = meta_content(doc, "og:description", "twitter:description", "description")
        text = "\n\n".join(filter(None, [title, description])) or None

    if not text:
        return None

    author = author or meta_content(doc, "author", "article:author", "twitter:creator")
    return Post(
        platform="other",
        text=clean_text(text)[:12_000],
        url=meta_content(doc, "og:url") or url,
        author=author,
        source="extracted",
    )


async def extract_generic(url: str) -> Post:
    async with http_client() as client:
        try:
            resp = await client.get(url)
        except httpx.HTTPError as exc:
            raise ExtractionError(f"Couldn't reach that page ({exc.__class__.__name__}).") from exc
    if resp.status_code >= 400:
        raise ExtractionError(f"That page returned HTTP {resp.status_code}. Paste the text instead.")
    if "html" not in resp.headers.get("content-type", "html"):
        raise ExtractionError("That link isn't a web page. Paste the text instead.")
    post = parse_generic_html(resp.text, str(resp.url))
    if not post:
        raise ExtractionError("Couldn't find readable text on that page. Paste the text instead.")
    return post
