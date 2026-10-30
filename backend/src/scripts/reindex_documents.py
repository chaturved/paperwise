"""Re-process ready PDFs so their chunks record the page they came from.

Documents indexed before page numbers existed show sources without a page. This downloads each one again,
extracts it page by page and replaces its chunks. It re-embeds the text, so it calls the AI provider once per
document. A document that cannot be re-processed is left exactly as it was.

Lists what it would do by default; pass --apply to change anything.

    cd backend && python -m src.scripts.reindex_documents
    cd backend && python -m src.scripts.reindex_documents --apply
"""

import argparse
import asyncio

from src.core.jobs import DocumentJobs
from src.database.db import SessionLocal
from src.repositories.library_repository import LibraryRepository, LibraryRepositoryProtocol
from src.services.ingestion_service import IngestionService


async def reindex_all(repo: LibraryRepositoryProtocol, service: IngestionService, apply: bool) -> tuple[int, int]:
    """Returns (documents re-indexed, documents skipped or left unchanged)."""
    documents = repo.list_missing_page_numbers()
    print(f"{len(documents)} document(s) have chunks without a page number.")

    done = skipped = 0
    for doc in documents:
        if not apply:
            print(f"  would re-index #{doc.id} {doc.name}")
            continue
        if await service.reindex(doc.id):
            done += 1
            print(f"  re-indexed #{doc.id} {doc.name}")
        else:
            skipped += 1
            print(f"  left unchanged #{doc.id} {doc.name}")
    return done, skipped


async def main(apply: bool) -> None:
    with SessionLocal() as db:
        service = DocumentJobs().ingestion_service(db)
        done, skipped = await reindex_all(LibraryRepository(db), service, apply)
    if apply:
        print(f"Done. {done} re-indexed, {skipped} left unchanged.")
    else:
        print("Dry run only. Pass --apply to re-index them.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--apply", action="store_true", help="re-index the documents instead of only listing them")
    asyncio.run(main(parser.parse_args().apply))
