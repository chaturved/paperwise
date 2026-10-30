class ChunkFormatter:
    def from_results(self, results: list) -> list[dict]:
        return [
            {
                "library_name": lib.name,
                "library_type": lib.type,
                "library_path": lib.path,
                "chunk_index": chunk.chunk_index,
                "text": chunk.chunk_text,
            }
            for chunk, lib in results
        ]

    def context_text(self, chunks: list[dict]) -> str:
        return "\n\n".join(c["text"] for c in chunks)

    def snippets(self, chunks: list[dict], limit: int = 5) -> list[dict]:
        return [
            {
                "name": f"{c['library_name']} - Section {c['chunk_index'] + 1}",
                "snippet": c["text"][:300] + ("..." if len(c["text"]) > 300 else ""),
                "icon": (c["library_type"] or "text").lower(),
            }
            for c in chunks[:limit]
        ]

    def sources(self, chunks: list[dict]) -> list[dict]:
        seen: set[str] = set()
        unique = []
        for c in chunks:
            if c["library_name"] not in seen:
                seen.add(c["library_name"])
                unique.append(c)
        return [
            {
                "name": c["library_name"],
                "quote": c["text"][:150] + ("..." if len(c["text"]) > 150 else ""),
                "icon": (c["library_type"] or "text").lower(),
            }
            for c in unique
        ]
