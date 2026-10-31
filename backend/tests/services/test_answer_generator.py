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

    async def test_asks_for_exact_wording_and_no_legal_advice(self):
        ai = _ai()
        prompts = []

        async def fake_stream(prompt, *args, **kwargs):
            prompts.append(prompt)
            yield "x"

        ai.stream_chat = fake_stream

        _ = [t async for t in _generator(ai).stream([CHUNK_ON_PAGE_3], "q")]

        assert "give the exact figure or wording" in prompts[0]
        assert "Do not give legal advice" in prompts[0]
        assert "say which part is missing" in prompts[0]

    async def test_says_it_could_not_find_the_answer_without_calling_the_model_when_nothing_was_retrieved(self):
        ai = _ai()

        tokens = [t async for t in _generator(ai).stream([], "the question")]

        assert tokens == [NOT_FOUND_MESSAGE]
        ai.stream_chat.assert_not_called()


class TestStreamGeneral:
    async def _prompt_for(self, question, history):
        ai = _ai()
        prompts = []

        async def fake_stream(prompt, *args, **kwargs):
            prompts.append(prompt)
            yield "x"
            yield "y"

        ai.stream_chat = fake_stream
        tokens = [t async for t in _generator(ai).stream_general(question, history)]
        return tokens, prompts[0]

    async def test_answers_without_documents_and_does_not_search_them(self):
        tokens, prompt = await self._prompt_for("What is a lien?", [])

        assert tokens == ["x", "y"]
        assert "What is a lien?" in prompt
        assert "has not added any documents yet" in prompt
        assert "never cite sources" in prompt
        assert "Conversation so far" not in prompt

    async def test_includes_the_conversation_so_far_so_follow_ups_make_sense(self):
        history = [("user", "What is a lien?"), ("assistant", "A claim on property.")]

        _, prompt = await self._prompt_for("Who can place one?", history)

        assert "User: What is a lien?" in prompt
        assert "Assistant: A claim on property." in prompt
        assert prompt.rstrip().endswith("User: Who can place one?\nAssistant:")

    async def test_long_earlier_messages_are_shortened(self):
        _, prompt = await self._prompt_for("q", [("assistant", "z" * 5000)])

        assert "z" * 1500 in prompt
        assert "z" * 1501 not in prompt


class TestStreamDecidesWhatKindOfQuestionItIs:
    async def _prompt(self, history=None):
        ai = _ai()
        prompts = []

        async def fake_stream(prompt, *args, **kwargs):
            prompts.append(prompt)
            yield "x"

        ai.stream_chat = fake_stream
        _ = [t async for t in _generator(ai).stream([CHUNK_ON_PAGE_3], "And the deposit?", history)]
        return prompts[0]

    async def test_one_prompt_covers_document_questions_and_general_ones(self):
        prompt = await self._prompt()

        assert "First decide what kind of question this is" in prompt
        assert "answer using only the excerpts" in prompt
        assert "If the question is not about the documents" in prompt
        assert "Do not cite the excerpts" in prompt
        assert NOT_FOUND_MESSAGE in prompt

    async def test_the_conversation_so_far_is_included_for_follow_ups(self):
        prompt = await self._prompt([("user", "What is the rent?"), ("assistant", "Monthly [1].")])

        assert "Conversation so far:\nUser: What is the rent?\nAssistant: Monthly [1]." in prompt
        assert prompt.index("Conversation so far") < prompt.index("User's actual question: And the deposit?")

    async def test_there_is_no_conversation_section_when_there_is_no_history(self):
        assert "Conversation so far" not in await self._prompt()


class TestFollowUps:
    async def test_returns_the_questions_the_model_suggests(self):
        ai = _ai()
        ai.chat = AsyncMock(return_value='["What is the notice period?", "Who pays the deposit?"]')

        questions = await _generator(ai).follow_ups("What is the rent?", "The rent is $900 [1].")

        assert questions == ["What is the notice period?", "Who pays the deposit?"]

    async def test_reads_a_reply_wrapped_in_a_code_fence(self):
        ai = _ai()
        ai.chat = AsyncMock(return_value='```json\n["When does it end?"]\n```')

        assert await _generator(ai).follow_ups("q", "a") == ["When does it end?"]

    async def test_drops_repeats_the_asked_question_and_long_ones_and_keeps_three(self):
        ai = _ai()
        ai.chat = AsyncMock(return_value='["Same?", "One?", "One?", "' + "x" * 200 + '", "Two?", "Three?", "Four?"]')

        assert await _generator(ai).follow_ups("Same?", "a") == ["One?", "Two?", "Three?"]

    async def test_returns_nothing_when_the_reply_is_not_a_list(self):
        ai = _ai()
        ai.chat = AsyncMock(return_value="Sorry, I can't.")

        assert await _generator(ai).follow_ups("q", "a") == []
