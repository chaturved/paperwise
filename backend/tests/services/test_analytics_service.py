from unittest.mock import MagicMock

import pytest

from src.core.exceptions import BadRequestError
from src.repositories.analytics_repository import AnalyticsRepositoryProtocol
from src.services.analytics_service import AnalyticsService


class TestAnalyticsService:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.mock_repo = MagicMock(spec_set=AnalyticsRepositoryProtocol)
        self.svc = AnalyticsService(repo=self.mock_repo)

    def test_get_overview_delegates_to_repo(self):
        expected = {"total_queries": 10, "total_docs": 3}
        self.mock_repo.get_overview.return_value = expected

        result = self.svc.get_overview(user_id=1)

        self.mock_repo.get_overview.assert_called_once_with(1)
        assert result == expected

    def test_get_query_volume_delegates_to_repo(self):
        expected = [{"date": "2024-01-01", "count": 5}]
        self.mock_repo.get_query_volume.return_value = expected

        result = self.svc.get_query_volume(user_id=1, days=30)

        self.mock_repo.get_query_volume.assert_called_once_with(1, 30)
        assert result == expected

    def test_get_top_cited_docs_delegates_to_repo(self):
        expected = [{"name": "doc.pdf", "citations": 10}]
        self.mock_repo.get_top_cited_docs.return_value = expected

        result = self.svc.get_top_cited_docs(user_id=1)

        self.mock_repo.get_top_cited_docs.assert_called_once_with(1)
        assert result == expected

    def test_set_feedback_raises_on_invalid_value(self):
        with pytest.raises(BadRequestError):
            self.svc.set_feedback(message_id=1, user_id=1, value="maybe")

    def test_set_feedback_up_delegates_to_repo(self):
        self.svc.set_feedback(message_id=1, user_id=1, value="up")

        self.mock_repo.upsert_feedback.assert_called_once_with(1, 1, "up")

    def test_set_feedback_down_delegates_to_repo(self):
        self.svc.set_feedback(message_id=1, user_id=1, value="down")

        self.mock_repo.upsert_feedback.assert_called_once_with(1, 1, "down")

    def test_get_feedbacks_delegates_to_repo(self):
        expected = {1: "up", 2: "down"}
        self.mock_repo.get_user_feedbacks.return_value = expected

        result = self.svc.get_feedbacks(user_id=1, message_ids=[1, 2])

        self.mock_repo.get_user_feedbacks.assert_called_once_with(1, [1, 2])
        assert result == expected
