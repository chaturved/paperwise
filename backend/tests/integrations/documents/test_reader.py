from unittest.mock import AsyncMock, patch

import pytest

from src.core.exceptions import BadRequestError
from src.integrations.documents import extract_readable_text
from src.integrations.documents.messages import NO_TEXT_MESSAGE


async def test_returns_the_text_when_there_is_something_to_read():
    with patch("src.integrations.documents.reader.extract_text_isolated", AsyncMock(return_value="Payment terms")):
        assert await extract_readable_text(b"file", "pdf") == "Payment terms"


@pytest.mark.parametrize("text", ["", "   ", "\n\t \n"])
async def test_rejects_files_with_no_readable_text(text):
    with (
        patch("src.integrations.documents.reader.extract_text_isolated", AsyncMock(return_value=text)),
        pytest.raises(BadRequestError) as exc,
    ):
        await extract_readable_text(b"scan", "pdf")

    assert exc.value.message == NO_TEXT_MESSAGE
