import io

import docx
import pytest

from src.core.exceptions import BadRequestError
from src.utils.text_utils import chunk_text, clean_text, extract_text_from_bytes


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

        text = extract_text_from_bytes(_docx_bytes(build), "docx")

        assert text.splitlines() == ["Payment terms", "Due | 30 days", "Late fee | 2%", "Termination"]

    def test_empty_document_has_no_readable_text(self):
        assert clean_text(extract_text_from_bytes(_docx_bytes(lambda d: None), "docx")) == ""


class TestExtractOtherTypes:
    def test_txt_is_decoded(self):
        assert extract_text_from_bytes(b"hello", "txt") == "hello"

    def test_unsupported_type_raises(self):
        with pytest.raises(BadRequestError):
            extract_text_from_bytes(b"x", "exe")

    @pytest.mark.parametrize("ext", ["pdf", "docx"])
    def test_empty_or_corrupt_file_gives_a_plain_message(self, ext):
        for contents in (b"", b"not a real document"):
            with pytest.raises(BadRequestError) as exc:
                extract_text_from_bytes(contents, ext)
            assert "couldn't be read" in exc.value.message


def test_chunk_text_collapses_whitespace_and_respects_size():
    chunks = chunk_text("a  b\n\nc d e f", chunk_size=5, overlap=2)

    assert chunks[0] == "a b c"
    assert all(len(chunk) <= 5 for chunk in chunks)
