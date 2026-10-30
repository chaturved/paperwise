"""Turn an uploaded file into plain text, within the size limits set in config.

This runs inside the worker process (see worker.py), not in the web server.
"""

import io
import zipfile
from abc import ABC, abstractmethod
from collections.abc import Iterable, Iterator, Mapping

import docx
import fitz
from docx.document import Document as DocxDocument
from docx.table import Table
from docx.text.paragraph import Paragraph

from ...config import settings
from ...core.exceptions import BadRequestError
from .messages import TOO_LARGE_MESSAGE, UNREADABLE_FILE_MESSAGE
from .pages import Page


class TextBudget:
    def collect(self, parts: Iterable[str], separator: str = "") -> list[str]:
        """Gather text parts, stopping at the first one that pushes the total past the extraction cap."""
        collected: list[str] = []
        total = 0
        for part in parts:
            total += len(part) + len(separator)
            if total > settings.MAX_EXTRACTED_CHARS:
                raise BadRequestError(TOO_LARGE_MESSAGE)
            collected.append(part)
        return collected


class DocxArchiveGuard:
    _READ_CHUNK_BYTES = 64 * 1024

    def check(self, contents: bytes) -> None:
        """A .docx is a zip file. Refuse archives that unpack to far more than the upload size.

        Sizes written in the zip headers can be forged, so the entries are actually decompressed in small
        chunks and the real output is counted, stopping as soon as it passes the cap.
        """
        cap = settings.MAX_DOCX_UNZIPPED_MB * 1024 * 1024
        with zipfile.ZipFile(io.BytesIO(contents)) as archive:
            entries = archive.infolist()
            if len(entries) > settings.MAX_DOCX_ENTRIES or sum(entry.file_size for entry in entries) > cap:
                raise BadRequestError(TOO_LARGE_MESSAGE)

            total = 0
            for entry in entries:
                produced = 0
                with archive.open(entry) as part:
                    while chunk := part.read(self._READ_CHUNK_BYTES):
                        produced += len(chunk)
                        total += len(chunk)
                        if total > cap:
                            raise BadRequestError(TOO_LARGE_MESSAGE)
                if produced != entry.file_size:
                    raise BadRequestError(UNREADABLE_FILE_MESSAGE)


class FileParser(ABC):
    @abstractmethod
    def parse(self, contents: bytes) -> list[Page]: ...


class PdfParser(FileParser):
    def __init__(self, budget: TextBudget) -> None:
        self.budget = budget

    def parse(self, contents: bytes) -> list[Page]:
        with fitz.open(stream=contents, filetype="pdf") as doc:
            if doc.needs_pass:
                raise BadRequestError(UNREADABLE_FILE_MESSAGE)
            if doc.page_count > settings.MAX_PDF_PAGES:
                raise BadRequestError(TOO_LARGE_MESSAGE)
            texts = self.budget.collect(page.get_text() for page in doc)  # type: ignore[attr-defined]
            return [Page(number, text) for number, text in enumerate(texts, start=1)]


class DocxParser(FileParser):
    def __init__(self, guard: DocxArchiveGuard, budget: TextBudget) -> None:
        self.guard = guard
        self.budget = budget

    def parse(self, contents: bytes) -> list[Page]:
        self.guard.check(contents)
        blocks = self.budget.collect(self._blocks(docx.Document(io.BytesIO(contents))), "\n")
        return [Page(None, "\n".join(blocks))]

    def _blocks(self, document: DocxDocument) -> Iterator[str]:
        """Yield paragraph and table text in document order, so contract tables aren't skipped."""
        for child in document.element.body.iterchildren():
            if child.tag.endswith("}p"):
                yield Paragraph(child, document).text  # type: ignore[arg-type]
            elif child.tag.endswith("}tbl"):
                for row in Table(child, document).rows:  # type: ignore[arg-type]
                    cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if cells:
                        yield " | ".join(cells)


class PlainTextParser(FileParser):
    def parse(self, contents: bytes) -> list[Page]:
        if len(contents) > settings.MAX_EXTRACTED_CHARS:  # decoded text is never longer than its bytes
            raise BadRequestError(TOO_LARGE_MESSAGE)
        return [Page(None, contents.decode("utf-8", errors="ignore"))]


class DocumentParser:
    """Picks the parser for a file type. Pass `parsers` to support another type without editing this class."""

    def __init__(self, parsers: Mapping[str, FileParser] | None = None) -> None:
        self.parsers = parsers or self._default_parsers()

    @staticmethod
    def _default_parsers() -> dict[str, FileParser]:
        budget = TextBudget()
        docx_parser = DocxParser(DocxArchiveGuard(), budget)
        text_parser = PlainTextParser()
        return {"pdf": PdfParser(budget), "docx": docx_parser, "doc": docx_parser, "txt": text_parser, "md": text_parser}

    def parse(self, contents: bytes, ext: str) -> list[Page]:
        """Return the pages of an uploaded file. Raises BadRequestError with a plain message if it can't be used."""
        parser = self.parsers.get(ext.lower())
        if parser is None:
            raise BadRequestError(f"Unsupported file type: .{ext}")

        try:
            return parser.parse(contents)
        except BadRequestError:
            raise
        except Exception as exc:
            raise BadRequestError(UNREADABLE_FILE_MESSAGE) from exc
