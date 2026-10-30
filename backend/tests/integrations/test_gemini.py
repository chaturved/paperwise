import json
from unittest.mock import patch

import httpx
import pytest

from src.integrations.ai.gemini import GeminiProvider


def _provider_with(handler):
    """GeminiProvider whose HTTP calls are answered by `handler` instead of the network."""
    real_client = httpx.AsyncClient
    patcher = patch(
        "src.integrations.ai.gemini.httpx.AsyncClient",
        lambda **kw: real_client(transport=httpx.MockTransport(handler), **kw),
    )
    patcher.start()
    return GeminiProvider(), patcher


@pytest.fixture
def requests_seen():
    return []


def _text_payload(text: str) -> dict:
    return {"candidates": [{"content": {"parts": [{"text": text}]}}]}


class TestGeminiProvider:
    async def test_get_embedding_normalizes_and_uses_query_task(self, requests_seen):
        def handler(req):
            requests_seen.append(json.loads(req.content))
            return httpx.Response(200, json={"embedding": {"values": [3.0, 4.0]}})

        provider, patcher = _provider_with(handler)
        try:
            result = await provider.get_embedding("hello")
        finally:
            patcher.stop()

        assert result == [0.6, 0.8]
        assert requests_seen[0]["taskType"] == "RETRIEVAL_QUERY"
        assert requests_seen[0]["outputDimensionality"] == 384

    async def test_get_embeddings_batches_in_groups_of_100(self, requests_seen):
        def handler(req):
            body = json.loads(req.content)
            requests_seen.append(body)
            return httpx.Response(200, json={"embeddings": [{"values": [1.0, 0.0]} for _ in body["requests"]]})

        provider, patcher = _provider_with(handler)
        try:
            result = await provider.get_embeddings([f"chunk {i}" for i in range(250)])
        finally:
            patcher.stop()

        assert len(result) == 250
        assert [len(r["requests"]) for r in requests_seen] == [100, 100, 50]
        assert requests_seen[0]["requests"][0]["taskType"] == "RETRIEVAL_DOCUMENT"

    async def test_chat_returns_text_and_sends_api_key_header(self, requests_seen):
        def handler(req):
            requests_seen.append(req)
            return httpx.Response(200, json=_text_payload("hi there"))

        provider, patcher = _provider_with(handler)
        try:
            result = await provider.chat("hello")
        finally:
            patcher.stop()

        assert result == "hi there"
        assert "x-goog-api-key" in requests_seen[0].headers

    async def test_chat_returns_empty_string_when_no_candidates(self):
        provider, patcher = _provider_with(lambda req: httpx.Response(200, json={}))
        try:
            assert await provider.chat("hello") == ""
        finally:
            patcher.stop()

    async def test_stream_chat_yields_tokens_in_order(self):
        sse = "".join(f"data: {json.dumps(_text_payload(t))}\n\n" for t in ["a", "b", "c"])
        provider, patcher = _provider_with(lambda req: httpx.Response(200, text=sse))
        try:
            tokens = [t async for t in provider.stream_chat("hello")]
        finally:
            patcher.stop()

        assert tokens == ["a", "b", "c"]

    async def test_http_error_is_raised(self):
        provider, patcher = _provider_with(lambda req: httpx.Response(429, json={"error": "quota"}))
        try:
            with pytest.raises(httpx.HTTPStatusError):
                await provider.chat("hello")
        finally:
            patcher.stop()
