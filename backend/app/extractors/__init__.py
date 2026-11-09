"""Turn a post URL into normalized post text, dispatching by platform."""

from app.extractors.base import detect_platform
from app.extractors.generic import extract_generic
from app.extractors.linkedin import extract_linkedin
from app.extractors.x import extract_x
from app.schemas import Post


async def extract_post(url: str) -> Post:
    platform = detect_platform(url)
    if platform == "x":
        return await extract_x(url)
    if platform == "linkedin":
        return await extract_linkedin(url)
    return await extract_generic(url)


__all__ = ["detect_platform", "extract_post"]
