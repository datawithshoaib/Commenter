"""Catalog of comment styles. Each style is a distinct persona so a batch reads varied."""

from pydantic import BaseModel


class CommentStyle(BaseModel):
    key: str
    name: str
    tagline: str
    icon: str  # lucide icon name used by the frontend
    instructions: str


STYLES: list[CommentStyle] = [
    CommentStyle(
        key="insightful",
        name="Thought Leader",
        tagline="Adds a sharp, non-obvious insight",
        icon="lightbulb",
        instructions=(
            "Add a genuinely new angle: a second-order effect, an underlying principle, or an implication "
            "the author did not spell out. Build on the post rather than summarizing it. Sound confident, not preachy."
        ),
    ),
    CommentStyle(
        key="supportive",
        name="Cheerleader",
        tagline="Specific, genuine appreciation",
        icon="heart",
        instructions=(
            "Show warm, sincere appreciation and name the specific idea, line or result that resonated and why. "
            "Never use generic praise like 'Great post!' or 'Thanks for sharing'."
        ),
    ),
    CommentStyle(
        key="curious",
        name="Conversation Starter",
        tagline="Asks a question worth answering",
        icon="message-circle-question",
        instructions=(
            "Briefly acknowledge one concrete point, then ask exactly one thoughtful, open-ended question that the "
            "author would enjoy answering and that moves the discussion forward."
        ),
    ),
    CommentStyle(
        key="storyteller",
        name="Storyteller",
        tagline="A short, relatable experience",
        icon="book-open",
        instructions=(
            "Share a brief, believable first-person experience that connects to the post's main point, and close by "
            "tying it back to the author's idea. Keep it plausible and modest; do not invent famous names or statistics."
        ),
    ),
    CommentStyle(
        key="contrarian",
        name="Devil's Advocate",
        tagline="Respectful pushback or nuance",
        icon="scale",
        instructions=(
            "Respectfully push back or add a missing nuance, caveat or counterexample. Acknowledge what is right first, "
            "then offer the alternative view. Stay constructive and never dismissive."
        ),
    ),
    CommentStyle(
        key="witty",
        name="Wit",
        tagline="Clever, light humor",
        icon="laugh",
        instructions=(
            "Write a clever, light-hearted comment with a playful twist or wordplay tied to the post's topic. "
            "The humor must be kind and still show you understood the point."
        ),
    ),
    CommentStyle(
        key="expert",
        name="Value Adder",
        tagline="A practical tip or framework",
        icon="wrench",
        instructions=(
            "Contribute something actionable: a practical tip, a mini-framework, a pitfall to avoid, or a type of "
            "resource that complements the post. Be concrete and useful."
        ),
    ),
    CommentStyle(
        key="concise",
        name="One-Liner",
        tagline="Punchy, high-signal reaction",
        icon="zap",
        instructions=(
            "Write a single punchy sentence that captures the essence of the post with a memorable phrasing. "
            "Maximum 20 words regardless of the requested length."
        ),
    ),
]

STYLE_MAP: dict[str, CommentStyle] = {style.key: style for style in STYLES}
DEFAULT_STYLES: list[str] = ["insightful", "supportive", "curious", "witty"]
