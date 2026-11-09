"""HTTP routes. All JSON errors use the `{"error": {"code", "message"}}` envelope."""

import json
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.chains.comments import analyze_post, refine_comment, write_comment
from app.core.config import get_settings
from app.core.errors import AppError, LLMError
from app.extractors import extract_post
from app.graph.workflow import get_graph
from app.schemas import (
    Comment,
    ExtractRequest,
    GenerateRequest,
    GenerateResponse,
    Post,
    RefineRequest,
    RegenerateRequest,
)
from app.styles import DEFAULT_STYLES, STYLES

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict:
    settings = get_settings()
    return {"status": "ok", "model": settings.groq_model, "llm_configured": bool(settings.groq_api_key)}


@router.get("/styles")
def styles() -> dict:
    return {
        "styles": [style.model_dump(exclude={"instructions"}) for style in STYLES],
        "defaults": DEFAULT_STYLES,
    }


@router.post("/extract", response_model=Post)
async def extract(body: ExtractRequest) -> Post:
    return await extract_post(str(body.url))


@router.post("/generate", response_model=GenerateResponse)
async def generate(body: GenerateRequest) -> GenerateResponse:
    state = await get_graph().ainvoke({"request": body})
    comments = state.get("final_comments", [])
    if not comments:
        failures = state.get("failures") or []
        detail = failures[0]["message"] if failures else "No comments were produced."
        raise LLMError(detail)
    return GenerateResponse(
        post=state["post"],
        analysis=state["analysis"],
        comments=comments,
        model=get_settings().groq_model,
    )


def _sse(event: str, data: object) -> str:
    if isinstance(data, BaseModel):
        payload = data.model_dump(mode="json")
    elif isinstance(data, list):
        payload = [item.model_dump(mode="json") if isinstance(item, BaseModel) else item for item in data]
    else:
        payload = data
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def _generation_events(body: GenerateRequest) -> AsyncIterator[str]:
    produced = 0
    try:
        async for update in get_graph().astream({"request": body}, stream_mode="updates"):
            for node, data in update.items():
                if not data:
                    continue
                if node == "resolve_input":
                    yield _sse("post", data["post"])
                elif node == "analyze_post":
                    yield _sse("analysis", data["analysis"])
                elif node == "generate_comment":
                    for comment in data.get("comments", []):
                        produced += 1
                        yield _sse("comment", comment)
                    for failure in data.get("failures", []):
                        yield _sse("comment_error", failure)
                elif node == "finalize":
                    yield _sse(
                        "done",
                        {"model": get_settings().groq_model, "count": len(data.get("final_comments", []))},
                    )
        if produced == 0:
            yield _sse("error", {"code": "llm_error", "message": "No comments were produced. Please try again."})
    except AppError as exc:
        yield _sse("error", exc.to_dict()["error"])
    except Exception:
        logger.exception("Streaming generation failed")
        yield _sse("error", {"code": "internal_error", "message": "Something went wrong while generating."})


@router.post("/generate/stream")
async def generate_stream(body: GenerateRequest) -> StreamingResponse:
    return StreamingResponse(
        _generation_events(body),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@router.post("/comments/regenerate", response_model=Comment)
async def regenerate(body: RegenerateRequest) -> Comment:
    analysis = body.analysis or await analyze_post(body.post)
    return await write_comment(
        post=body.post,
        analysis=analysis,
        style=body.style,
        length=body.length,
        use_emojis=body.use_emojis,
        persona=body.persona,
        avoid=body.avoid,
    )


@router.post("/comments/refine", response_model=Comment)
async def refine(body: RefineRequest) -> Comment:
    return await refine_comment(post=body.post, comment=body.comment, action=body.action, instruction=body.instruction)
