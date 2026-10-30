from unittest.mock import AsyncMock, MagicMock

from src.integrations.ai.base import AIProvider
from src.services.answer_generator import NOT_FOUND_MESSAGE, AnswerGenerator
from src.utils.chunk_formatter import ChunkFormatter

CHUNKS = [
    {
        "library_id": 1,
        "library_name": "a.pdf",
        "library_type": "pdf",
        "library_path": "/a",
        "chunk_index": 0,
        "page_number": None,
        "text": "alpha",
    }
]
CHUNK_ON_PAGE_3 = {**CHUNKS[0], "page_number": 3}


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
        assert [b["label"] for b in badges] == ["AI generated", "From your documents"]


class TestStream:
    async def test_streams_provider_tokens_with_question_and_context_in_prompt(self):
        ai = _ai()
        prompts = []

        async def fake_stream(prompt, *args, **kwargs):
            prompts.append(prompt)
            yield "x"
            yield "y"

        ai.stream_chat = fake_stream

        chunks = [CHUNK_ON_PAGE_3]

        tokens = [t async for t in _generator(ai).stream(chunks, "the question")]

        assert tokens == ["x", "y"]
        assert "[1] a.pdf, page 3\nalpha" in prompts[0]
        assert "the question" in prompts[0]
        assert "cite it with its number in square brackets" in prompts[0]
        assert NOT_FOUND_MESSAGE in prompts[0]

    async def test_says_it_could_not_find_the_answer_without_calling_the_model_when_nothing_was_retrieved(self):
        ai = _ai()

        tokens = [t async for t in _generator(ai).stream([], "the question")]

        assert tokens == [NOT_FOUND_MESSAGE]
        ai.stream_chat.assert_not_called()
