import pytest

from src.integrations.ai import get_ai_provider
from src.integrations.ai.factory import AIProviderFactory
from src.integrations.ai.gemini import GeminiProvider
from src.integrations.ai.huggingface import HuggingFaceProvider


class TestAIProviderFactory:
    @pytest.mark.parametrize(
        "name, expected",
        [
            ("gemini", GeminiProvider),
            ("GEMINI", GeminiProvider),
            ("huggingface", HuggingFaceProvider),
        ],
    )
    def test_create_returns_configured_provider(self, monkeypatch, name, expected):
        monkeypatch.setattr("src.integrations.ai.factory.settings.AI_PROVIDER", name)

        assert isinstance(AIProviderFactory.create(), expected)

    def test_create_raises_for_unknown_provider(self, monkeypatch):
        monkeypatch.setattr("src.integrations.ai.factory.settings.AI_PROVIDER", "nope")

        with pytest.raises(ValueError, match="Unknown AI_PROVIDER"):
            AIProviderFactory.create()

    def test_get_ai_provider_builds_a_provider_per_call(self, monkeypatch):
        monkeypatch.setattr("src.integrations.ai.factory.settings.AI_PROVIDER", "gemini")

        assert get_ai_provider() is not get_ai_provider()
