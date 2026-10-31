from datetime import date
from unittest.mock import AsyncMock, MagicMock

from src.integrations.ai.base import AIProvider
from src.services.key_date_extractor import KEY_DATES_MAX_CHARS, FoundDate, KeyDateExtractor


def _extractor(reply: str) -> tuple[KeyDateExtractor, MagicMock]:
    ai = MagicMock(spec_set=AIProvider)
    ai.chat = AsyncMock(return_value=reply)
    return KeyDateExtractor(ai=ai), ai


async def test_dates_and_relative_deadlines_are_read_from_the_reply():
    extractor, _ = _extractor(
        '[{"label": "Lease ends", "date": "2027-12-31", "timing": null, "quote": "The lease ends on 31 December 2027."},'
        ' {"label": "Notice due", "date": null, "timing": "60 days before the end", "quote": "Notice is due 60 days earlier."}]'
    )

    assert await extractor.extract("text") == [
        FoundDate("Lease ends", date(2027, 12, 31), None, "The lease ends on 31 December 2027."),
        FoundDate("Notice due", None, "60 days before the end", "Notice is due 60 days earlier."),
    ]


async def test_an_item_with_neither_a_valid_date_nor_a_timing_is_dropped():
    extractor, _ = _extractor(
        '[{"label": "Bad", "date": "next spring", "timing": null, "quote": "q"},'
        ' {"label": "", "date": "2027-01-01", "quote": "q"},'
        ' {"label": "No quote", "date": "2027-01-01", "quote": ""},'
        ' "not an object"]'
    )

    assert await extractor.extract("text") == []


async def test_a_reply_that_is_not_a_list_gives_none():
    extractor, _ = _extractor('{"label": "x"}')

    assert await extractor.extract("text") is None


async def test_a_reply_that_is_not_json_gives_none():
    extractor, _ = _extractor("I could not read it.")

    assert await extractor.extract("text") is None


async def test_the_document_goes_into_the_prompt_but_only_up_to_the_limit():
    extractor, ai = _extractor("[]")

    await extractor.extract("a" * (KEY_DATES_MAX_CHARS + 500))

    prompt = ai.chat.await_args.args[0]
    assert "BEGIN DOCUMENT" in prompt
    assert prompt.count("a") < KEY_DATES_MAX_CHARS + 200
