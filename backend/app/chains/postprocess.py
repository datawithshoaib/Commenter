"""Deterministic cleanup applied to every LLM-written comment."""

import re

X_CHAR_LIMIT = 280

_EMOJI_RE = re.compile(
    "["
    "\U0001f000-\U0001faff"  # pictographs, emoticons, transport, symbols & extended
    "\U00002600-\U000027bf"  # misc symbols + dingbats
    "\U0001f1e6-\U0001f1ff"  # flags
    "️‍"  # variation selector / zero-width joiner
    "]+"
)
_TRAILING_HASHTAGS_RE = re.compile(r"(?:\s*#\w+)+\s*$")
_LABEL_RE = re.compile(r"^\s*(?:comment|reply|response)\s*[:\-]\s*", re.I)
_QUOTES = "\"'“”‘’"


def strip_emojis(text: str) -> str:
    return re.sub(r"[ \t]{2,}", " ", _EMOJI_RE.sub("", text)).strip()


def fit_to_limit(text: str, limit: int) -> str:
    """Trim to `limit` chars, preferring a sentence boundary, then a word boundary."""
    if len(text) <= limit:
        return text
    window = text[:limit]
    sentence_end = max(window.rfind(". "), window.rfind("! "), window.rfind("? "))
    if sentence_end >= limit * 0.5:
        return window[: sentence_end + 1].strip()
    cut = window[: limit - 1].rsplit(" ", 1)[0].rstrip(",;:-")
    return cut + "…"


def clean_comment(text: str, *, platform: str, use_emojis: bool) -> str:
    text = text.strip()
    text = _LABEL_RE.sub("", text)
    if len(text) >= 2 and text[0] in _QUOTES and text[-1] in _QUOTES:
        text = text[1:-1].strip()
    text = _TRAILING_HASHTAGS_RE.sub("", text)
    text = text.replace(" — ", ", ").replace("—", ", ")
    if not use_emojis:
        text = strip_emojis(text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if platform == "x":
        text = fit_to_limit(text, X_CHAR_LIMIT)
    return text
