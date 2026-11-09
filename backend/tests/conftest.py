import asyncio
import re

import pytest
from fastapi.testclient import TestClient
from langchain_core.runnables import RunnableLambda

from app.schemas import GeneratedComment, PostAnalysis

# Styles whose fake generation is slow, so parallel branches finish out of order.
SLOW_STYLES = {"Thought Leader": 0.15, "Cheerleader": 0.05}


class FakeStructuredModel:
    """Stands in for ChatGroq: `with_structured_output(schema)` returns a runnable producing that schema."""

    def __init__(self, fail_styles: set[str] | None = None):
        self.fail_styles = fail_styles or set()
        self.calls: list[str] = []

    def with_structured_output(self, schema, **_kwargs):
        async def respond(prompt_value):
            messages = prompt_value.to_messages()
            system = messages[0].content
            human = messages[-1].content
            if schema is PostAnalysis:
                self.calls.append("analyze")
                return PostAnalysis(
                    topic="Remote work",
                    summary="The author argues async work beats meetings.",
                    sentiment="positive",
                    author_intent="share a lesson",
                    key_points=["fewer meetings", "written culture"],
                )
            assert schema is GeneratedComment
            style = re.search(r"Comment style: (.+?)\.", system)
            if style is None:  # refine prompt
                self.calls.append("refine")
                change = human.rsplit("Change requested:", 1)[-1].strip()
                return GeneratedComment(text=f"Refined: {change[:40]}", rationale="Applied the change.")
            name = style.group(1)
            self.calls.append(name)
            await asyncio.sleep(SLOW_STYLES.get(name, 0))
            if name in self.fail_styles:
                raise RuntimeError(f"boom in {name}")
            text = f'"{name} take on async work 🚀 #remote"'
            return GeneratedComment(text=text, rationale=f"Because {name}.")

        return RunnableLambda(respond)


@pytest.fixture
def fake_llm(monkeypatch):
    model = FakeStructuredModel()
    monkeypatch.setattr("app.chains.comments.get_chat_model", lambda **_: model)
    return model


@pytest.fixture
def client():
    from app.main import app

    return TestClient(app)
