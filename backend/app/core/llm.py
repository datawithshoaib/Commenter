"""Factory for the Groq chat model used across chains."""

from functools import lru_cache

from langchain_core.language_models import BaseChatModel
from langchain_groq import ChatGroq

from app.core.config import get_settings
from app.core.errors import LLMConfigError


@lru_cache(maxsize=8)
def _build(model: str, temperature: float) -> BaseChatModel:
    settings = get_settings()
    if not settings.groq_api_key:
        raise LLMConfigError(
            "GROQ_API_KEY is not set. Add it to backend/.env (see .env.example) and restart the API."
        )
    return ChatGroq(
        model=model,
        temperature=temperature,
        api_key=settings.groq_api_key,
        timeout=settings.llm_timeout_seconds,
        max_retries=settings.llm_max_retries,
    )


def get_chat_model(*, creative: bool = False) -> BaseChatModel:
    """Return a cached ChatGroq instance.

    `creative=True` uses a higher temperature for writing comments; analysis uses a low one.
    """
    settings = get_settings()
    temperature = settings.generation_temperature if creative else settings.analysis_temperature
    return _build(settings.groq_model, temperature)
