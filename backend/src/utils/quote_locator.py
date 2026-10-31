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

    def page_of(self, quote: str) -> int | None:
        squashed = _squash(quote)
        return next((page for passage, page in self._passages if squashed in passage), None)
