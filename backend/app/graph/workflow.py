"""LangGraph workflow: resolve input → analyze post → write one comment per style (parallel) → finalize.

    START ─▶ resolve_input ─▶ analyze_post ─┬─▶ generate_comment[style 1] ─┐
                                             ├─▶ generate_comment[style 2] ─┼─▶ finalize ─▶ END
                                             └─▶ generate_comment[style N] ─┘
"""

import logging
import operator
from functools import lru_cache
from typing import Annotated, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from app.chains.comments import analyze_post, write_comment
from app.core.errors import LLMConfigError
from app.extractors import detect_platform, extract_post
from app.schemas import Comment, GenerateRequest, Post, PostAnalysis

logger = logging.getLogger(__name__)


class StyleFailure(TypedDict):
    style: str
    message: str


class CommentGraphState(TypedDict, total=False):
    request: GenerateRequest
    post: Post
    analysis: PostAnalysis
    comments: Annotated[list[Comment], operator.add]
    failures: Annotated[list[StyleFailure], operator.add]
    final_comments: list[Comment]


class StyleTask(TypedDict):
    request: GenerateRequest
    post: Post
    analysis: PostAnalysis
    style: str


async def resolve_input(state: CommentGraphState) -> dict:
    request = state["request"]
    if request.text and request.text.strip():
        url = str(request.url) if request.url else None
        platform = request.platform
        if platform == "auto":
            platform = detect_platform(url) if url else "linkedin"
        post = Post(platform=platform, text=request.text.strip(), url=url, source="pasted")
    else:
        post = await extract_post(str(request.url))
        if request.platform != "auto":
            post.platform = request.platform
    return {"post": post}


async def analyze(state: CommentGraphState) -> dict:
    return {"analysis": await analyze_post(state["post"])}


def fan_out(state: CommentGraphState) -> list[Send]:
    return [
        Send(
            "generate_comment",
            StyleTask(request=state["request"], post=state["post"], analysis=state["analysis"], style=style),
        )
        for style in state["request"].styles
    ]


async def generate_comment(task: StyleTask) -> dict:
    request = task["request"]
    try:
        comment = await write_comment(
            post=task["post"],
            analysis=task["analysis"],
            style=task["style"],
            length=request.length,
            use_emojis=request.use_emojis,
            persona=request.persona,
        )
    except LLMConfigError:
        raise
    except Exception as exc:  # one failing style must not sink the whole batch
        logger.warning("Style %s failed: %s", task["style"], exc)
        return {"failures": [StyleFailure(style=task["style"], message=str(exc))]}
    return {"comments": [comment]}


def finalize(state: CommentGraphState) -> dict:
    """Parallel branches finish in any order; present comments in the order the user picked styles."""
    order = {style: index for index, style in enumerate(state["request"].styles)}
    ordered = sorted(state.get("comments", []), key=lambda c: order.get(c.style, len(order)))
    return {"final_comments": ordered}


def build_graph():
    graph = StateGraph(CommentGraphState)
    graph.add_node("resolve_input", resolve_input)
    graph.add_node("analyze_post", analyze)
    graph.add_node("generate_comment", generate_comment)
    graph.add_node("finalize", finalize)

    graph.add_edge(START, "resolve_input")
    graph.add_edge("resolve_input", "analyze_post")
    graph.add_conditional_edges("analyze_post", fan_out, ["generate_comment"])
    graph.add_edge("generate_comment", "finalize")
    graph.add_edge("finalize", END)
    return graph.compile()


@lru_cache
def get_graph():
    return build_graph()
