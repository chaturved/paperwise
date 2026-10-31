from dataclasses import dataclass


@dataclass(frozen=True)
class Page:
    """One page of an extracted document. `number` is None for formats without fixed pages (Word, text). `scanned` is True when the text was read from an image with OCR."""

    number: int | None
    text: str
    scanned: bool = False
