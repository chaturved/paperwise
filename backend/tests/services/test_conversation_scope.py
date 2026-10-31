import pytest
from pydantic import ValidationError

from src.schemas.conversation import AskFilters
from src.services.conversation_service import ConversationService


class TestScope:
    def test_no_filters_searches_everything(self):
        assert ConversationService._scope(None) is None
        assert ConversationService._scope(AskFilters()) is None

    def test_single_document_is_kept(self):
        assert ConversationService._scope(AskFilters(doc_id=4)) == [4]

    def test_several_documents_are_kept_in_order(self):
        assert ConversationService._scope(AskFilters(doc_ids=[3, 1, 2])) == [3, 1, 2]

    def test_single_and_several_are_merged_without_duplicates(self):
        assert ConversationService._scope(AskFilters(doc_id=1, doc_ids=[1, 2])) == [1, 2]

    def test_too_many_documents_are_rejected(self):
        with pytest.raises(ValidationError):
            AskFilters(doc_ids=list(range(21)))
