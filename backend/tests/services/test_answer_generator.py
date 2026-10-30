from unittest.mock import AsyncMock, MagicMock

from src.integrations.ai.base import AIProvider
from src.services.answer_generator import AnswerGenerator
from src.utils.chunk_formatter import ChunkFormatter

CHUNKS = [{"library_name": "a.pdf", "library_type": "pdf", "library_path": "/a", "chunk_index": 0, "text": "alpha"}]


def _ai() -> MagicMock:
    return MagicMock(spec_set=AIProvider)


def _generator(ai: MagicMock) -> AnswerGenerator:
    return AnswerGenerator(ai=ai, formatter=ChunkFormatter())


class TestDescribe:
    async def test_returns_defaults_without_calling_ai_when_no_chunks(self):
        ai = _ai()

        title, badges = await _generator(ai).describe([], "q")

        assert title == "No relevant information found."
        assert badges == []
        ai.chat.assert_not_called()

    async def test_parses_json_from_model(self):
        ai = _ai()
        ai.chat = AsyncMock(return_value='{"title": "T", "badges": [{"label": "L", "icon": "bot"}]}')

        title, badges = await _generator(ai).describe(CHUNKS, "q")

        assert title == "T"
        assert badges == [{"label": "L", "icon": "bot"}]

    async def test_falls_back_when_model_returns_invalid_json(self):
        ai = _ai()
        ai.chat = AsyncMock(return_value="not json at all")

        title, badges = await _generator(ai).describe(CHUNKS, "q")

        assert title == "Found 1 relevant sections from your library."
        assert [b["icon"] for b in badges] == ["bot", "shield"]


class TestStream:
    async def test_streams_provider_tokens_with_question_and_context_in_prompt(self):
        ai = _ai()
        prompts = []

        async def fake_stream(prompt, *args, **kwargs):
            prompts.append(prompt)
            yield "x"
            yield "y"

        ai.stream_chat = fake_stream

        tokens = [t async for t in _generator(ai).stream("the context", "the question")]

        assert tokens == ["x", "y"]
        assert "the context" in prompts[0] and "the question" in prompts[0]
