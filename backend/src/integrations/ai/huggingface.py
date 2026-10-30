import ssl
from collections.abc import AsyncGenerator

import certifi
from huggingface_hub import AsyncInferenceClient

from src.config import settings
from src.integrations.ai.base import AIProvider

SYSTEM_PROMPT = "You are a helpful assistant."


class HuggingFaceProvider(AIProvider):
    def __init__(self) -> None:
        self._use_certifi_bundle()
        self.client = AsyncInferenceClient(api_key=settings.HF_API_KEY)

    @staticmethod
    def _use_certifi_bundle() -> None:
        # Fix SSL certificate verification on macOS with Python 3.11.
        # Providers are built per request, so only patch once per process.
        if getattr(ssl.create_default_context, "uses_certifi", False):
            return
        original = ssl.create_default_context

        def create_default_context(*args, **kwargs):
            kwargs["cafile"] = certifi.where()
            return original(*args, **kwargs)

        create_default_context.uses_certifi = True  # type: ignore[attr-defined]
        ssl.create_default_context = create_default_context

    @staticmethod
    def _to_list(vector: object) -> list[float]:
        return vector.tolist() if hasattr(vector, "tolist") else list(vector)  # type: ignore[arg-type]

    @staticmethod
    def _messages(prompt: str) -> list:
        return [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]

    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        result = await self.client.feature_extraction(texts, model=settings.HF_EMBEDDING_MODEL)
        return [self._to_list(v) for v in result]

    async def get_embedding(self, text: str) -> list[float]:
        result = await self.client.feature_extraction(text, model=settings.HF_EMBEDDING_MODEL)
        return self._to_list(result)

    async def stream_chat(
        self, prompt: str, temperature: float = 0.7, max_tokens: int = 500
    ) -> AsyncGenerator[str, None]:
        stream = await self.client.chat_completion(
            self._messages(prompt),
            model=settings.HF_CHAT_MODEL,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        )
        async for event in stream:
            for choice in event.choices:
                if choice.delta.content:
                    yield choice.delta.content

    async def chat(self, prompt: str, temperature: float = 0.7, max_tokens: int = 200) -> str:
        response = await self.client.chat_completion(
            self._messages(prompt),
            model=settings.HF_CHAT_MODEL,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=False,
        )
        return response.choices[0].message.content or ""
