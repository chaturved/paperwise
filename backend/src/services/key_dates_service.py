from typing import Protocol

from fastapi import Depends

from src.core.enums import DocumentStatus
from src.core.exceptions import BadRequestError, NotFoundError, UnprocessableEntityError
from src.models import Library
from src.repositories.library_repository import LibraryRepository, LibraryRepositoryProtocol
from src.schemas.library import KeyDate, KeyDatesResponse
from src.services.key_date_extractor import FoundDate, KeyDateExtractor
from src.utils.quote_locator import QuoteLocator

NOT_READY_MESSAGE = "This document is still being read. Try again when it is ready."
UNREADABLE_REPLY_MESSAGE = "We couldn't find the key dates in this document right now. Please try again."


class KeyDatesServiceProtocol(Protocol):
    async def key_dates(self, user_id: int, doc_id: int) -> KeyDatesResponse: ...


class KeyDatesService(KeyDatesServiceProtocol):
    """The dates and deadlines in a document. Only dates whose quoted sentence is really in the document are kept."""

    def __init__(
        self,
        repo: LibraryRepositoryProtocol = Depends(LibraryRepository),
        extractor: KeyDateExtractor = Depends(KeyDateExtractor),
    ):
        self.repo = repo
        self.extractor = extractor

    async def key_dates(self, user_id: int, doc_id: int) -> KeyDatesResponse:
        lib = self._document(user_id, doc_id)
        if lib.key_dates is not None:
            return KeyDatesResponse(dates=lib.key_dates)

        found = await self.extractor.extract(lib.extracted_text or "")
        if found is None:
            raise UnprocessableEntityError(UNREADABLE_REPLY_MESSAGE)

        dates = self._checked(lib, found)
        self.repo.set_key_dates(lib, [d.model_dump(mode="json") for d in dates])
        return KeyDatesResponse(dates=dates)

    def _document(self, user_id: int, doc_id: int) -> Library:
        lib = self.repo.get_by_id(doc_id, user_id)
        if not lib:
            raise NotFoundError("Document not found")
        if lib.status != DocumentStatus.READY:
            raise BadRequestError(NOT_READY_MESSAGE)
        return lib

    def _checked(self, lib: Library, found: list[FoundDate]) -> list[KeyDate]:
        """Drop dates whose quote is not in the document, add the page, and put dated ones first in order."""
        locator = QuoteLocator(lib.extracted_text or "", self.repo.list_passages(lib.id))
        dates = [self._key_date(item, locator) for item in found if locator.contains(item.quote)]
        return sorted(dates, key=lambda d: (d.date is None, d.date))

    @staticmethod
    def _key_date(item: FoundDate, locator: QuoteLocator) -> KeyDate:
        return KeyDate(
            label=item.label,
            date=item.date,
            timing=item.timing,
            quote=item.quote,
            page=locator.page_of(item.quote),
            year_assumed=item.date is not None and not locator.shows_year(item.quote, item.date.year),
        )
