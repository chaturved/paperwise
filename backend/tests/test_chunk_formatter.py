from types import SimpleNamespace

from src.utils.chunk_formatter import ChunkFormatter


def _chunk(
    name: str, index: int, text: str, page: int | None = 1, kind: str | None = "pdf", doc_id: int = 7, scanned: bool = False
) -> dict:
    return {
        "library_id": doc_id,
        "library_name": name,
        "library_type": kind,
        "library_path": f"/{name}",
        "chunk_index": index,
        "page_number": page,
        "scanned": scanned,
        "text": text,
    }


class TestChunkFormatter:
    formatter = ChunkFormatter()

    def test_from_results_flattens_chunk_and_document(self):
        chunk = SimpleNamespace(chunk_index=2, page_number=4, scanned=False, chunk_text="body")
        lib = SimpleNamespace(id=7, name="a.pdf", type="pdf", path="/a.pdf")

        assert self.formatter.from_results([(chunk, lib)]) == [_chunk("a.pdf", 2, "body", page=4)]

    def test_context_text_joins_chunks_with_blank_lines(self):
        assert self.formatter.context_text([_chunk("a", 0, "one"), _chunk("a", 1, "two")]) == "one\n\ntwo"

    def test_numbered_context_labels_each_passage_with_its_number_and_page(self):
        text = self.formatter.numbered_context(
            [_chunk("lease.pdf", 0, "Rent is due monthly.", page=3), _chunk("notes.md", 0, "Call Sam.", page=None)]
        )

        assert text == "[1] lease.pdf, page 3\nRent is due monthly.\n\n[2] notes.md\nCall Sam."

    def test_sources_give_every_passage_its_own_number_in_the_same_order_as_the_context(self):
        sources = self.formatter.sources(
            [_chunk("a.pdf", 0, "first", page=2), _chunk("a.pdf", 1, "second", page=5), _chunk("b.md", 0, "third", None, None, 9)]
        )

        assert sources == [
            {"n": 1, "doc_id": 7, "name": "a.pdf", "page": 2, "scanned": False, "quote": "first", "icon": "pdf"},
            {"n": 2, "doc_id": 7, "name": "a.pdf", "page": 5, "scanned": False, "quote": "second", "icon": "pdf"},
            {"n": 3, "doc_id": 9, "name": "b.md", "page": None, "scanned": False, "quote": "third", "icon": "text"},
        ]

    def test_sources_say_when_a_passage_was_read_from_a_scan(self):
        [source] = self.formatter.sources([_chunk("scan.pdf", 0, "text", scanned=True)])

        assert source["scanned"] is True

    def test_sources_keep_the_full_passage_so_it_can_be_highlighted_in_the_document(self):
        [source] = self.formatter.sources([_chunk("a.pdf", 0, "x" * 600)])

        assert source["quote"] == "x" * 600
