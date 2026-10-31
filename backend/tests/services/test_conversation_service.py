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
    conv.active_leaf_id = None
    return conv


def _chain(*turns: tuple[str, str] | tuple[str, str, dict | None]) -> list[SimpleNamespace]:
    """Messages in one straight line: each is the child of the one before it."""
    messages = []
    for index, (role, content, *meta) in enumerate(turns, start=1):
        messages.append(
            SimpleNamespace(id=index, parent_id=index - 1 if index > 1 else None, role=role, content=content, meta=meta[0] if meta else None)
        )
    return messages


class TestConversationService:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.mock_conv_repo = MagicMock(spec_set=ConversationRepositoryProtocol)
        self.mock_lib_repo = MagicMock(spec_set=LibraryRepositoryProtocol)
        self.mock_tier = MagicMock(spec_set=TierServiceProtocol)
        self.mock_ai = MagicMock(spec_set=AIProvider)
        self.mock_answers = MagicMock(spec_set=AnswerGeneratorProtocol)
        self.mock_lib_repo.get_all.return_value = [SimpleNamespace(name="lease.pdf", status="ready")]
        self.mock_conv_repo.get_messages.return_value = []
        self.stored_ids = iter(range(100, 1000))
        self.mock_conv_repo.add_message.side_effect = lambda *a, **k: SimpleNamespace(id=next(self.stored_ids))
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
        msg.parent_id = None
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

        async def fake_stream(chunks, question, history=None):
            yield "hello"
            yield " world"

        with (
            patch.object(self.mock_ai, "get_embedding", AsyncMock(return_value=mock_vector)),
            patch.object(self.mock_answers, "stream", fake_stream),
        ):
            events = []
            async for event in self.svc.ask(1, 1, "question?", None, 5, Plan.FREE):
                events.append(event)

        assert events[0] == ("meta", {"description": "", "badges": [], "sources": []})
        assert ("token", "hello") in events
        assert ("token", " world") in events
        assert events[-1] == ("cited", [])

    async def test_a_question_that_gets_an_answer_stays_counted(self):
        self.mock_conv_repo.get_by_id.return_value = _make_conv(title="My chat")
        self.mock_tier.check_and_log_ask.return_value = 77
        self.mock_lib_repo.get_top_k_chunks.return_value = []

        async def fake_stream(chunks, question, history=None):
            yield "answer"

        with (
            patch.object(self.mock_ai, "get_embedding", AsyncMock(return_value=[0.1])),
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
        stored = self.mock_conv_repo.add_message.call_args_list[-1].args
        assert stored[1] == "assistant"
        assert stored[2] == "Something went wrong. Please try again."
        assert stored[3]["failed"] is True

    async def test_a_question_that_fails_before_any_answer_text_is_refunded(self):
        self.mock_conv_repo.get_by_id.return_value = _make_conv(title="My chat")
        self.mock_tier.check_and_log_ask.return_value = 78
        self.mock_lib_repo.get_top_k_chunks.return_value = []

        async def broken_stream(chunks, question, history=None):
            raise RuntimeError("model went away")
            yield  # pragma: no cover - makes this an async generator

        with (
            patch.object(self.mock_ai, "get_embedding", AsyncMock(return_value=[0.1])),
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

        async def broken_stream(chunks, question, history=None):
            yield "partial"
            raise RuntimeError("model went away")

        with (
            patch.object(self.mock_ai, "get_embedding", AsyncMock(return_value=[0.1])),
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
        self.mock_lib_repo.get_all.return_value = []
        order = []
        self.mock_conv_repo.get_by_id.return_value = _make_conv(title="My chat")
        self.mock_conv_repo.get_messages.side_effect = lambda *a, **k: (order.append("history"), _chain(*history))[1]
        self.mock_conv_repo.get_by_id.return_value.active_leaf_id = len(history) or None
        self.mock_conv_repo.add_message.side_effect = lambda *a, **k: (order.append(f"add:{a[1]}"), SimpleNamespace(id=next(self.stored_ids)))[1]
        seen = {}

        async def fake_general(question, previous):
            seen["question"], seen["history"] = question, previous
            yield "Hello "
            yield "there"

        with (
            patch.object(self.mock_ai, "get_embedding", AsyncMock()) as embed,
            patch.object(self.mock_answers, "stream_general", fake_general),
        ):
            events = [e async for e in self.svc.ask(1, 1, "What is a lien?", None, 5, Plan.FREE)]
        return events, order, seen, embed

    async def test_general_chat_does_not_search_the_documents(self):
        _, _, _, embed = await self._ask_in_general_mode()

        embed.assert_not_called()
        self.mock_lib_repo.get_top_k_chunks.assert_not_called()

    async def test_general_chat_sends_no_sources_and_marks_the_answer_as_general(self):
        events, *_ = await self._ask_in_general_mode()

        assert events[0][1] == {"description": "", "badges": [], "sources": []}
        assert [e for e in events if e[0] == "token"] == [("token", "Hello "), ("token", "there")]
        assert events[-1] == ("cited", [])

    async def test_general_chat_gives_the_model_the_earlier_messages_but_not_the_new_question_twice(self):
        earlier = [("user", "Hi"), ("assistant", "Hello")]

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

    async def _ask(self, answer="from the documents", filters=None, history=()):
        self.mock_conv_repo.get_by_id.return_value = _make_conv(title="My chat")
        self.mock_conv_repo.get_messages.return_value = _chain(*history)
        self.mock_conv_repo.get_by_id.return_value.active_leaf_id = len(history) or None
        self.mock_lib_repo.get_top_k_chunks.return_value = []
        seen = {}

        async def fake_stream(chunks, question, previous=None):
            seen["history"] = previous
            yield answer

        async def fake_general(question, previous):
            yield "from general knowledge"

        with (
            patch.object(self.mock_ai, "get_embedding", AsyncMock(return_value=[0.1])) as embed,
            patch.object(self.mock_answers, "stream", fake_stream),
            patch.object(self.mock_answers, "stream_general", fake_general),
        ):
            events = [e async for e in self.svc.ask(1, 1, "q", filters, 5, Plan.FREE)]
        return events, embed.called, seen

    async def test_with_no_documents_the_question_is_answered_generally(self):
        self.mock_lib_repo.get_all.return_value = []

        events, searched, _ = await self._ask()

        assert searched is False
        assert ("token", "from general knowledge") in events

    async def test_documents_that_are_not_ready_do_not_count(self):
        self.mock_lib_repo.get_all.return_value = [
            SimpleNamespace(name="a.pdf", status="processing"),
            SimpleNamespace(name="b.pdf", status="failed"),
        ]

        _, searched, _ = await self._ask()

        assert searched is False

    async def test_with_documents_every_question_goes_through_the_one_prompt_that_decides(self):
        events, searched, _ = await self._ask()

        assert searched is True
        assert ("token", "from the documents") in events

    async def test_the_earlier_messages_go_to_the_prompt_so_follow_ups_make_sense(self):
        _, _, seen = await self._ask(history=[("user", "What is the rent?"), ("assistant", "Monthly [1].")])

        assert seen["history"] == [("user", "What is the rent?"), ("assistant", "Monthly [1].")]

    async def test_asking_about_one_document_searches_it_even_when_the_library_looks_empty(self):
        from src.schemas.conversation import AskFilters

        self.mock_lib_repo.get_all.return_value = []

        _, searched, _ = await self._ask(filters=AskFilters(doc_id=7))

        assert searched is True

    async def test_an_answer_with_no_citations_is_stored_without_sources_and_marked_nowhere(self):
        events, _, _ = await self._ask(answer="Paris is the capital of France.")

        assert events[0][1] == {"description": "", "badges": [], "sources": []}
        assert events[-1] == ("cited", [])
        stored = next(c for c in self.mock_conv_repo.add_message.call_args_list if c.args[1] == "assistant")
        assert stored.args[3]["sources"] == []
        assert "general" not in stored.args[3]

    async def test_ask_auto_renames_new_conversation(self):
        conv = _make_conv(title="New conversation")
        self.mock_conv_repo.get_by_id.return_value = conv
        mock_vector = [0.1]
        self.mock_lib_repo.get_top_k_chunks.return_value = []

        async def fake_stream(chunks, question, history=None):
            yield "answer"

        with (
            patch.object(self.mock_ai, "get_embedding", AsyncMock(return_value=mock_vector)),
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

        async def fake_stream(chunks, question, history=None):
            yield "answer"

        with (
            patch.object(self.mock_ai, "get_embedding", AsyncMock(return_value=mock_vector)),
            patch.object(self.mock_answers, "stream", fake_stream),
        ):
            async for _ in self.svc.ask(1, 1, "question?", None, 5, Plan.FREE):
                pass

        self.mock_conv_repo.touch.assert_called_once_with(conv)

    async def _ask_with_passages(self, answer: str):
        self.mock_conv_repo.get_by_id.return_value = _make_conv(title="My chat")
        passages = [
            (SimpleNamespace(chunk_index=i, page_number=i + 1, scanned=False, chunk_text=f"passage {i + 1}"),
             SimpleNamespace(id=7, name="lease.pdf", type="pdf", path="/lease.pdf"))
            for i in range(3)
        ]
        self.mock_lib_repo.get_top_k_chunks.return_value = passages

        async def fake_stream(chunks, question, history=None):
            yield answer

        with (
            patch.object(self.mock_ai, "get_embedding", AsyncMock(return_value=[0.1])),
            patch.object(self.mock_answers, "stream", fake_stream),
        ):
            return [event async for event in self.svc.ask(1, 1, "when is rent due?", None, 5, Plan.FREE)]

    async def test_ask_sends_every_retrieved_passage_as_a_numbered_source_up_front(self):
        events = await self._ask_with_passages("Rent is due monthly [2].")

        sources = events[0][1]["sources"]
        assert [s["n"] for s in sources] == [1, 2, 3]
        assert sources[1] == {"n": 2, "doc_id": 7, "name": "lease.pdf", "page": 2, "scanned": False, "quote": "passage 2", "icon": "pdf"}

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


class TestFollowUps:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.conv_repo = MagicMock(spec_set=ConversationRepositoryProtocol)
        self.answers = MagicMock(spec_set=AnswerGeneratorProtocol)
        self.answers.follow_ups = AsyncMock(return_value=["Next?"])
        self.conv_repo.get_by_id.return_value = _make_conv()
        self.svc = ConversationService(
            conv_repo=self.conv_repo,
            lib_repo=MagicMock(spec_set=LibraryRepositoryProtocol),
            tier=MagicMock(spec_set=TierServiceProtocol),
            ai=MagicMock(spec_set=AIProvider),
            answers=self.answers,
            formatter=ChunkFormatter(),
            citations=CitationExtractor(),
        )

    def _history(self, *messages: tuple[str, str, dict | None]) -> None:
        self.conv_repo.get_messages.return_value = _chain(*messages)
        self.conv_repo.get_by_id.return_value.active_leaf_id = len(messages)

    async def test_suggests_questions_after_an_answer(self):
        self._history(("user", "What is the rent?", None), ("assistant", "It is $900.", {"sources": []}))

        result = await self.svc.follow_ups(1, 1)

        assert result.questions == ["Next?"]
        self.answers.follow_ups.assert_awaited_once_with("What is the rent?", "It is $900.")

    async def test_raises_when_the_conversation_is_not_found(self):
        self.conv_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            await self.svc.follow_ups(1, 1)

    async def test_suggests_nothing_when_the_last_message_is_a_question(self):
        self._history(("assistant", "Hi", None), ("user", "What is the rent?", None))

        assert (await self.svc.follow_ups(1, 1)).questions == []
        self.answers.follow_ups.assert_not_awaited()

    async def test_suggests_nothing_after_a_failed_or_not_found_answer(self):
        self._history(("user", "q", None), ("assistant", "Something went wrong.", {"failed": True}))
        assert (await self.svc.follow_ups(1, 1)).questions == []

        self._history(("user", "q", None), ("assistant", NOT_FOUND_MESSAGE, {"sources": []}))
        assert (await self.svc.follow_ups(1, 1)).questions == []
        self.answers.follow_ups.assert_not_awaited()

    async def test_suggests_nothing_when_the_model_fails(self):
        self._history(("user", "q", None), ("assistant", "a", {"sources": []}))
        self.answers.follow_ups.side_effect = RuntimeError("quota")

        assert (await self.svc.follow_ups(1, 1)).questions == []


def _node(id: int, parent_id: int | None, role: str, content: str = "", meta: dict | None = None) -> SimpleNamespace:
    return SimpleNamespace(
        id=id, parent_id=parent_id, role=role, content=content or f"{role} {id}", meta=meta, conversation_id=1,
        created_at=datetime.now(UTC),
    )


class TestMessageVersions:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.conv_repo = MagicMock(spec_set=ConversationRepositoryProtocol)
        self.answers = MagicMock(spec_set=AnswerGeneratorProtocol)
        self.tier = MagicMock(spec_set=TierServiceProtocol)
        self.lib_repo = MagicMock(spec_set=LibraryRepositoryProtocol)
        self.lib_repo.get_all.return_value = []
        self.conv = _make_conv(title="My chat")
        self.conv_repo.get_by_id.return_value = self.conv
        self.ids = iter(range(100, 1000))
        self.conv_repo.set_active_leaf.side_effect = lambda conv, message_id: setattr(conv, "active_leaf_id", message_id)
        self.conv_repo.add_message.side_effect = lambda *a, **k: _node(next(self.ids), a[4] if len(a) > 4 else k.get("parent_id"), a[1], a[2], a[3])
        self.svc = ConversationService(
            conv_repo=self.conv_repo,
            lib_repo=self.lib_repo,
            tier=self.tier,
            ai=MagicMock(spec_set=AIProvider),
            answers=self.answers,
            formatter=ChunkFormatter(),
            citations=CitationExtractor(),
        )

        self.seen = {}

        async def general(question, previous):
            self.seen["question"], self.seen["history"] = question, previous
            yield "new answer"

        self.answers.stream_general = general

    def _tree(self) -> list[SimpleNamespace]:
        """1 Q1 -> 2 A1 -> 3 Q2 -> 4 A2, with 5 an edited Q2 -> 6 its answer, and 7 a retried A1."""
        return [
            _node(1, None, "user", "Q1"),
            _node(2, 1, "assistant", "A1"),
            _node(3, 2, "user", "Q2"),
            _node(4, 3, "assistant", "A2"),
            _node(5, 2, "user", "Q2 edited"),
            _node(6, 5, "assistant", "A2 edited"),
            _node(7, 1, "assistant", "A1 retried"),
        ]

    async def _ask(self, question="next", edit_of=None, retry_of=None):
        return [e async for e in self.svc.ask(1, 1, question, None, 5, Plan.FREE, edit_of, retry_of)]

    def test_messages_show_the_active_path_and_which_version_each_turn_is(self):
        self.conv.active_leaf_id = 4
        self.conv_repo.get_messages.return_value = self._tree()

        visible = self.svc.list_messages(1, 1, Plan.FREE)

        assert [m.id for m in visible] == [1, 2, 3, 4]
        assert [(m.version, m.versions) for m in visible] == [(1, 1), (1, 2), (1, 2), (1, 1)]
        assert visible[2].sibling_ids == [3, 5]

    def test_switching_to_another_version_continues_down_its_newest_branch(self):
        self.conv_repo.get_messages.return_value = self._tree()

        visible = self.svc.select_version(1, 1, 5, Plan.FREE)

        self.conv_repo.set_active_leaf.assert_called_once_with(self.conv, 6)
        assert [m.id for m in visible] == [1, 2, 5, 6]

    def test_switching_to_a_message_that_is_not_in_the_conversation_fails(self):
        self.conv_repo.get_messages.return_value = self._tree()

        with pytest.raises(NotFoundError):
            self.svc.select_version(1, 1, 99, Plan.FREE)

        self.conv_repo.set_active_leaf.assert_not_called()

    async def test_a_new_question_is_stored_after_the_last_message_and_becomes_the_end_of_the_conversation(self):
        self.conv.active_leaf_id = 4
        self.conv_repo.get_messages.return_value = self._tree()

        await self._ask()

        question, answer = self.conv_repo.add_message.call_args_list
        assert question.args[1:3] == ("user", "next") and question.args[4] == 4
        assert answer.args[1] == "assistant" and answer.args[4] == 100
        assert self.conv_repo.set_active_leaf.call_args_list[-1].args[1] == 101
        assert self.seen["history"] == [("user", "Q1"), ("assistant", "A1"), ("user", "Q2"), ("assistant", "A2")]

    async def test_an_edit_is_stored_beside_the_question_it_replaces_and_sees_only_what_came_before(self):
        self.conv.active_leaf_id = 4
        self.conv_repo.get_messages.return_value = self._tree()

        await self._ask("Q2 reworded", edit_of=3)

        question, answer = self.conv_repo.add_message.call_args_list
        assert question.args[1:3] == ("user", "Q2 reworded") and question.args[4] == 2
        assert answer.args[4] == 100
        assert self.seen["history"] == [("user", "Q1"), ("assistant", "A1")]

    async def test_editing_a_first_question_stores_another_first_message(self):
        self.conv.active_leaf_id = 4
        self.conv_repo.get_messages.return_value = self._tree()

        await self._ask("Q1 reworded", edit_of=1)

        assert self.conv_repo.add_message.call_args_list[0].args[4] is None
        assert self.seen["history"] == []

    async def test_a_retry_answers_the_same_question_again_without_storing_it_twice(self):
        self.conv.active_leaf_id = 2
        self.conv_repo.get_messages.return_value = self._tree()

        await self._ask("ignored", retry_of=2)

        [answer] = self.conv_repo.add_message.call_args_list
        assert answer.args[1] == "assistant" and answer.args[4] == 1
        assert self.seen["question"] == "Q1"
        assert self.seen["history"] == []

    async def test_a_retry_of_a_question_is_refused_and_not_charged(self):
        self.conv_repo.get_messages.return_value = self._tree()

        with pytest.raises(NotFoundError):
            await self._ask(retry_of=1)

        self.tier.refund_ask.assert_called_once()
        self.conv_repo.add_message.assert_not_called()

    async def test_an_edit_of_an_answer_is_refused(self):
        self.conv_repo.get_messages.return_value = self._tree()

        with pytest.raises(NotFoundError):
            await self._ask(edit_of=2)

    async def test_a_failed_answer_is_stored_under_the_question_that_failed(self):
        self.conv.active_leaf_id = 4
        self.conv_repo.get_messages.return_value = self._tree()

        async def broken(question, previous):
            raise RuntimeError("model down")
            yield

        self.answers.stream_general = broken

        with pytest.raises(RuntimeError):
            await self._ask()

        failure = self.conv_repo.add_message.call_args_list[-1]
        assert failure.args[3]["failed"] is True
        assert failure.args[4] == 100

    def test_a_branch_copies_the_path_up_to_a_message_into_a_new_conversation(self):
        self.conv_repo.get_messages.return_value = self._tree()
        branch = _make_conv(id=9, title="My chat")
        branch.updated_at = datetime.now(UTC)
        self.conv_repo.create.return_value = branch

        result = self.svc.branch_conversation(1, 1, 5, Plan.FREE)

        self.conv_repo.create.assert_called_once_with(1, "My chat")
        copied = [c.args[1:3] for c in self.conv_repo.add_message.call_args_list]
        assert copied == [("user", "Q1"), ("assistant", "A1"), ("user", "Q2 edited")]
        assert [c.args[4] for c in self.conv_repo.add_message.call_args_list] == [None, 100, 101]
        self.conv_repo.set_active_leaf.assert_called_once_with(branch, 102)
        assert result.id == 9
