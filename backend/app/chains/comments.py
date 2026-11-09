"""LangChain runnables: post analysis, styled comment writing, and refinement."""

import uuid

from langchain_core.language_models import BaseChatModel
from langchain_core.runnables import Runnable
from pydantic import BaseModel

from app.chains.postprocess import clean_comment
from app.chains.prompts import (
    ANALYZE_PROMPT,
    LENGTH_GUIDES,
    PLATFORM_GUIDES,
    REFINE_ACTIONS,
    REFINE_PROMPT,
    WRITE_PROMPT,
    emoji_rule,
    persona_rule,
)
from app.core.errors import AppError, LLMError
from app.core.llm import get_chat_model
from app.schemas import Comment, GeneratedComment, Length, Post, PostAnalysis, RefineAction
from app.styles import STYLE_MAP


def _structured(llm: BaseChatModel, schema: type[BaseModel]) -> Runnable:
    """Tool-calling structured output, falling back to JSON mode if the model fumbles the tool call."""
    primary = llm.with_structured_output(schema)
    try:
        fallback = llm.with_structured_output(schema, method="json_mode")
    except (NotImplementedError, ValueError, TypeError):
        return primary
    return primary.with_fallbacks([fallback])


async def _invoke(chain: Runnable, inputs: dict) -> BaseModel:
    try:
        result = await chain.ainvoke(inputs)
    except AppError:
        raise
    except Exception as exc:  # network errors, rate limits, malformed output…
        raise LLMError(f"The language model request failed: {exc}") from exc
    if result is None:
        raise LLMError("The language model returned an empty response.")
    return result


def _post_inputs(post: Post) -> dict:
    return {
        "platform": post.platform,
        "author": post.author or "unknown",
        "post": post.text,
    }


async def analyze_post(post: Post) -> PostAnalysis:
    chain = ANALYZE_PROMPT | _structured(get_chat_model(), PostAnalysis)
    return await _invoke(chain, _post_inputs(post))


async def write_comment(
    *,
    post: Post,
    analysis: PostAnalysis,
    style: str,
    length: Length,
    use_emojis: bool,
    persona: str | None,
    avoid: list[str] | None = None,
) -> Comment:
    spec = STYLE_MAP[style]
    platform = post.platform
    extra = ""
    if avoid:
        previous = "\n".join(f"- {draft}" for draft in avoid[-5:])
        extra = f"Earlier drafts that were rejected (write something clearly different):\n{previous}\n\n"

    chain = WRITE_PROMPT | _structured(get_chat_model(creative=True), GeneratedComment)
    draft: GeneratedComment = await _invoke(
        chain,
        {
            **_post_inputs(post),
            "style_name": spec.name,
            "style_instructions": spec.instructions,
            "platform_guide": PLATFORM_GUIDES[platform],
            "length_guide": LENGTH_GUIDES[platform][length],
            "emoji_rule": emoji_rule(use_emojis),
            "persona_rule": persona_rule(persona),
            "topic": analysis.topic,
            "summary": analysis.summary,
            "sentiment": analysis.sentiment,
            "author_intent": analysis.author_intent,
            "key_points": "; ".join(analysis.key_points),
            "extra": extra,
        },
    )
    text = clean_comment(draft.text, platform=platform, use_emojis=use_emojis)
    if not text:
        raise LLMError(f"The model returned an empty {spec.name} comment.")
    return Comment(
        id=uuid.uuid4().hex[:12],
        style=style,
        style_name=spec.name,
        text=text,
        rationale=draft.rationale.strip(),
        char_count=len(text),
    )


async def refine_comment(
    *, post: Post, comment: Comment, action: RefineAction, instruction: str | None
) -> Comment:
    request = instruction.strip() if action == "custom" and instruction else REFINE_ACTIONS[action]
    chain = REFINE_PROMPT | _structured(get_chat_model(creative=True), GeneratedComment)
    draft: GeneratedComment = await _invoke(
        chain,
        {
            "platform_guide": PLATFORM_GUIDES[post.platform],
            "post": post.text,
            "style_name": comment.style_name,
            "comment": comment.text,
            "instruction": request,
        },
    )
    keep_emojis = action != "remove_emojis"
    text = clean_comment(draft.text, platform=post.platform, use_emojis=keep_emojis)
    return Comment(
        id=uuid.uuid4().hex[:12],
        style=comment.style,
        style_name=comment.style_name,
        text=text,
        rationale=draft.rationale.strip(),
        char_count=len(text),
    )
