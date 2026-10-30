from dataclasses import dataclass


@dataclass(frozen=True)
class Page:
    """One page of an extracted document. `number` is None for formats without fixed pages (Word, text)."""

    number: int | None
    text: str
