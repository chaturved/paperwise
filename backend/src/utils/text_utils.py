import re

from ..config import settings


class TextChunker:
    def __init__(self, chunk_size: int = settings.TEXT_CHUNK_SIZE, overlap: int = settings.TEXT_CHUNK_OVERLAP) -> None:
        self.chunk_size = chunk_size
        self.overlap = overlap

    def clean(self, text: str) -> str:
        return re.sub(r"\s+", " ", text).strip()

    def chunk(self, text: str) -> list[str]:
        text = self.clean(text)
        chunks = []
        start = 0
        while start < len(text):
            chunks.append(text[start : start + self.chunk_size])
            start += self.chunk_size - self.overlap
        return chunks
