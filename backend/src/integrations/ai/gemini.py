import asyncio
import json
import math
from collections.abc import AsyncGenerator
from dataclasses import dataclass

import httpx

from src.config import settings
from src.core.exceptions import TooManyRequestsError
from src.integrations.ai.base import AIProvider

SYSTEM_PROMPT = "You are a helpful assistant."
TIMEOUT = httpx.Timeout(60.0)
EMBED_BATCH_SIZE = 100
RETRYABLE_STATUS = {429, 500, 502, 503, 504}
AT_LIMIT_MESSAGE = "The AI service has reached its limit for now. Please try again later. This question was not counted."


@dataclass(frozen=True)
class RetryPolicy:
    attempts: int
    max_wait_seconds: float


# Indexing runs in the background, so it can wait out a per-minute quota. An answer has someone waiting on it.
PATIENT = RetryPolicy(attempts=6, max_wait_seconds=65.0)
QUICK = RetryPolicy(attempts=2, max_wait_seconds=8.0)


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

    @staticmethod
    def _retry_delay(res: httpx.Response, attempt: int) -> float:
        """How long Google asks us to wait, from the Retry-After header or the error details, else back off."""
        header = res.headers.get("retry-after", "")
        if header.replace(".", "", 1).isdigit():
            return float(header)
        try:
            for detail in res.json().get("error", {}).get("details", []):
                if str(detail.get("@type", "")).endswith("RetryInfo"):
                    return float(str(detail["retryDelay"]).rstrip("s"))
        except (ValueError, KeyError, AttributeError):
            pass
        return float(2**attempt)

    async def _post(self, url: str, body: dict, policy: RetryPolicy = QUICK) -> dict:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            for attempt in range(1, policy.attempts + 1):
                res = await client.post(url, headers=self._headers(), json=body)
                if res.status_code not in RETRYABLE_STATUS or attempt == policy.attempts:
                    if res.status_code == 429 and policy is QUICK:
                        raise TooManyRequestsError(AT_LIMIT_MESSAGE)
                    res.raise_for_status()
                    return res.json()
                await asyncio.sleep(min(max(self._retry_delay(res, attempt), 1.0), policy.max_wait_seconds))
            raise AssertionError("unreachable")

    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        url = self._url(settings.GEMINI_EMBEDDING_MODEL, "batchEmbedContents")
        embeddings: list[list[float]] = []
        for i in range(0, len(texts), EMBED_BATCH_SIZE):
            batch = texts[i : i + EMBED_BATCH_SIZE]
            body = {"requests": [self._embed_request(t, "RETRIEVAL_DOCUMENT") for t in batch]}
            data = await self._post(url, body, PATIENT)
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
            if res.status_code == 429:
                raise TooManyRequestsError(AT_LIMIT_MESSAGE)
            res.raise_for_status()
            async for line in res.aiter_lines():
                if line.startswith("data:"):
                    text = self._extract_text(json.loads(line[len("data:"):]))
                    if text:
                        yield text
