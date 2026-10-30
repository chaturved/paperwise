"""Reads the text of a scanned PDF page with OCR."""

from abc import ABC, abstractmethod

import fitz

from ...config import settings


class OcrUnavailableError(Exception):
    """OCR cannot run here, for example because Tesseract is not installed."""


class PageOcr(ABC):
    @abstractmethod
    def read(self, page: fitz.Page) -> str: ...


class TesseractPageOcr(PageOcr):
    """Uses the Tesseract program through PyMuPDF. Raises OcrUnavailableError if Tesseract can't be found."""

    def read(self, page: fitz.Page) -> str:
        try:
            textpage = page.get_textpage_ocr(language=settings.OCR_LANGUAGE, dpi=settings.OCR_DPI, full=True)  # type: ignore[attr-defined]
        except RuntimeError as exc:
            raise OcrUnavailableError(str(exc)) from exc
        return page.get_text(textpage=textpage)  # type: ignore[attr-defined]
