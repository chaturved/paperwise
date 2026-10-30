from types import SimpleNamespace

from src.utils.chunk_formatter import ChunkFormatter


def _chunk(name: str, index: int, text: str, kind: str | None = "pdf") -> dict:
    return {"library_name": name, "library_type": kind, "library_path": f"/{name}", "chunk_index": index, "text": text}


class TestChunkFormatter:
    formatter = ChunkFormatter()

    def test_from_results_flattens_chunk_and_document(self):
        chunk = SimpleNamespace(chunk_index=2, chunk_text="body")
        lib = SimpleNamespace(name="a.pdf", type="pdf", path="/a.pdf")

        assert self.formatter.from_results([(chunk, lib)]) == [_chunk("a.pdf", 2, "body")]

    def test_context_text_joins_chunks_with_blank_lines(self):
        assert self.formatter.context_text([_chunk("a", 0, "one"), _chunk("a", 1, "two")]) == "one\n\ntwo"

    def test_snippets_are_numbered_from_one_and_truncated(self):
        [snippet] = self.formatter.snippets([_chunk("a.pdf", 0, "x" * 400)])

        assert snippet["name"] == "a.pdf - Section 1"
        assert snippet["snippet"] == "x" * 300 + "..."

    def test_snippets_respect_the_limit(self):
        chunks = [_chunk("a", i, "t") for i in range(9)]

        assert len(self.formatter.snippets(chunks, limit=3)) == 3

    def test_sources_list_each_document_once(self):
        sources = self.formatter.sources([_chunk("a.pdf", 0, "first"), _chunk("a.pdf", 1, "second"), _chunk("b.md", 0, "third", None)])

        assert [(s["name"], s["quote"], s["icon"]) for s in sources] == [("a.pdf", "first", "pdf"), ("b.md", "third", "text")]
