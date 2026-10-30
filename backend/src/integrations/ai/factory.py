from typing import Dict, Type

from src.config import settings
from src.integrations.ai.base import AIProvider
from src.integrations.ai.gemini import GeminiProvider
from src.integrations.ai.huggingface import HuggingFaceProvider


class AIProviderFactory:
    PROVIDERS: Dict[str, Type[AIProvider]] = {
        "gemini": GeminiProvider,
        "huggingface": HuggingFaceProvider,
    }

    @classmethod
    def create(cls) -> AIProvider:
        name = settings.AI_PROVIDER.lower()
        if name not in cls.PROVIDERS:
            raise ValueError(f"Unknown AI_PROVIDER '{name}'. Choose one of: {', '.join(cls.PROVIDERS)}")
        return cls.PROVIDERS[name]()
