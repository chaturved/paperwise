import io
import re
import zipfile
from collections.abc import Iterator
from typing import List

import docx
import fitz
from docx.document import Document as DocxDocument
from docx.table import Table
from docx.text.paragraph import Paragraph

from ..config import settings
from ..core.exceptions import BadRequestError


def clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def chunk_text(text: str, chunk_size: int = settings.TEXT_CHUNK_SIZE, overlap: int = settings.TEXT_CHUNK_OVERLAP) -> List[str]:
    text = clean_text(text)
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

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


UNREADABLE_FILE_MESSAGE = "This file couldn't be read. It may be empty, corrupted or password-protected."
TOO_LARGE_MESSAGE = "This file is too large or complex to process. Try splitting it into smaller files."


def _check_docx_archive(contents: bytes) -> None:
    """A .docx is a zip file. Refuse archives that would unpack to far more than the upload size."""
    with zipfile.ZipFile(io.BytesIO(contents)) as archive:
        entries = archive.infolist()
        unzipped_bytes = sum(entry.file_size for entry in entries)
        if len(entries) > settings.MAX_DOCX_ENTRIES or unzipped_bytes > settings.MAX_DOCX_UNZIPPED_MB * 1024 * 1024:
            raise BadRequestError(TOO_LARGE_MESSAGE)


def _extract(contents: bytes, ext: str) -> str:
    try:
        if ext == "pdf":
            text = ""
            with fitz.open(stream=contents, filetype="pdf") as doc:
                if doc.needs_pass:
                    raise BadRequestError(UNREADABLE_FILE_MESSAGE)
                if doc.page_count > settings.MAX_PDF_PAGES:
                    raise BadRequestError(TOO_LARGE_MESSAGE)
                for page in doc:
                    text += page.get_text()  # type: ignore[attr-defined]
            return text

        if ext in ["docx", "doc"]:
            _check_docx_archive(contents)
            return "\n".join(_docx_blocks(docx.Document(io.BytesIO(contents))))
    except BadRequestError:
        raise
    except Exception as exc:
        raise BadRequestError(UNREADABLE_FILE_MESSAGE) from exc

    if ext in ["txt", "md"]:
        return contents.decode("utf-8", errors="ignore")

    raise BadRequestError(f"Unsupported file type: .{ext}")


def extract_text_from_bytes(contents: bytes, ext: str) -> str:
    text = _extract(contents, ext.lower())
    if len(text) > settings.MAX_EXTRACTED_CHARS:
        raise BadRequestError(TOO_LARGE_MESSAGE)
    return text
