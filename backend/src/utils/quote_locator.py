from collections.abc import Sequence


def _squash(text: str) -> str:
    return " ".join(text.split()).casefold()


class QuoteLocator:
    """Checks that a quoted sentence really appears in a document, and finds the page it is on."""

    def __init__(self, text: str, passages: Sequence[tuple[str, int | None]]) -> None:
        self._text = _squash(text)
        self._passages = [(_squash(passage), page) for passage, page in passages]

    def contains(self, quote: str) -> bool:
        squashed = _squash(quote)
        return bool(squashed) and squashed in self._text

    @staticmethod
    def shows_year(quote: str, year: int) -> bool:
        """Whether the quoted sentence itself says the year, as 2027 or as the end of a numeric date like 3/1/27."""
        return str(year) in quote or f"/{year % 100:02d}" in quote

    def page_of(self, quote: str) -> int | None:
        squashed = _squash(quote)
        return next((page for passage, page in self._passages if squashed in passage), None)
