from datetime import datetime
from unittest.mock import MagicMock

import pytest
from sqlalchemy.orm import Session

from src.core.enums import DocumentStatus
from src.models import Library, LibraryChunk
from src.repositories.library_repository import LibraryRepository


class TestLibraryRepository:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.db = MagicMock(spec_set=Session)
        self.repo = LibraryRepository(db=self.db)


    def test_get_all_returns_user_libraries(self):
        expected = [MagicMock(spec=Library), MagicMock(spec=Library)]
        self.db.query.return_value.filter.return_value.all.return_value = expected

        result = self.repo.get_all(user_id=1)

        assert result == expected
        self.db.query.assert_called_once_with(Library)


    def test_get_by_id_returns_matching_library(self):
        expected = MagicMock(spec=Library)
        self.db.query.return_value.filter.return_value.first.return_value = expected

        result = self.repo.get_by_id(doc_id=1, user_id=1)

        assert result == expected

    def test_get_by_id_returns_none_when_not_found(self):
        self.db.query.return_value.filter.return_value.first.return_value = None

        result = self.repo.get_by_id(doc_id=99, user_id=1)

        assert result is None


    def test_add_persists_and_returns_library(self):
        lib = MagicMock(spec=Library)

        result = self.repo.add(lib)

        self.db.add.assert_called_once_with(lib)
        self.db.commit.assert_called_once()
        self.db.refresh.assert_called_once_with(lib)
        assert result == lib


    def test_add_chunks_bulk_saves_and_commits(self):
        chunks: list[LibraryChunk] = [MagicMock(spec=LibraryChunk), MagicMock(spec=LibraryChunk)]

        self.repo.add_chunks(chunks)

        self.db.add_all.assert_called_once_with(chunks)
        self.db.commit.assert_called_once()

    def test_add_chunks_empty_list(self):
        self.repo.add_chunks([])

        self.db.add_all.assert_called_once_with([])
        self.db.commit.assert_called_once()


    def test_delete_removes_and_commits(self):
        lib = MagicMock(spec=Library)

        self.repo.delete(lib)

        self.db.delete.assert_called_once_with(lib)
        self.db.commit.assert_called_once()


    def test_clear_user_library_commits(self):
        lib1, lib2 = MagicMock(), MagicMock()
        lib1.id, lib2.id = 1, 2
        self.db.query.return_value.filter.return_value.all.return_value = [lib1, lib2]

        self.repo.clear_user_library(user_id=1)

        self.db.commit.assert_called_once()


    def test_get_top_k_chunks_returns_results(self):
        expected = [MagicMock(), MagicMock()]
        (
            self.db.query.return_value
            .join.return_value
            .filter.return_value
            .order_by.return_value
            .limit.return_value
            .all.return_value
        ) = expected

        result = self.repo.get_top_k_chunks(user_id=1, query_vector=[0.1, 0.2], top_k=2)

        assert result == expected

    def test_get_top_k_chunks_with_doc_id_filter(self):
        expected = [MagicMock()]
        (
            self.db.query.return_value
            .join.return_value
            .filter.return_value
            .filter.return_value
            .order_by.return_value
            .limit.return_value
            .all.return_value
        ) = expected

        result = self.repo.get_top_k_chunks(user_id=1, query_vector=[0.1], top_k=1, doc_id=5)

        assert result == expected


class TestLibraryRepositoryReembedding:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.db = MagicMock(spec_set=Session)
        self.repo = LibraryRepository(db=self.db)

    def test_get_chunks_after_returns_next_batch(self):
        expected = [MagicMock(spec=LibraryChunk)]
        self.db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = expected

        assert self.repo.get_chunks_after(chunk_id=10, limit=50) == expected
        self.db.query.assert_called_once_with(LibraryChunk)

    def test_set_embeddings_assigns_each_chunk_and_commits(self):
        chunks = [MagicMock(spec=LibraryChunk), MagicMock(spec=LibraryChunk)]

        self.repo.set_embeddings(chunks, [[0.1], [0.2]])

        assert chunks[0].embedding == [0.1]
        assert chunks[1].embedding == [0.2]
        self.db.commit.assert_called_once()


class TestLibraryStatusMethods:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.db = MagicMock(spec_set=Session)
        self.repo = LibraryRepository(db=self.db)

    def test_count_active_returns_the_scalar(self):
        self.db.query.return_value.filter.return_value.scalar.return_value = 3

        assert self.repo.count_active(user_id=1) == 3

    def test_count_active_is_zero_when_there_are_no_rows(self):
        self.db.query.return_value.filter.return_value.scalar.return_value = None

        assert self.repo.count_active(user_id=1) == 0

    def test_get_looks_the_document_up_by_primary_key(self):
        expected = MagicMock(spec=Library)
        self.db.get.return_value = expected

        assert self.repo.get(5) is expected
        self.db.get.assert_called_once_with(Library, 5)

    def test_transition_status_wins_when_one_row_changed(self):
        self.db.query.return_value.filter.return_value.update.return_value = 1

        assert self.repo.transition_status(1, DocumentStatus.UPLOADING, DocumentStatus.PROCESSING) is True
        self.db.commit.assert_called_once()

    def test_transition_status_loses_when_the_status_already_moved(self):
        self.db.query.return_value.filter.return_value.update.return_value = 0

        assert self.repo.transition_status(1, DocumentStatus.UPLOADING, DocumentStatus.PROCESSING) is False

    def test_set_status_records_status_message_and_time(self):
        lib = MagicMock(spec=Library)

        self.repo.set_status(lib, DocumentStatus.FAILED, "could not read")

        assert lib.status == DocumentStatus.FAILED
        assert lib.error_message == "could not read"
        assert lib.status_updated_at is not None
        self.db.commit.assert_called_once()

    def test_finish_processing_saves_text_chunks_and_status_in_one_commit(self):
        lib = MagicMock(spec=Library)
        chunks = [MagicMock(spec=LibraryChunk)]

        self.repo.finish_processing(lib, "the text", "abc123", chunks)

        assert lib.extracted_text == "the text"
        assert lib.content_hash == "abc123"
        assert lib.status == DocumentStatus.READY
        assert lib.error_message is None
        self.db.add_all.assert_called_once_with(chunks)
        self.db.commit.assert_called_once()

    def test_finish_processing_replaces_the_documents_old_chunks_in_the_same_commit(self):
        lib = MagicMock(spec=Library)
        lib.id = 7

        self.repo.finish_processing(lib, "text", "hash", [MagicMock(spec=LibraryChunk)])

        self.db.query.assert_called_once_with(LibraryChunk)
        self.db.query.return_value.filter.return_value.delete.assert_called_once_with(synchronize_session=False)
        self.db.commit.assert_called_once()

    def test_list_stale_returns_matching_documents(self):
        expected = [MagicMock(spec=Library)]
        self.db.query.return_value.filter.return_value.all.return_value = expected

        result = self.repo.list_stale([DocumentStatus.UPLOADING], datetime(2026, 1, 1))

        assert result == expected
