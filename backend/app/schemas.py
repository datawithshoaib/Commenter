"""Pydantic models shared by the API, graph and chains."""

from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, field_validator, model_validator

from app.styles import DEFAULT_STYLES, STYLE_MAP

Platform = Literal["linkedin", "x", "other"]
PlatformChoice = Literal["auto", "linkedin", "x", "other"]
Length = Literal["short", "medium", "long"]
Sentiment = Literal["positive", "neutral", "negative", "mixed"]
RefineAction = Literal["shorter", "longer", "casual", "professional", "add_question", "remove_emojis", "custom"]

MAX_POST_CHARS = 20_000


class Post(BaseModel):
    platform: Platform = "other"
    text: str = Field(min_length=1, max_length=MAX_POST_CHARS)
    url: str | None = None
    author: str | None = None
    author_handle: str | None = None
    source: Literal["pasted", "extracted"] = "pasted"


class PostAnalysis(BaseModel):
    """Structured understanding of a social media post."""

    topic: str = Field(description="The main topic in 2 to 6 words")
    summary: str = Field(description="One sentence summary of what the author is saying")
    sentiment: Sentiment = Field(description="Overall emotional tone of the post")
    author_intent: str = Field(
        description="What the author wants from readers, e.g. share a lesson, announce news, ask for opinions"
    )
    key_points: list[str] = Field(description="2 to 4 short key points or claims from the post")


class GeneratedComment(BaseModel):
    """A single comment draft written for a social media post."""

    text: str = Field(description="The comment exactly as it should be posted, with no surrounding quotes")
    rationale: str = Field(description="One short sentence on why this comment works for this post")


class Comment(BaseModel):
    id: str
    style: str
    style_name: str
    text: str
    rationale: str
    char_count: int


class GenerationOptions(BaseModel):
    platform: PlatformChoice = "auto"
    styles: list[str] = Field(default_factory=lambda: list(DEFAULT_STYLES), min_length=1, max_length=8)
    length: Length = "medium"
    use_emojis: bool = False
    persona: str | None = Field(default=None, max_length=300)

    @field_validator("styles")
    @classmethod
    def _validate_styles(cls, styles: list[str]) -> list[str]:
        unknown = [s for s in styles if s not in STYLE_MAP]
        if unknown:
            raise ValueError(f"Unknown style(s): {', '.join(unknown)}. Valid: {', '.join(STYLE_MAP)}")
        return list(dict.fromkeys(styles))  # de-duplicate, keep order

    @field_validator("persona")
    @classmethod
    def _strip_persona(cls, persona: str | None) -> str | None:
        if persona is None:
            return None
        return persona.strip() or None


class GenerateRequest(GenerationOptions):
    text: str | None = Field(default=None, max_length=MAX_POST_CHARS)
    url: HttpUrl | None = None

    @model_validator(mode="after")
    def _require_input(self) -> "GenerateRequest":
        if not (self.text and self.text.strip()) and not self.url:
            raise ValueError("Provide either post text or a post URL.")
        return self


class GenerateResponse(BaseModel):
    post: Post
    analysis: PostAnalysis
    comments: list[Comment]
    model: str


class ExtractRequest(BaseModel):
    url: HttpUrl


class RegenerateRequest(BaseModel):
    post: Post
    style: str
    length: Length = "medium"
    use_emojis: bool = False
    persona: str | None = Field(default=None, max_length=300)
    analysis: PostAnalysis | None = None
    avoid: list[str] = Field(default_factory=list, max_length=10)

    @field_validator("style")
    @classmethod
    def _validate_style(cls, style: str) -> str:
        if style not in STYLE_MAP:
            raise ValueError(f"Unknown style: {style}")
        return style


class RefineRequest(BaseModel):
    post: Post
    comment: Comment
    action: RefineAction
    instruction: str | None = Field(default=None, max_length=300)

    @model_validator(mode="after")
    def _custom_needs_instruction(self) -> "RefineRequest":
        if self.action == "custom" and not (self.instruction and self.instruction.strip()):
            raise ValueError("A custom refinement needs an instruction.")
        return self
