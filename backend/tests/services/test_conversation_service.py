from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.core.enums import Plan
from src.core.exceptions import NotFoundError, PlanLimitError
from src.integrations.ai.base import AIProvider
from src.repositories.conversation_repository import ConversationRepositoryProtocol
from src.repositories.library_repository import LibraryRepositoryProtocol
from src.services.answer_generator import NOT_FOUND_MESSAGE, AnswerGeneratorProtocol
from src.services.conversation_service import ConversationService
from src.services.tier_service import TierServiceProtocol
from src.utils.chunk_formatter import ChunkFormatter
from src.utils.citations import CitationExtractor


def _make_conv(id=1, title="New conversation", days_old=0):
    conv = MagicMock()
    conv.id = id
    conv.title = title
    conv.created_at = datetime.now(UTC) - timedelta(days=days_old)
    return conv


class TestConversationService:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.mock_conv_repo = MagicMock(spec_set=ConversationRepositoryProtocol)
        self.mock_lib_repo = MagicMock(spec_set=LibraryRepositoryProtocol)
        self.mock_tier = MagicMock(spec_set=TierServiceProtocol)
        self.mock_ai = MagicMock(spec_set=AIProvider)
        self.mock_answers = MagicMock(spec_set=AnswerGeneratorProtocol)
        self.svc = ConversationService(
            conv_repo=self.mock_conv_repo,
            lib_repo=self.mock_lib_repo,
            tier=self.mock_tier,
            ai=self.mock_ai,
            answers=self.mock_answers,
            formatter=ChunkFormatter(),
            citations=CitationExtractor(),
        )


    def test_list_conversations_returns_validated_list(self):
        conv = _make_conv()
        conv.updated_at = datetime.now(UTC)
        self.mock_conv_repo.get_all.return_value = [conv]

        result = self.svc.list_conversations(user_id=1)

        self.mock_conv_repo.get_all.assert_called_once_with(1)
        assert len(result) == 1

    def test_list_conversations_empty(self):
        self.mock_conv_repo.get_all.return_value = []

        result = self.svc.list_conversations(user_id=1)

        assert result == []

    def test_search_conversations_returns_message_excerpt(self):
        conv = _make_conv(title="Quarterly report")
        conv.updated_at = datetime.now(UTC)
        self.mock_conv_repo.search.return_value = [(conv, "The revenue grew in the third quarter.")]

        result = self.svc.search_conversations(user_id=7, query="revenue")

        self.mock_conv_repo.search.assert_called_once_with(7, "revenue")
        assert len(result) == 1
        assert result[0].title == "Quarterly report"
        assert "revenue" in result[0].match_excerpt

    def test_search_conversations_ignores_short_query(self):
        assert self.svc.search_conversations(user_id=7, query=" ") == []
        self.mock_conv_repo.search.assert_not_called()


    def test_new_conversation_creates_and_returns(self):
        conv = _make_conv(title="Custom title")
        conv.updated_at = datetime.now(UTC)
        self.mock_conv_repo.create.return_value = conv

        result = self.svc.new_conversation(user_id=1, title="Custom title")

        self.mock_conv_repo.create.assert_called_once_with(1, "Custom title")
        assert result.title == "Custom title"


    def test_rename_conversation_raises_when_not_found(self):
        self.mock_conv_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            self.svc.rename_conversation(conv_id=99, user_id=1, title="New")

    def test_rename_conversation_updates_title(self):
        conv = _make_conv(title="Old")
        conv.updated_at = datetime.now(UTC)
        self.mock_conv_repo.get_by_id.return_value = conv

        renamed = _make_conv(title="New")
        renamed.updated_at = datetime.now(UTC)
        self.mock_conv_repo.update_title.return_value = renamed

        result = self.svc.rename_conversation(conv_id=1, user_id=1, title="New")

        self.mock_conv_repo.update_title.assert_called_once_with(conv, "New")
        assert result.title == "New"


    def test_remove_conversation_raises_when_not_found(self):
        self.mock_conv_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            self.svc.remove_conversation(conv_id=99, user_id=1)

    def test_remove_conversation_deletes_and_returns_message(self):
        conv = _make_conv()
        self.mock_conv_repo.get_by_id.return_value = conv

        result = self.svc.remove_conversation(conv_id=1, user_id=1)

        self.mock_conv_repo.delete.assert_called_once_with(conv)
        assert result.message == "Conversation deleted"


    def test_list_messages_raises_when_conv_not_found(self):
        self.mock_conv_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            self.svc.list_messages(conv_id=99, user_id=1, plan=Plan.FREE)

    def test_list_messages_calls_tier_history_check(self):
        conv = _make_conv(days_old=3)
        self.mock_conv_repo.get_by_id.return_value = conv
        self.mock_conv_repo.get_messages.return_value = []

        self.svc.list_messages(conv_id=1, user_id=1, plan=Plan.FREE)

        self.mock_tier.check_history.assert_called_once_with(Plan.FREE, conv.created_at)

    def test_list_messages_returns_messages(self):
        conv = _make_conv()
        msg = MagicMock()
        msg.id = 1
        msg.conversation_id = 1
        msg.role = "user"
        msg.content = "hello"
        msg.meta = None
        msg.created_at = datetime.now(UTC)
        self.mock_conv_repo.get_by_id.return_value = conv
        self.mock_conv_repo.get_messages.return_value = [msg]

        result = self.svc.list_messages(conv_id=1, user_id=1, plan=Plan.FREE)

        assert len(result) == 1


    async def test_ask_raises_when_conv_not_found(self):
        self.mock_conv_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            async for _ in self.svc.ask(1, 1, "question?", None, 5, Plan.FREE):
                pass

    async def test_ask_yields_meta_then_tokens(self):
        conv = _make_conv(title="New conversation")
        self.mock_conv_repo.get_by_id.return_value = conv

        mock_vector = [0.1, 0.2]
        self.mock_lib_repo.get_top_k_chunks.return_value = []

        async def fake_stream(chunks, question):
            yield "hello"
            yield " world"

        with (
            patch.object(self.mock_ai, "get_embedding", AsyncMock(return_value=mock_vector)),
            patch.object(self.mock_answers, "describe", AsyncMock(return_value=("desc", ["b1"]))),
            patch.object(self.mock_answers, "stream", fake_stream),
        ):
            events = []
            async for event in self.svc.ask(1, 1, "question?", None, 5, Plan.FREE):
                events.append(event)

        assert events[0] == ("meta", {"description": "desc", "badges": ["b1"], "sources": []})
        assert ("token", "hello") in events
        assert ("token", " world") in events
        assert events[-1] == ("cited", [])

    async def test_a_question_that_gets_an_answer_stays_counted(self):
        self.mock_conv_repo.get_by_id.return_value = _make_conv(title="My chat")
        self.mock_tier.check_and_log_ask.return_value = 77
        self.mock_lib_repo.get_top_k_chunks.return_value = []

        async def fake_stream(chunks, question):
            yield "answer"

        with (
            patch.object(self.mock_ai, "get_embedding", AsyncMock(return_value=[0.1])),
            patch.object(self.mock_answers, "describe", AsyncMock(return_value=("", []))),
            patch.object(self.mock_answers, "stream", fake_stream),
        ):
            async for _ in self.svc.ask(1, 1, "question?", None, 5, Plan.FREE):
                pass

        self.mock_tier.refund_ask.assert_not_called()

    async def test_a_question_whose_answer_fails_is_refunded(self):
        self.mock_conv_repo.get_by_id.return_value = _make_conv(title="My chat")
        self.mock_tier.check_and_log_ask.return_value = 77

        with (
            patch.object(self.mock_ai, "get_embedding", AsyncMock(side_effect=RuntimeError("quota"))),
            pytest.raises(RuntimeError),
        ):
            async for _ in self.svc.ask(1, 1, "question?", None, 5, Plan.FREE):
                pass

        self.mock_tier.refund_ask.assert_called_once_with(77)

    async def test_a_question_that_fails_before_any_answer_text_is_refunded(self):
        self.mock_conv_repo.get_by_id.return_value = _make_conv(title="My chat")
        self.mock_tier.check_and_log_ask.return_value = 78
        self.mock_lib_repo.get_top_k_chunks.return_value = []

        async def broken_stream(chunks, question):
            raise RuntimeError("model went away")
            yield  # pragma: no cover - makes this an async generator

        with (
            patch.object(self.mock_ai, "get_embedding", AsyncMock(return_value=[0.1])),
            patch.object(self.mock_answers, "describe", AsyncMock(return_value=("", []))),
            patch.object(self.mock_answers, "stream", broken_stream),
            pytest.raises(RuntimeError),
        ):
            async for _ in self.svc.ask(1, 1, "question?", None, 5, Plan.FREE):
                pass

        self.mock_tier.refund_ask.assert_called_once_with(78)

    async def test_a_question_stays_counted_once_part_of_the_answer_has_been_sent(self):
        self.mock_conv_repo.get_by_id.return_value = _make_conv(title="My chat")
        self.mock_tier.check_and_log_ask.return_value = 79
        self.mock_lib_repo.get_top_k_chunks.return_value = []

        async def broken_stream(chunks, question):
            yield "partial"
            raise RuntimeError("model went away")

        with (
            patch.object(self.mock_ai, "get_embedding", AsyncMock(return_value=[0.1])),
            patch.object(self.mock_answers, "describe", AsyncMock(return_value=("", []))),
            patch.object(self.mock_answers, "stream", broken_stream),
            pytest.raises(RuntimeError),
        ):
            async for _ in self.svc.ask(1, 1, "question?", None, 5, Plan.FREE):
                pass

        self.mock_tier.refund_ask.assert_not_called()

    async def test_a_question_over_the_limit_is_refused_without_a_refund(self):
        self.mock_conv_repo.get_by_id.return_value = _make_conv(title="My chat")
        self.mock_tier.check_and_log_ask.side_effect = PlanLimitError("queries")

        with pytest.raises(PlanLimitError):
            async for _ in self.svc.ask(1, 1, "question?", None, 5, Plan.FREE):
                pass

        self.mock_tier.refund_ask.assert_not_called()
        self.mock_conv_repo.add_message.assert_not_called()

    async def _ask_in_general_mode(self, history=()):
        order = []
        self.mock_conv_repo.get_by_id.return_value = _make_conv(title="My chat")
        self.mock_conv_repo.get_recent_messages.side_effect = lambda *a, **k: (order.append("history"), list(history))[1]
        self.mock_conv_repo.add_message.side_effect = lambda *a, **k: order.append(f"add:{a[1]}")
        seen = {}

        async def fake_general(question, previous):
            seen["question"], seen["history"] = question, previous
            yield "Hello "
            yield "there"

        with (
            patch.object(self.mock_ai, "get_embedding", AsyncMock()) as embed,
            patch.object(self.mock_answers, "describe", AsyncMock()) as describe,
            patch.object(self.mock_answers, "stream_general", fake_general),
        ):
            events = [e async for e in self.svc.ask(1, 1, "What is a lien?", None, 5, Plan.FREE, use_documents=False)]
        return events, order, seen, embed, describe

    async def test_general_chat_does_not_search_or_describe_the_documents(self):
        _, _, _, embed, describe = await self._ask_in_general_mode()

        embed.assert_not_called()
        describe.assert_not_called()
        self.mock_lib_repo.get_top_k_chunks.assert_not_called()

    async def test_general_chat_sends_no_sources_and_says_the_answer_is_not_from_the_documents(self):
        events, *_ = await self._ask_in_general_mode()

        meta = events[0][1]
        assert meta["sources"] == []
        assert meta["general"] is True
        assert "not based on your documents" in meta["description"]
        assert "Not from your documents" in [b["label"] for b in meta["badges"]]
        assert [e for e in events if e[0] == "token"] == [("token", "Hello "), ("token", "there")]
        assert events[-1] == ("cited", [])

    async def test_general_chat_gives_the_model_the_earlier_messages_but_not_the_new_question_twice(self):
        earlier = [SimpleNamespace(role="user", content="Hi"), SimpleNamespace(role="assistant", content="Hello")]

        _, order, seen, *_ = await self._ask_in_general_mode(history=earlier)

        assert seen["history"] == [("user", "Hi"), ("assistant", "Hello")]
        assert seen["question"] == "What is a lien?"
        assert order.index("history") < order.index("add:user")

    async def test_general_answers_are_stored_without_sources(self):
        await self._ask_in_general_mode()

        stored = next(c for c in self.mock_conv_repo.add_message.call_args_list if c.args[1] == "assistant")
        assert stored.args[2] == "Hello there"
        assert stored.args[3]["sources"] == []
        assert stored.args[3]["cited"] == []

    async def test_ask_auto_renames_new_conversation(self):
        conv = _make_conv(title="New conversation")
        self.mock_conv_repo.get_by_id.return_value = conv
        mock_vector = [0.1]
        self.mock_lib_repo.get_top_k_chunks.return_value = []

        async def fake_stream(chunks, question):
            yield "answer"

        with (
            patch.object(self.mock_ai, "get_embedding", AsyncMock(return_value=mock_vector)),
            patch.object(self.mock_answers, "describe", AsyncMock(return_value=("", []))),
            patch.object(self.mock_answers, "stream", fake_stream),
        ):
            async for _ in self.svc.ask(1, 1, "A long question here?", None, 5, Plan.FREE):
                pass

        self.mock_conv_repo.update_title.assert_called_once()

    async def test_ask_touches_existing_conversation(self):
        conv = _make_conv(title="My chat")
        self.mock_conv_repo.get_by_id.return_value = conv
        mock_vector = [0.1]
        self.mock_lib_repo.get_top_k_chunks.return_value = []

        async def fake_stream(chunks, question):
            yield "answer"

        with (
            patch.object(self.mock_ai, "get_embedding", AsyncMock(return_value=mock_vector)),
            patch.object(self.mock_answers, "describe", AsyncMock(return_value=("", []))),
            patch.object(self.mock_answers, "stream", fake_stream),
        ):
            async for _ in self.svc.ask(1, 1, "question?", None, 5, Plan.FREE):
                pass

        self.mock_conv_repo.touch.assert_called_once_with(conv)

    async def _ask_with_passages(self, answer: str):
        self.mock_conv_repo.get_by_id.return_value = _make_conv(title="My chat")
        passages = [
            (SimpleNamespace(chunk_index=i, page_number=i + 1, chunk_text=f"passage {i + 1}"),
             SimpleNamespace(id=7, name="lease.pdf", type="pdf", path="/lease.pdf"))
            for i in range(3)
        ]
        self.mock_lib_repo.get_top_k_chunks.return_value = passages

        async def fake_stream(chunks, question):
            yield answer

        with (
            patch.object(self.mock_ai, "get_embedding", AsyncMock(return_value=[0.1])),
            patch.object(self.mock_answers, "describe", AsyncMock(return_value=("desc", []))),
            patch.object(self.mock_answers, "stream", fake_stream),
        ):
            return [event async for event in self.svc.ask(1, 1, "when is rent due?", None, 5, Plan.FREE)]

    async def test_ask_sends_every_retrieved_passage_as_a_numbered_source_up_front(self):
        events = await self._ask_with_passages("Rent is due monthly [2].")

        sources = events[0][1]["sources"]
        assert [s["n"] for s in sources] == [1, 2, 3]
        assert sources[1] == {"n": 2, "doc_id": 7, "name": "lease.pdf", "page": 2, "quote": "passage 2", "icon": "pdf"}

    async def test_ask_reports_only_citations_that_match_a_real_source(self):
        events = await self._ask_with_passages("Rent is due monthly [2], plus a late fee [9].")

        assert events[-1] == ("cited", [2])

    async def test_ask_stores_only_the_cited_sources_with_the_answer(self):
        await self._ask_with_passages("Rent is due monthly [2].")

        stored = self.mock_conv_repo.add_message.call_args_list[-1].args[3]
        assert [s["n"] for s in stored["sources"]] == [2]
        assert stored["cited"] == [2]

    async def test_ask_does_not_cite_anything_when_the_answer_says_it_was_not_found(self):
        events = await self._ask_with_passages(f"{NOT_FOUND_MESSAGE} [1]")

        assert events[-1] == ("cited", [])
        assert self.mock_conv_repo.add_message.call_args_list[-1].args[3]["sources"] == []
