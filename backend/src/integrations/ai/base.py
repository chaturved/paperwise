from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator


class AIProvider(ABC):
    """Contract every AI backend (Gemini, Hugging Face, ...) must implement."""

    @abstractmethod
    async def get_embeddings(self, texts: list[str]) -> list[list[float]]: ...

    @abstractmethod
    async def get_embedding(self, text: str) -> list[float]: ...

    @abstractmethod
    def stream_chat(
        self, prompt: str, temperature: float = 0.7, max_tokens: int = 500
    ) -> AsyncGenerator[str, None]: ...

    @abstractmethod
    async def chat(self, prompt: str, temperature: float = 0.7, max_tokens: int = 200) -> str: ...
