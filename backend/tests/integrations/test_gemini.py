import json
from unittest.mock import AsyncMock, patch

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


@pytest.fixture
def waits():
    """Replaces the real sleep so retry tests are instant, and records how long each wait would have been."""
    recorded: list[float] = []

    async def fake_sleep(seconds):
        recorded.append(seconds)

    with patch("src.integrations.ai.gemini.asyncio.sleep", AsyncMock(side_effect=fake_sleep)):
        yield recorded


def _busy(retry_delay: str | None = None, headers: dict | None = None) -> httpx.Response:
    details = [{"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": retry_delay}] if retry_delay else []
    return httpx.Response(429, json={"error": {"code": 429, "details": details}}, headers=headers or {})


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

    async def test_http_error_is_raised(self, waits):
        provider, patcher = _provider_with(lambda req: httpx.Response(429, json={"error": "quota"}))
        try:
            with pytest.raises(httpx.HTTPStatusError):
                await provider.chat("hello")
        finally:
            patcher.stop()

    async def test_a_busy_response_is_retried_after_the_wait_google_asks_for(self, waits):
        answers = iter([_busy(retry_delay="6s"), httpx.Response(200, json=_text_payload("ok"))])
        provider, patcher = _provider_with(lambda req: next(answers))
        try:
            result = await provider.chat("hello")
        finally:
            patcher.stop()

        assert result == "ok"
        assert waits == [6.0]

    async def test_the_retry_after_header_is_used_when_there_are_no_details(self, waits):
        answers = iter([_busy(headers={"retry-after": "5"}), httpx.Response(200, json=_text_payload("ok"))])
        provider, patcher = _provider_with(lambda req: next(answers))
        try:
            await provider.chat("hello")
        finally:
            patcher.stop()

        assert waits == [5.0]

    async def test_an_answer_gives_up_quickly_instead_of_keeping_the_user_waiting(self, requests_seen, waits):
        def handler(req):
            requests_seen.append(req)
            return _busy(retry_delay="50s")

        provider, patcher = _provider_with(handler)
        try:
            with pytest.raises(httpx.HTTPStatusError):
                await provider.chat("hello")
        finally:
            patcher.stop()

        assert len(requests_seen) == 2
        assert waits == [8.0]

    async def test_indexing_waits_out_a_per_minute_quota_across_several_batches(self, requests_seen, waits):
        busy_batches = iter([True, True, True])

        def handler(req):
            body = json.loads(req.content)
            requests_seen.append(body)
            if next(busy_batches, False):
                return _busy(retry_delay="30s")
            return httpx.Response(200, json={"embeddings": [{"values": [1.0, 0.0]} for _ in body["requests"]]})

        provider, patcher = _provider_with(handler)
        try:
            result = await provider.get_embeddings([f"chunk {i}" for i in range(150)])
        finally:
            patcher.stop()

        assert len(result) == 150
        assert waits == [30.0, 30.0, 30.0]
        assert len(requests_seen) == 5

    async def test_indexing_gives_up_after_its_attempts_run_out(self, requests_seen, waits):
        def handler(req):
            requests_seen.append(req)
            return _busy(retry_delay="30s")

        provider, patcher = _provider_with(handler)
        try:
            with pytest.raises(httpx.HTTPStatusError):
                await provider.get_embeddings(["only chunk"])
        finally:
            patcher.stop()

        assert len(requests_seen) == 6

    async def test_a_request_that_is_wrong_is_not_retried(self, requests_seen, waits):
        def handler(req):
            requests_seen.append(req)
            return httpx.Response(400, json={"error": {"message": "bad request"}})

        provider, patcher = _provider_with(handler)
        try:
            with pytest.raises(httpx.HTTPStatusError):
                await provider.chat("hello")
        finally:
            patcher.stop()

        assert len(requests_seen) == 1
        assert waits == []
