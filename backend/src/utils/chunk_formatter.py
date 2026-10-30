class ChunkFormatter:
    def from_results(self, results: list) -> list[dict]:
        return [
            {
                "library_id": lib.id,
                "library_name": lib.name,
                "library_type": lib.type,
                "library_path": lib.path,
                "chunk_index": chunk.chunk_index,
                "page_number": chunk.page_number,
                "text": chunk.chunk_text,
            }
            for chunk, lib in results
        ]

    def context_text(self, chunks: list[dict]) -> str:
        return "\n\n".join(c["text"] for c in chunks)

    def numbered_context(self, chunks: list[dict]) -> str:
        """The passages as the model sees them: each one numbered, so the answer can cite it as [n]."""
        return "\n\n".join(f"[{i}] {self._label(c)}\n{c['text']}" for i, c in enumerate(chunks, start=1))

    def sources(self, chunks: list[dict]) -> list[dict]:
        """One numbered source per passage, in the same order as numbered_context()."""
        return [
            {
                "n": i,
                "doc_id": c["library_id"],
                "name": c["library_name"],
                "page": c["page_number"],
                "quote": c["text"],
                "icon": (c["library_type"] or "text").lower(),
            }
            for i, c in enumerate(chunks, start=1)
        ]

    @staticmethod
    def _label(chunk: dict) -> str:
        page = chunk["page_number"]
        return f"{chunk['library_name']}, page {page}" if page else chunk["library_name"]
