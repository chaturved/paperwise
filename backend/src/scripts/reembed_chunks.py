"""Re-embed every stored chunk with the configured AI provider.

Run this after changing AI_PROVIDER or the embedding model — vectors from
different models can't be compared, so old chunks stop matching new questions.

    cd backend && python -m src.scripts.reembed_chunks
"""
import asyncio

from src.database.db import SessionLocal
from src.integrations.ai import get_ai_provider
from src.integrations.ai.base import AIProvider
from src.repositories.library_repository import LibraryRepository, LibraryRepositoryProtocol

BATCH_SIZE = 100


async def reembed_all(repo: LibraryRepositoryProtocol, ai: AIProvider, batch_size: int = BATCH_SIZE) -> int:
    """Re-embed all chunks in id order, one batch at a time. Returns the number of chunks updated."""
    total = 0
    last_id = 0
    while chunks := repo.get_chunks_after(last_id, batch_size):
        embeddings = await ai.get_embeddings([c.chunk_text for c in chunks])
        repo.set_embeddings(chunks, embeddings)
        total += len(chunks)
        last_id = chunks[-1].id
        print(f"Re-embedded {total} chunks...")
    return total


async def main() -> None:
    db = SessionLocal()
    try:
        total = await reembed_all(LibraryRepository(db), get_ai_provider())
    finally:
        db.close()
    print(f"Done. {total} chunks re-embedded.")


if __name__ == "__main__":
    asyncio.run(main())
