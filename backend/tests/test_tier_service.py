import io
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import UploadFile
from unittest.mock import MagicMock

from src.core.enums import Plan
from src.core.exceptions import PlanLimitError
from src.repositories.tier_repository import TierRepositoryProtocol
from src.services.tier_service import TierService, UploadMeta


class TestTierService:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.mock_repo = MagicMock(spec_set=TierRepositoryProtocol)
        self.svc = TierService(repo=self.mock_repo)

    # ── check_upload ──────────────────────────────────────────────────────────

    def test_upload_free_doc_limit(self):
        files = [UploadFile(filename="a.pdf", file=io.BytesIO(b""), size=1024)]
        with pytest.raises(PlanLimitError) as exc:
            self.svc.check_upload(Plan.FREE, files, current_doc_count=5)
        assert exc.value.limit == "documents"

    def test_upload_free_doc_limit_not_exceeded(self):
        files = [UploadFile(filename="a.pdf", file=io.BytesIO(b""), size=1024)]
        self.svc.check_upload(Plan.FREE, files, current_doc_count=4)

    def test_upload_free_file_too_large(self):
        files = [UploadFile(filename="a.pdf", file=io.BytesIO(b""), size=11 * 1024 * 1024)]
        with pytest.raises(PlanLimitError) as exc:
            self.svc.check_upload(Plan.FREE, files, current_doc_count=0)
        assert exc.value.limit == "file_size"

    def test_upload_free_disallowed_type(self):
        files = [UploadFile(filename="slides.pptx", file=io.BytesIO(b""), size=1024)]
        with pytest.raises(PlanLimitError) as exc:
            self.svc.check_upload(Plan.FREE, files, current_doc_count=0)
        assert exc.value.limit == "file_type"

    def test_upload_free_allows_docx(self):
        files = [UploadFile(filename="contract.docx", file=io.BytesIO(b""), size=1024)]
        self.svc.check_upload(Plan.FREE, files, current_doc_count=0)

    # ── check_upload_metadata ─────────────────────────────────────────────────

    def test_metadata_accepts_files_within_the_free_limits(self):
        files = [UploadMeta("contract.docx", 2 * 1024 * 1024), UploadMeta("notes.md", 10)]
        self.svc.check_upload_metadata(Plan.FREE, files, current_doc_count=3)

    def test_metadata_rejects_going_over_the_document_limit(self):
        with pytest.raises(PlanLimitError) as exc:
            self.svc.check_upload_metadata(Plan.FREE, [UploadMeta("a.pdf", 1), UploadMeta("b.pdf", 1)], current_doc_count=4)
        assert exc.value.limit == "documents"

    def test_metadata_rejects_a_file_over_the_size_limit(self):
        with pytest.raises(PlanLimitError) as exc:
            self.svc.check_upload_metadata(Plan.FREE, [UploadMeta("big.pdf", 11 * 1024 * 1024)], current_doc_count=0)
        assert exc.value.limit == "file_size"

    @pytest.mark.parametrize("name", ["slides.pptx", "no_extension"])
    def test_metadata_rejects_unsupported_types(self, name):
        with pytest.raises(PlanLimitError) as exc:
            self.svc.check_upload_metadata(Plan.FREE, [UploadMeta(name, 1)], current_doc_count=0)
        assert exc.value.limit == "file_type"

    def test_upload_pro_no_doc_limit(self):
        files = [UploadFile(filename="a.pdf", file=io.BytesIO(b""), size=1024)]
        self.svc.check_upload(Plan.PRO, files, current_doc_count=1000)

    def test_upload_pro_allows_docx(self):
        files = [UploadFile(filename="report.docx", file=io.BytesIO(b""), size=1024)]
        self.svc.check_upload(Plan.PRO, files, current_doc_count=0)

    def test_upload_pro_file_size_limit(self):
        files = [UploadFile(filename="big.pdf", file=io.BytesIO(b""), size=51 * 1024 * 1024)]
        with pytest.raises(PlanLimitError) as exc:
            self.svc.check_upload(Plan.PRO, files, current_doc_count=0)
        assert exc.value.limit == "file_size"

    # ── check_and_log_ask ─────────────────────────────────────────────────────

    def test_ask_free_at_limit(self):
        self.mock_repo.count_queries_24h.return_value = 20
        with pytest.raises(PlanLimitError) as exc:
            self.svc.check_and_log_ask(Plan.FREE, user_id=1)
        assert exc.value.limit == "queries"

    def test_ask_free_under_limit(self):
        self.mock_repo.count_queries_24h.return_value = 19
        self.svc.check_and_log_ask(Plan.FREE, user_id=1)
        self.mock_repo.log_query.assert_called_once_with(1)

    def test_ask_pro_no_limit(self):
        self.mock_repo.count_queries_24h.return_value = 10000
        self.svc.check_and_log_ask(Plan.PRO, user_id=1)
        self.mock_repo.log_query.assert_called_once_with(1)

    # ── check_history ─────────────────────────────────────────────────────────

    def test_history_free_too_old(self):
        old = datetime.now(timezone.utc) - timedelta(days=8)
        with pytest.raises(PlanLimitError) as exc:
            self.svc.check_history(Plan.FREE, old)
        assert exc.value.limit == "history"

    def test_history_free_within_limit(self):
        recent = datetime.now(timezone.utc) - timedelta(days=7)
        self.svc.check_history(Plan.FREE, recent)

    def test_history_pro_any_age(self):
        old = datetime.now(timezone.utc) - timedelta(days=365)
        self.svc.check_history(Plan.PRO, old)
