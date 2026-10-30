import io
import zipfile

import docx
import fitz
import pytest

from src.config import settings
from src.core.exceptions import BadRequestError
from src.integrations.documents.parsers import parse_document
from src.utils.text_utils import clean_text


def _docx_bytes(build) -> bytes:
    document = docx.Document()
    build(document)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


class TestExtractDocx:
    def test_keeps_paragraphs_and_table_cells_in_document_order(self):
        def build(document):
            document.add_paragraph("Payment terms")
            table = document.add_table(rows=2, cols=2)
            table.cell(0, 0).text = "Due"
            table.cell(0, 1).text = "30 days"
            table.cell(1, 0).text = "Late fee"
            table.cell(1, 1).text = "2%"
            document.add_paragraph("Termination")

        text = parse_document(_docx_bytes(build), "docx")

        assert text.splitlines() == ["Payment terms", "Due | 30 days", "Late fee | 2%", "Termination"]

    def test_empty_document_has_no_readable_text(self):
        assert clean_text(parse_document(_docx_bytes(lambda d: None), "docx")) == ""


def _zip_bytes(members: dict[str, bytes]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in members.items():
            archive.writestr(name, data)
    return buffer.getvalue()


class TestUploadSafetyLimits:
    def test_docx_that_unpacks_far_beyond_its_size_is_rejected(self):
        # Zeros compress to almost nothing, so the file is tiny but declares a huge unpacked size.
        bomb = _zip_bytes({"word/document.xml": b"\0" * (settings.MAX_DOCX_UNZIPPED_MB * 1024 * 1024 + 1)})

        assert len(bomb) < 1024 * 1024
        with pytest.raises(BadRequestError) as exc:
            parse_document(bomb, "docx")
        assert "too large" in exc.value.message

    def test_docx_with_too_many_entries_is_rejected(self):
        many = _zip_bytes({f"part{i}.xml": b"x" for i in range(settings.MAX_DOCX_ENTRIES + 1)})

        with pytest.raises(BadRequestError) as exc:
            parse_document(many, "docx")
        assert "too large" in exc.value.message

    def test_pdf_with_too_many_pages_is_rejected(self, monkeypatch):
        monkeypatch.setattr(settings, "MAX_PDF_PAGES", 2)
        pdf = fitz.open()
        for _ in range(3):
            pdf.new_page()
        contents = pdf.tobytes()
        pdf.close()

        with pytest.raises(BadRequestError) as exc:
            parse_document(contents, "pdf")
        assert "too large" in exc.value.message

    def test_forged_size_in_zip_headers_is_not_trusted(self):
        # Declare a tiny unpacked size in both the local and central headers while the data stays large.
        real = b"A" * 5000
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_STORED) as archive:
            archive.writestr("word/document.xml", real)
        forged = bytearray(buffer.getvalue())
        local = forged.index(b"PK\x03\x04")
        central = forged.index(b"PK\x01\x02")
        forged[local + 22 : local + 26] = (10).to_bytes(4, "little")
        forged[central + 24 : central + 28] = (10).to_bytes(4, "little")

        with pytest.raises(BadRequestError):
            parse_document(bytes(forged), "docx")

    def test_decompressed_output_over_the_cap_stops_early(self, monkeypatch):
        monkeypatch.setattr(settings, "MAX_DOCX_UNZIPPED_MB", 1)
        two_parts = _zip_bytes({"a.xml": b"\0" * (700 * 1024), "b.xml": b"\0" * (700 * 1024)})

        with pytest.raises(BadRequestError) as exc:
            parse_document(two_parts, "docx")
        assert "too large" in exc.value.message

    def test_pdf_text_over_the_cap_is_rejected_while_reading_pages(self, monkeypatch):
        monkeypatch.setattr(settings, "MAX_EXTRACTED_CHARS", 50)
        pdf = fitz.open()
        for _ in range(5):
            pdf.new_page().insert_text((72, 72), "word " * 10)
        contents = pdf.tobytes()
        pdf.close()

        with pytest.raises(BadRequestError) as exc:
            parse_document(contents, "pdf")
        assert "too large" in exc.value.message

    def test_text_longer_than_the_cap_is_rejected(self, monkeypatch):
        monkeypatch.setattr(settings, "MAX_EXTRACTED_CHARS", 10)

        with pytest.raises(BadRequestError) as exc:
            parse_document(b"a" * 11, "txt")
        assert "too large" in exc.value.message

    def test_text_at_the_cap_is_accepted(self, monkeypatch):
        monkeypatch.setattr(settings, "MAX_EXTRACTED_CHARS", 10)

        assert parse_document(b"a" * 10, "txt") == "a" * 10


class TestExtractOtherTypes:
    def test_txt_is_decoded(self):
        assert parse_document(b"hello", "txt") == "hello"

    def test_unsupported_type_raises(self):
        with pytest.raises(BadRequestError):
            parse_document(b"x", "exe")

    @pytest.mark.parametrize("ext", ["pdf", "docx"])
    def test_empty_or_corrupt_file_gives_a_plain_message(self, ext):
        for contents in (b"", b"not a real document"):
            with pytest.raises(BadRequestError) as exc:
                parse_document(contents, ext)
            assert "couldn't be read" in exc.value.message
