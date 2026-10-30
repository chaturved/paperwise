import json
import math
from collections.abc import AsyncGenerator

import httpx

from src.config import settings
from src.integrations.ai.base import AIProvider

SYSTEM_PROMPT = "You are a helpful assistant."
TIMEOUT = httpx.Timeout(60.0)
EMBED_BATCH_SIZE = 100  # API limit per batchEmbedContents call


class GeminiProvider(AIProvider):
    @staticmethod
    def _headers() -> dict:
        return {"x-goog-api-key": settings.GEMINI_API_KEY, "Content-Type": "application/json"}

    @staticmethod
    def _normalize(vector: list[float]) -> list[float]:
        # Gemini only returns unit-length vectors at full size; reduced dimensions must be normalized.
        norm = math.sqrt(sum(v * v for v in vector)) or 1.0
        return [v / norm for v in vector]

    @staticmethod
    def _embed_request(text: str, task_type: str) -> dict:
        return {
            "model": f"models/{settings.GEMINI_EMBEDDING_MODEL}",
            "content": {"parts": [{"text": text}]},
            "taskType": task_type,
            "outputDimensionality": settings.EMBEDDING_DIMENSIONS,
        }

    @staticmethod
    def _chat_body(prompt: str, temperature: float, max_tokens: int) -> dict:
        return {
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
                # Disable "thinking" so the token budget goes to the visible answer.
                "thinkingConfig": {"thinkingBudget": 0},
            },
        }

    @staticmethod
    def _extract_text(payload: dict) -> str:
        candidates = payload.get("candidates") or []
        if not candidates:
            return ""
        parts = candidates[0].get("content", {}).get("parts", [])
        return "".join(p.get("text", "") for p in parts)

    @staticmethod
    def _url(model: str, action: str) -> str:
        return f"{settings.GEMINI_API_BASE}/models/{model}:{action}"

    async def _post(self, url: str, body: dict) -> dict:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            res = await client.post(url, headers=self._headers(), json=body)
            res.raise_for_status()
            return res.json()

    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        url = self._url(settings.GEMINI_EMBEDDING_MODEL, "batchEmbedContents")
        embeddings: list[list[float]] = []
        for i in range(0, len(texts), EMBED_BATCH_SIZE):
            batch = texts[i : i + EMBED_BATCH_SIZE]
            body = {"requests": [self._embed_request(t, "RETRIEVAL_DOCUMENT") for t in batch]}
            data = await self._post(url, body)
            embeddings.extend(self._normalize(e["values"]) for e in data["embeddings"])
        return embeddings

    async def get_embedding(self, text: str) -> list[float]:
        url = self._url(settings.GEMINI_EMBEDDING_MODEL, "embedContent")
        data = await self._post(url, self._embed_request(text, "RETRIEVAL_QUERY"))
        return self._normalize(data["embedding"]["values"])

    async def chat(self, prompt: str, temperature: float = 0.7, max_tokens: int = 200) -> str:
        url = self._url(settings.GEMINI_CHAT_MODEL, "generateContent")
        data = await self._post(url, self._chat_body(prompt, temperature, max_tokens))
        return self._extract_text(data)

    async def stream_chat(
        self, prompt: str, temperature: float = 0.7, max_tokens: int = 500
    ) -> AsyncGenerator[str, None]:
        url = self._url(settings.GEMINI_CHAT_MODEL, "streamGenerateContent") + "?alt=sse"
        body = self._chat_body(prompt, temperature, max_tokens)
        async with (
            httpx.AsyncClient(timeout=TIMEOUT) as client,
            client.stream("POST", url, headers=self._headers(), json=body) as res,
        ):
            res.raise_for_status()
            async for line in res.aiter_lines():
                if line.startswith("data:"):
                    text = self._extract_text(json.loads(line[len("data:"):]))
                    if text:
                        yield text
