from ...config import settings


class ExtractionTimeout:
    """How long the worker may run for a file type. PDFs get extra time because scanned pages are read with OCR."""

    def seconds(self, ext: str) -> int:
        extra = settings.OCR_EXTRA_TIMEOUT_SECONDS if settings.OCR_ENABLED and ext.lower() == "pdf" else 0
        return settings.EXTRACT_TIMEOUT_SECONDS + extra
