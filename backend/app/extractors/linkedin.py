"""Extract public LinkedIn posts and articles without logging in.

LinkedIn serves server-rendered HTML for public posts. We read the post commentary block,
fall back to JSON-LD / OpenGraph, and finally to the public embed endpoint, which works
even when the main page is behind the auth wall.
"""

import re
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from app.core.errors import ExtractionError
from app.extractors.base import clean_text, http_client, json_ld_body, meta_content, soup
from app.schemas import Post

_ACTIVITY_RE = re.compile(r"(?:activity[-:])(\d{15,25})")
_URN_RE = re.compile(r"urn:li:(activity|share|ugcPost):(\d{15,25})")
_TITLE_SUFFIX_RE = re.compile(r"\s*\|\s*(?:[\d,.]+[KM]?\s+comments?(?: on LinkedIn)?|LinkedIn)\s*$", re.I)


def linkedin_urn(url: str) -> str | None:
    """Best-effort URN for the embed endpoint, e.g. `urn:li:activity:123`."""
    match = _URN_RE.search(url)
    if match:
        return f"urn:li:{match.group(1)}:{match.group(2)}"
    match = _ACTIVITY_RE.search(url)
    if match:
        return f"urn:li:activity:{match.group(1)}"
    return None


def _text_with_breaks(element) -> str:
    for br in element.find_all("br"):
        br.replace_with("\n")
    return element.get_text()


def _inside_comment(element) -> bool:
    for parent in element.parents:
        classes = " ".join(parent.get("class") or [])
        test_id = parent.get("data-test-id") or ""
        if "comment" in classes or "comment" in test_id:
            return True
    return False


def _is_auth_wall(response: httpx.Response) -> bool:
    final = str(response.url)
    return any(marker in final for marker in ("authwall", "/login", "/signup", "checkpoint"))


def parse_linkedin_html(html: str, url: str | None = None) -> Post | None:
    """Parse a LinkedIn post, embed or Pulse article page into a Post."""
    doc = soup(html)
    text: str | None = None

    commentary = doc.select_one("[data-test-id*='commentary']") or next(
        (
            el
            for el in doc.select(".attributed-text-segment-list__content")
            if not _inside_comment(el)
        ),
        None,
    )
    if commentary:
        text = _text_with_breaks(commentary)

    author = None
    handle = None
    actor = doc.select_one("a[data-tracking-control-name*='actor-name']") or doc.select_one(
        "a[data-tracking-control-name*='actor_name']"
    )
    if actor:
        author = actor.get_text(strip=True) or None
        match = re.search(r"/in/([^/?#]+)", actor.get("href", ""))
        handle = match.group(1) if match else None

    if not text:
        body, ld_author = json_ld_body(doc)  # Pulse articles expose articleBody
        if body:
            text = body
            author = author or ld_author
        else:
            description = meta_content(doc, "og:description", "description")
            text = _article_paragraphs(doc) or (_TITLE_SUFFIX_RE.sub("", description) if description else None)

    if not text or len(text.strip()) < 3:
        return None

    if not author:
        title = meta_content(doc, "og:title") or ""
        match = re.search(r"\|\s*([^|]+?)\s+posted on the topic", title) or re.match(
            r"^(.+?)(?: on LinkedIn:|\s+posted)", title
        )
        if match:
            author = match.group(1).strip()

    canonical = meta_content(doc, "og:url") or url
    return Post(
        platform="linkedin",
        text=clean_text(text),
        url=canonical,
        author=author,
        author_handle=handle,
        source="extracted",
    )


def _article_paragraphs(doc: BeautifulSoup) -> str | None:
    # Pulse article bodies only; a bare <article> on post pages also wraps the comment thread.
    article = doc.select_one("[data-test-id='article-content-blocks'], .article-main__content")
    if not article:
        return None
    paragraphs = [p.get_text(" ", strip=True) for p in article.find_all(["p", "h2", "h3", "li"])]
    joined = "\n\n".join(p for p in paragraphs if p)
    return joined if len(joined) > 40 else None


async def extract_linkedin(url: str) -> Post:
    host = (urlparse(url).hostname or "").lower()
    async with http_client() as client:
        candidates: list[str] = [url]
        urn = linkedin_urn(url)
        if urn:
            candidates.append(f"https://www.linkedin.com/embed/feed/update/{urn}")

        resolved_url = url
        for index, candidate in enumerate(candidates):
            try:
                resp = await client.get(candidate)
            except httpx.HTTPError:
                continue
            resolved_url = str(resp.url)
            # lnkd.in short links resolve to the real post; derive an embed fallback from there.
            if index == 0 and host.endswith("lnkd.in") and not urn:
                new_urn = linkedin_urn(resolved_url)
                if new_urn:
                    candidates.append(f"https://www.linkedin.com/embed/feed/update/{new_urn}")
            if resp.status_code != 200 or _is_auth_wall(resp):
                continue
            post = parse_linkedin_html(resp.text, url if "embed" in candidate else resolved_url)
            if post:
                if "embed" in candidate:
                    post.url = url
                return post

    raise ExtractionError(
        "Couldn't read that LinkedIn post. It may be private, connections-only or removed. "
        "Paste the post text instead."
    )
