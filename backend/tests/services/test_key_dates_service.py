from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.core.enums import DocumentStatus
from src.core.exceptions import BadRequestError, NotFoundError, UnprocessableEntityError
from src.repositories.library_repository import LibraryRepositoryProtocol
from src.services.key_date_extractor import FoundDate, KeyDateExtractor
from src.services.key_dates_service import KeyDatesService

TEXT = "The lease ends on 31 December 2027. Rent is due on 1 March 2027. Notice is due 60 days earlier."


def _lib(**changes) -> SimpleNamespace:
    values = {"id": 4, "status": DocumentStatus.READY, "extracted_text": TEXT, "key_dates": None}
    return SimpleNamespace(**{**values, **changes})


class TestKeyDatesService:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.repo = MagicMock(spec_set=LibraryRepositoryProtocol)
        self.extractor = MagicMock(spec_set=KeyDateExtractor)
        self.lib = _lib()
        self.repo.get_by_id.return_value = self.lib
        self.repo.list_passages.return_value = [(TEXT, 2)]
        self.extractor.extract = AsyncMock(
            return_value=[
                FoundDate("Lease ends", date(2027, 12, 31), None, "The lease ends on 31 December 2027."),
                FoundDate("Rent due", date(2027, 3, 1), None, "Rent is due on 1 March 2027."),
                FoundDate("Notice due", None, "60 days before the end", "Notice is due 60 days earlier."),
            ]
        )
        self.svc = KeyDatesService(repo=self.repo, extractor=self.extractor)

    async def test_dates_come_back_in_order_with_their_page_and_undated_deadlines_last(self):
        result = await self.svc.key_dates(1, 4)

        assert [(d.label, d.date, d.page) for d in result.dates] == [
            ("Rent due", date(2027, 3, 1), 2),
            ("Lease ends", date(2027, 12, 31), 2),
            ("Notice due", None, 2),
        ]

    async def test_a_date_whose_quote_is_not_in_the_document_is_dropped(self):
        self.extractor.extract = AsyncMock(
            return_value=[
                FoundDate("Real", date(2027, 3, 1), None, "Rent is due on 1 March 2027."),
                FoundDate("Invented", date(2030, 1, 1), None, "The lease renews on 1 January 2030."),
            ]
        )

        result = await self.svc.key_dates(1, 4)

        assert [d.label for d in result.dates] == ["Real"]

    async def test_the_dates_are_saved_on_the_document(self):
        await self.svc.key_dates(1, 4)

        saved = self.repo.set_key_dates.call_args.args[1]
        assert saved[0] == {
            "label": "Rent due",
            "date": "2027-03-01",
            "timing": None,
            "quote": "Rent is due on 1 March 2027.",
            "page": 2,
        }

    async def test_a_document_that_was_already_read_is_not_sent_to_the_model_again(self):
        self.lib.key_dates = [{"label": "Saved", "date": "2027-01-01", "timing": None, "quote": "q", "page": 1}]

        result = await self.svc.key_dates(1, 4)

        assert [d.label for d in result.dates] == ["Saved"]
        self.extractor.extract.assert_not_awaited()

    async def test_a_document_with_no_dates_is_remembered_as_having_none(self):
        self.extractor.extract = AsyncMock(return_value=[])

        result = await self.svc.key_dates(1, 4)

        assert result.dates == []
        self.repo.set_key_dates.assert_called_once_with(self.lib, [])

    async def test_a_reply_that_could_not_be_read_is_an_error_and_is_not_saved(self):
        self.extractor.extract = AsyncMock(return_value=None)

        with pytest.raises(UnprocessableEntityError):
            await self.svc.key_dates(1, 4)

        self.repo.set_key_dates.assert_not_called()

    async def test_a_document_that_is_not_the_users_is_not_found(self):
        self.repo.get_by_id.return_value = None

        with pytest.raises(NotFoundError):
            await self.svc.key_dates(1, 4)

    async def test_a_document_that_is_still_being_read_is_refused(self):
        self.lib.status = DocumentStatus.PROCESSING

        with pytest.raises(BadRequestError):
            await self.svc.key_dates(1, 4)

        self.extractor.extract.assert_not_awaited()
