import ssl
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from src.integrations.ai.huggingface import HuggingFaceProvider


def _provider() -> HuggingFaceProvider:
    provider = HuggingFaceProvider()
    provider.client = MagicMock()
    return provider


def _event(content):
    return SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content=content))])


class TestHuggingFaceProvider:
    async def test_embeddings_are_converted_to_plain_lists(self):
        provider = _provider()
        array_like = MagicMock(tolist=MagicMock(return_value=[0.1, 0.2]))
        provider.client.feature_extraction = AsyncMock(return_value=[array_like, (0.3, 0.4)])

        assert await provider.get_embeddings(["a", "b"]) == [[0.1, 0.2], [0.3, 0.4]]

    async def test_get_embedding_converts_single_vector(self):
        provider = _provider()
        provider.client.feature_extraction = AsyncMock(return_value=MagicMock(tolist=MagicMock(return_value=[0.5])))

        assert await provider.get_embedding("a") == [0.5]

    async def test_chat_returns_message_content(self):
        provider = _provider()
        response = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content="hello"))])
        provider.client.chat_completion = AsyncMock(return_value=response)

        assert await provider.chat("hi") == "hello"

    async def test_stream_chat_skips_empty_deltas(self):
        provider = _provider()

        async def stream():
            for content in ["a", None, "b"]:
                yield _event(content)

        provider.client.chat_completion = AsyncMock(return_value=stream())

        assert [t async for t in provider.stream_chat("hi")] == ["a", "b"]

    def test_certifi_patch_is_applied_only_once(self):
        HuggingFaceProvider()
        patched = ssl.create_default_context

        HuggingFaceProvider()

        assert ssl.create_default_context is patched
