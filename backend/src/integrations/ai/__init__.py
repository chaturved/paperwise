"""AI provider adapter.

Services receive an `AIProvider` through dependency injection:

    ai: AIProvider = Depends(get_ai_provider)

and never know which vendor answers. To add a provider: subclass `AIProvider`
(see base.py), register it in `AIProviderFactory.PROVIDERS` (factory.py), and set `AI_PROVIDER`.
"""
from src.integrations.ai.base import AIProvider
from src.integrations.ai.factory import AIProviderFactory


def get_ai_provider() -> AIProvider:
    """FastAPI dependency — builds the configured provider for each request."""
    return AIProviderFactory.create()
