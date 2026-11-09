"""Extract tweets/posts from X (Twitter) using public, key-less endpoints.

Order of attempts:
1. FxTwitter API (handles long posts, quotes and articles)
2. X syndication CDN (powers embedded tweets)
3. oEmbed (always available for public posts, text only)
"""

import html
import math
import re
from urllib.parse import urlparse

import httpx

from app.core.errors import ExtractionError
from app.extractors.base import clean_text, http_client, soup
from app.schemas import Post

_STATUS_RE = re.compile(r"/(?:([A-Za-z0-9_]{1,15})/)?status(?:es)?/(\d{1,25})")
_TCO_RE = re.compile(r"\s*https://t\.co/\w+\s*$")


def parse_status_url(url: str) -> tuple[str | None, str]:
    """Return (handle, status_id) from an X/Twitter status URL."""
    path = urlparse(url).path
    match = _STATUS_RE.search(path)
    if not match:
        raise ExtractionError(
            "That X link doesn't point to a post. Use a link like https://x.com/user/status/123…",
            code="invalid_url",
        )
    handle = match.group(1)
    if handle in {"i", "web"}:
        handle = None
    return handle, match.group(2)


def syndication_token(status_id: str) -> str:
    """Replicates the token the X embed widget computes: ((id / 1e15) * PI).toString(36) minus zeros/dot."""
    value = (int(status_id) / 1e15) * math.pi
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    integer, fraction = int(value), value - int(value)
    out = ""
    while integer > 0:
        out = digits[integer % 36] + out
        integer //= 36
    out = out or "0"
    if fraction:
        out += "."
        for _ in range(11):
            fraction *= 36
            digit = int(fraction)
            out += digits[digit]
            fraction -= digit
    return re.sub(r"(0+|\.)", "", out)


def _strip_trailing_tco(text: str) -> str:
    return _TCO_RE.sub("", text).strip()


async def _from_fxtwitter(client: httpx.AsyncClient, handle: str | None, status_id: str) -> Post | None:
    resp = await client.get(f"https://api.fxtwitter.com/{handle or 'i'}/status/{status_id}")
    if resp.status_code != 200:
        return None
    tweet = (resp.json() or {}).get("tweet") or {}
    text = tweet.get("text") or ""
    article = tweet.get("article") or {}
    if not text.strip() and article:
        text = "\n\n".join(filter(None, [article.get("title"), article.get("preview_text")]))
    quote = tweet.get("quote") or {}
    if quote.get("text"):
        quoted_author = (quote.get("author") or {}).get("screen_name", "someone")
        text = f"{text}\n\n[Quoting @{quoted_author}]: {quote['text']}"
    if not text.strip():
        return None
    author = tweet.get("author") or {}
    return Post(
        platform="x",
        text=clean_text(_strip_trailing_tco(text)),
        url=tweet.get("url"),
        author=author.get("name"),
        author_handle=author.get("screen_name"),
        source="extracted",
    )


async def _from_syndication(client: httpx.AsyncClient, status_id: str) -> Post | None:
    resp = await client.get(
        "https://cdn.syndication.twimg.com/tweet-result",
        params={"id": status_id, "token": syndication_token(status_id), "lang": "en"},
    )
    if resp.status_code != 200 or not resp.text.strip():
        return None
    data = resp.json() or {}
    note = (data.get("note_tweet") or {}).get("note_tweet_results", {}).get("result", {})
    text = note.get("text") or data.get("text") or ""
    if not text.strip():
        return None
    user = data.get("user") or {}
    handle = user.get("screen_name")
    return Post(
        platform="x",
        text=clean_text(html.unescape(_strip_trailing_tco(text))),
        url=f"https://x.com/{handle or 'i'}/status/{status_id}",
        author=user.get("name"),
        author_handle=handle,
        source="extracted",
    )


async def _from_oembed(client: httpx.AsyncClient, handle: str | None, status_id: str) -> Post | None:
    tweet_url = f"https://twitter.com/{handle or 'i'}/status/{status_id}"
    resp = await client.get("https://publish.twitter.com/oembed", params={"url": tweet_url, "omit_script": 1})
    if resp.status_code != 200:
        return None
    data = resp.json() or {}
    paragraph = soup(data.get("html", "")).find("p")
    if not paragraph:
        return None
    for br in paragraph.find_all("br"):
        br.replace_with("\n")
    text = paragraph.get_text()
    author_url = data.get("author_url") or ""
    return Post(
        platform="x",
        text=clean_text(_strip_trailing_tco(text)),
        url=data.get("url") or tweet_url,
        author=data.get("author_name"),
        author_handle=author_url.rstrip("/").rsplit("/", 1)[-1] or handle,
        source="extracted",
    )


async def extract_x(url: str) -> Post:
    handle, status_id = parse_status_url(url)
    async with http_client() as client:
        for attempt in (
            lambda: _from_fxtwitter(client, handle, status_id),
            lambda: _from_syndication(client, status_id),
            lambda: _from_oembed(client, handle, status_id),
        ):
            try:
                post = await attempt()
            except (httpx.HTTPError, ValueError):
                continue
            if post:
                return post
    raise ExtractionError(
        "Couldn't read that X post. It may be private, deleted or age-restricted. Paste the text instead."
    )
