from unittest.mock import AsyncMock, MagicMock

import pytest

from src.core.exceptions import BadRequestError
from src.integrations.documents import IsolatedExtractor, Page, ReadableTextExtractor
from src.integrations.documents.messages import NO_TEXT_MESSAGE
from src.utils.text_utils import TextChunker


def _reader(*pages: Page) -> ReadableTextExtractor:
    extractor = MagicMock(spec_set=IsolatedExtractor)
    extractor.extract = AsyncMock(return_value=list(pages))
    return ReadableTextExtractor(extractor=extractor, chunker=TextChunker())


async def test_returns_the_pages_when_there_is_something_to_read():
    assert await _reader(Page(1, "Payment terms")).extract(b"file", "pdf") == [Page(1, "Payment terms")]


async def test_keeps_page_numbers_when_blank_pages_are_dropped():
    reader = _reader(Page(1, "Intro"), Page(2, "  \n "), Page(3, "Termination"))

    assert [p.number for p in await reader.extract(b"file", "pdf")] == [1, 3]


@pytest.mark.parametrize("text", ["", "   ", "\n\t \n"])
async def test_rejects_files_with_no_readable_text(text):
    with pytest.raises(BadRequestError) as exc:
        await _reader(Page(1, text)).extract(b"scan", "pdf")

    assert exc.value.message == NO_TEXT_MESSAGE
