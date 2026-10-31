from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest

from src.config import settings
from src.core.enums import DocumentStatus, Plan
from src.core.exceptions import (
    BadRequestError,
    ConflictError,
    NotFoundError,
    PlanLimitError,
)
from src.integrations.documents import ContentTypes
from src.integrations.storage import S3Storage, StorageError
from src.repositories.library_repository import LibraryRepositoryProtocol
from src.schemas.library import CreateUploadsRequest, UploadFileRequest
from src.services.library_service import LibraryService
from src.services.tier_service import TierServiceProtocol


def _make_lib(id=1, name="doc.pdf", type="pdf", size=1024, path: str | None = "/tmp/doc.pdf"):
    lib = MagicMock()
    lib.id = id
    lib.name = name
    lib.type = type
    lib.size = size
    lib.path = path
    lib.created_at = datetime(2024, 1, 1, tzinfo=UTC)
    lib.status = "ready"
    lib.error_message = None
    return lib


class TestLibraryService:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.mock_repo = MagicMock(spec_set=LibraryRepositoryProtocol)
        self.mock_repo.get_by_content_hash.return_value = None
        self.mock_repo.page_counts.return_value = {}
        self.mock_tier = MagicMock(spec_set=TierServiceProtocol)
        self.mock_storage = MagicMock(spec_set=S3Storage)
        self.svc = LibraryService(
            repo=self.mock_repo, tier=self.mock_tier, storage=self.mock_storage, content_types=ContentTypes()
        )

    def test_get_library_data_aggregates_size_and_count(self):
        lib1 = _make_lib(id=1, size=100)
        lib2 = _make_lib(id=2, size=200)
        self.mock_repo.get_all.return_value = [lib1, lib2]

        result = self.svc.get_library_data(user_id=1)

        assert result.count == 2
        assert result.total_size_bytes == 300
        assert len(result.sections) == 2

    def test_get_library_data_includes_the_page_count_when_the_document_has_pages(self):
        self.mock_repo.get_all.return_value = [_make_lib(id=1), _make_lib(id=2, type="docx")]
        self.mock_repo.page_counts.return_value = {1: 12}

        result = self.svc.get_library_data(user_id=1)

        assert [doc.pages for doc in result.sections] == [12, None]

    def test_get_library_data_empty_library(self):
        self.mock_repo.get_all.return_value = []

        result = self.svc.get_library_data(user_id=1)

        assert result.count == 0
        assert result.total_size_bytes == 0
        assert result.sections == []

    def test_delete_document_raises_when_not_found(self):
        self.mock_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            self.svc.delete_document(doc_id=99, user_id=1)

    def test_delete_document_deletes_file_and_record(self):
        lib = _make_lib(path="/tmp/doc.pdf")
        self.mock_repo.get_by_id.return_value = lib

        result = self.svc.delete_document(doc_id=1, user_id=1)

        self.mock_storage.delete_file.assert_called_once_with("/tmp/doc.pdf")
        self.mock_repo.delete.assert_called_once_with(lib)
        assert result.message == "Document deleted"

    def test_delete_document_skips_delete_file_when_no_path(self):
        lib = _make_lib(path=None)
        self.mock_repo.get_by_id.return_value = lib

        self.svc.delete_document(doc_id=1, user_id=1)

        self.mock_storage.delete_file.assert_not_called()
        self.mock_repo.delete.assert_called_once_with(lib)

    def test_clear_all_deletes_all_files_and_clears_repo(self):
        libs = [_make_lib(id=1, path="/tmp/a.pdf"), _make_lib(id=2, path="/tmp/b.pdf")]
        self.mock_repo.get_all.return_value = libs

        result = self.svc.clear_all(user_id=1)

        assert self.mock_storage.delete_file.call_count == 2
        self.mock_repo.clear_user_library.assert_called_once_with(1)
        assert result.message == "Library cleared"

    def test_clear_all_continues_when_delete_file_fails(self):
        libs = [_make_lib(id=1, path="/tmp/a.pdf"), _make_lib(id=2, path="/tmp/b.pdf")]
        self.mock_repo.get_all.return_value = libs

        self.mock_storage.delete_file.side_effect = StorageError("disk error")
        result = self.svc.clear_all(user_id=1)

        self.mock_repo.clear_user_library.assert_called_once_with(1)
        assert result.message == "Library cleared"

    def test_clear_all_skips_delete_when_no_path(self):
        libs = [_make_lib(id=1, path=None), _make_lib(id=2, path="/tmp/b.pdf")]
        self.mock_repo.get_all.return_value = libs

        self.svc.clear_all(user_id=1)

        assert self.mock_storage.delete_file.call_count == 1


class TestDirectUploads:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.mock_repo = MagicMock(spec_set=LibraryRepositoryProtocol)
        self.mock_repo.count_active.return_value = 2
        self.mock_repo.add.side_effect = self._assign_id
        self.mock_tier = MagicMock(spec_set=TierServiceProtocol)
        self.mock_storage = MagicMock(spec_set=S3Storage)
        self.mock_storage.key_for.return_value = "7/id/contract.pdf"
        self.mock_storage.public_url.return_value = "https://s/object/library/7/id/contract.pdf"
        self.mock_storage.key_from_path.return_value = "7/id/contract.pdf"
        self.mock_storage.create_upload_url.return_value = "https://signed.example/put"
        self.svc = LibraryService(
            repo=self.mock_repo, tier=self.mock_tier, storage=self.mock_storage, content_types=ContentTypes()
        )

    @staticmethod
    def _assign_id(library):
        library.id = 11
        return library

    @staticmethod
    def _doc(status: str, size: int = 500):
        lib = _make_lib(id=11, name="contract.pdf", size=size)
        lib.status = status
        return lib

    def test_create_uploads_checks_plan_limits_against_active_documents(self):
        request = CreateUploadsRequest(files=[UploadFileRequest(name="contract.pdf", size=500)])

        self.svc.create_uploads(7, Plan.FREE, request)

        plan, metadata, count = self.mock_tier.check_upload_metadata.call_args.args
        assert plan == Plan.FREE and count == 2
        assert [(m.name, m.size) for m in metadata] == [("contract.pdf", 500)]

    def test_create_uploads_reserves_a_row_and_returns_a_signed_slot(self):
        request = CreateUploadsRequest(files=[UploadFileRequest(name="contract.pdf", size=500)])

        result = self.svc.create_uploads(7, Plan.FREE, request)

        library = self.mock_repo.add.call_args.args[0]
        assert (library.user_id, library.name, library.type, library.size) == (7, "contract.pdf", "pdf", 500)
        assert library.status == DocumentStatus.UPLOADING
        assert library.path == "https://s/object/library/7/id/contract.pdf"
        self.mock_storage.create_upload_url.assert_called_once_with("7/id/contract.pdf", 500, "application/pdf")
        slot = result.uploads[0]
        assert (slot.id, slot.upload_url, slot.headers) == (
            11,
            "https://signed.example/put",
            {"Content-Type": "application/pdf"},
        )

    @pytest.mark.parametrize(
        ("name", "expected"),
        [
            ("a.pdf", "application/pdf"),
            ("a.DOCX", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            ("a.txt", "text/plain"),
            ("a.md", "text/plain"),
        ],
    )
    def test_create_uploads_labels_files_by_their_extension(self, name, expected):
        request = CreateUploadsRequest(files=[UploadFileRequest(name=name, size=5)])

        result = self.svc.create_uploads(7, Plan.FREE, request)

        assert result.uploads[0].headers == {"Content-Type": expected}

    def test_create_uploads_ignores_a_content_type_chosen_by_the_browser(self):
        # A file labelled text/html would be served as a web page. The type is never taken from the request.
        request = CreateUploadsRequest.model_validate(
            {"files": [{"name": "a.pdf", "size": 5, "content_type": "text/html"}]}
        )

        result = self.svc.create_uploads(7, Plan.FREE, request)

        assert result.uploads[0].headers == {"Content-Type": "application/pdf"}
        self.mock_storage.create_upload_url.assert_called_once_with("7/id/contract.pdf", 5, "application/pdf")

    def test_create_uploads_strips_directories_from_the_file_name(self):
        request = CreateUploadsRequest(files=[UploadFileRequest(name="../../etc/evil.pdf", size=5)])

        result = self.svc.create_uploads(7, Plan.FREE, request)

        assert result.uploads[0].name == "evil.pdf"
        self.mock_storage.key_for.assert_called_once_with(7, "evil.pdf")

    def test_create_uploads_creates_nothing_when_a_plan_limit_is_hit(self):
        self.mock_tier.check_upload_metadata.side_effect = PlanLimitError("documents")
        request = CreateUploadsRequest(files=[UploadFileRequest(name="a.pdf", size=5)])

        with pytest.raises(PlanLimitError):
            self.svc.create_uploads(7, Plan.FREE, request)

        self.mock_repo.add.assert_not_called()
        self.mock_storage.create_upload_url.assert_not_called()

    def test_complete_upload_starts_processing_once_the_file_is_stored(self):
        self.mock_repo.get_by_id.return_value = self._doc("uploading")
        self.mock_storage.object_size.return_value = 500
        self.mock_repo.transition_status.return_value = True

        doc, started = self.svc.complete_upload(7, 11)

        assert started is True and doc.id == 11
        self.mock_repo.transition_status.assert_called_once_with(
            11, DocumentStatus.UPLOADING, DocumentStatus.PROCESSING
        )

    def test_complete_upload_does_not_schedule_twice_if_another_call_won(self):
        self.mock_repo.get_by_id.return_value = self._doc("uploading")
        self.mock_storage.object_size.return_value = 500
        self.mock_repo.transition_status.return_value = False

        _doc, started = self.svc.complete_upload(7, 11)

        assert started is False

    @pytest.mark.parametrize("status", ["processing", "ready", "failed"])
    def test_complete_upload_is_a_no_op_after_the_first_call(self, status):
        self.mock_repo.get_by_id.return_value = self._doc(status)

        _doc, started = self.svc.complete_upload(7, 11)

        assert started is False
        self.mock_storage.object_size.assert_not_called()

    def test_complete_upload_rejects_when_nothing_was_uploaded(self):
        self.mock_repo.get_by_id.return_value = self._doc("uploading")
        self.mock_storage.object_size.return_value = None

        with pytest.raises(BadRequestError, match="didn't receive"):
            self.svc.complete_upload(7, 11)

        self.mock_repo.transition_status.assert_not_called()

    def test_complete_upload_discards_a_file_whose_size_does_not_match(self):
        lib = self._doc("uploading", size=500)
        self.mock_repo.get_by_id.return_value = lib
        self.mock_storage.object_size.return_value = 501

        with pytest.raises(BadRequestError, match="expected size"):
            self.svc.complete_upload(7, 11)

        self.mock_storage.delete_file.assert_called_once_with(lib.path)
        assert self.mock_repo.set_status.call_args.args[:2] == (lib, DocumentStatus.FAILED)
        self.mock_repo.transition_status.assert_not_called()

    def test_complete_upload_only_finds_the_users_own_documents(self):
        self.mock_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            self.svc.complete_upload(7, 99)

        self.mock_repo.get_by_id.assert_called_once_with(99, 7)

    def test_retry_restarts_a_failed_document_whose_file_is_still_stored(self):
        self.mock_repo.get_by_id.return_value = self._doc("failed")
        self.mock_storage.object_size.return_value = 500
        self.mock_repo.transition_status.return_value = True

        _doc, started = self.svc.retry_processing(7, Plan.FREE, 11)

        assert started is True
        self.mock_repo.transition_status.assert_called_once_with(11, DocumentStatus.FAILED, DocumentStatus.PROCESSING)

    @pytest.mark.parametrize("status", ["uploading", "processing", "ready"])
    def test_retry_refuses_documents_that_have_not_failed(self, status):
        self.mock_repo.get_by_id.return_value = self._doc(status)

        with pytest.raises(ConflictError):
            self.svc.retry_processing(7, Plan.FREE, 11)

    def test_retry_is_checked_against_the_plan_limit_like_a_new_upload(self):
        self.mock_repo.get_by_id.return_value = self._doc("failed")
        self.mock_repo.count_active.return_value = 5
        self.mock_tier.check_upload_metadata.side_effect = PlanLimitError("documents")

        with pytest.raises(PlanLimitError):
            self.svc.retry_processing(7, Plan.FREE, 11)

        plan, metadata, count = self.mock_tier.check_upload_metadata.call_args.args
        assert plan == Plan.FREE and count == 5 and [(m.name, m.size) for m in metadata] == [("contract.pdf", 500)]
        self.mock_repo.transition_status.assert_not_called()

    def test_retry_asks_for_a_new_upload_when_the_file_is_gone(self):
        self.mock_repo.get_by_id.return_value = self._doc("failed")
        self.mock_storage.object_size.return_value = None

        with pytest.raises(BadRequestError, match="upload it again"):
            self.svc.retry_processing(7, Plan.FREE, 11)

    def test_file_url_is_a_signed_link_for_a_ready_document(self):
        self.mock_repo.get_by_id.return_value = self._doc("ready")
        self.mock_storage.create_download_url.return_value = "https://signed.example/get"

        result = self.svc.get_file_url(7, 11)

        self.mock_storage.create_download_url.assert_called_once_with("7/id/contract.pdf")
        assert result.url == "https://signed.example/get"
        assert result.expires_in == settings.DOWNLOAD_URL_EXPIRY_SECONDS

    @pytest.mark.parametrize("status", ["uploading", "processing", "failed"])
    def test_file_url_is_refused_until_the_document_is_ready(self, status):
        self.mock_repo.get_by_id.return_value = self._doc(status)

        with pytest.raises(BadRequestError):
            self.svc.get_file_url(7, 11)

        self.mock_storage.create_download_url.assert_not_called()

    def test_file_url_is_not_given_for_someone_elses_document(self):
        self.mock_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            self.svc.get_file_url(7, 11)
