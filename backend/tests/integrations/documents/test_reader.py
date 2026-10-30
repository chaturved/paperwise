from unittest.mock import AsyncMock, MagicMock

import pytest

from src.core.exceptions import BadRequestError
from src.integrations.documents import IsolatedExtractor, ReadableTextExtractor
from src.integrations.documents.messages import NO_TEXT_MESSAGE
from src.utils.text_utils import TextChunker


def _reader(text: str) -> ReadableTextExtractor:
    extractor = MagicMock(spec_set=IsolatedExtractor)
    extractor.extract = AsyncMock(return_value=text)
    return ReadableTextExtractor(extractor=extractor, chunker=TextChunker())


async def test_returns_the_text_when_there_is_something_to_read():
    assert await _reader("Payment terms").extract(b"file", "pdf") == "Payment terms"


@pytest.mark.parametrize("text", ["", "   ", "\n\t \n"])
async def test_rejects_files_with_no_readable_text(text):
    with pytest.raises(BadRequestError) as exc:
        await _reader(text).extract(b"scan", "pdf")

    assert exc.value.message == NO_TEXT_MESSAGE
