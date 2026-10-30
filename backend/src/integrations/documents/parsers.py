"""Turn an uploaded file into plain text, within the size limits set in config.

This runs inside the worker process (see worker.py), not in the web server.
"""

import io
import zipfile
from collections.abc import Callable, Iterable, Iterator

import docx
import fitz
from docx.document import Document as DocxDocument
from docx.table import Table
from docx.text.paragraph import Paragraph

from ...config import settings
from ...core.exceptions import BadRequestError
from .messages import TOO_LARGE_MESSAGE, UNREADABLE_FILE_MESSAGE

_READ_CHUNK_BYTES = 64 * 1024


def _join_within_budget(parts: Iterable[str], separator: str) -> str:
    """Join text parts, stopping at the first one that pushes the total past the extraction cap."""
    collected: list[str] = []
    total = 0
    for part in parts:
        total += len(part) + len(separator)
        if total > settings.MAX_EXTRACTED_CHARS:
            raise BadRequestError(TOO_LARGE_MESSAGE)
        collected.append(part)
    return separator.join(collected)


def _parse_pdf(contents: bytes) -> str:
    with fitz.open(stream=contents, filetype="pdf") as doc:
        if doc.needs_pass:
            raise BadRequestError(UNREADABLE_FILE_MESSAGE)
        if doc.page_count > settings.MAX_PDF_PAGES:
            raise BadRequestError(TOO_LARGE_MESSAGE)
        return _join_within_budget((page.get_text() for page in doc), "")  # type: ignore[attr-defined]


def _check_docx_archive(contents: bytes) -> None:
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
                while chunk := part.read(_READ_CHUNK_BYTES):
                    produced += len(chunk)
                    total += len(chunk)
                    if total > cap:
                        raise BadRequestError(TOO_LARGE_MESSAGE)
            if produced != entry.file_size:
                raise BadRequestError(UNREADABLE_FILE_MESSAGE)


def _docx_blocks(document: DocxDocument) -> Iterator[str]:
    """Yield paragraph and table text in document order, so contract tables aren't skipped."""
    for child in document.element.body.iterchildren():
        if child.tag.endswith("}p"):
            yield Paragraph(child, document).text  # type: ignore[arg-type]
        elif child.tag.endswith("}tbl"):
            for row in Table(child, document).rows:  # type: ignore[arg-type]
                cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if cells:
                    yield " | ".join(cells)


def _parse_docx(contents: bytes) -> str:
    _check_docx_archive(contents)
    return _join_within_budget(_docx_blocks(docx.Document(io.BytesIO(contents))), "\n")


def _parse_text(contents: bytes) -> str:
    if len(contents) > settings.MAX_EXTRACTED_CHARS:  # decoded text is never longer than its bytes
        raise BadRequestError(TOO_LARGE_MESSAGE)
    return contents.decode("utf-8", errors="ignore")


_PARSERS: dict[str, Callable[[bytes], str]] = {
    "pdf": _parse_pdf,
    "docx": _parse_docx,
    "doc": _parse_docx,
    "txt": _parse_text,
    "md": _parse_text,
}


def parse_document(contents: bytes, ext: str) -> str:
    """Return the text of an uploaded file. Raises BadRequestError with a plain message if it can't be used."""
    parser = _PARSERS.get(ext.lower())
    if parser is None:
        raise BadRequestError(f"Unsupported file type: .{ext}")

    try:
        return parser(contents)
    except BadRequestError:
        raise
    except Exception as exc:
        raise BadRequestError(UNREADABLE_FILE_MESSAGE) from exc
