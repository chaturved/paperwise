from unittest.mock import AsyncMock, MagicMock

from src.repositories.library_repository import LibraryRepositoryProtocol
from src.scripts.reindex_documents import reindex_all
from src.services.ingestion_service import IngestionService


def _doc(id: int, name: str) -> MagicMock:
    doc = MagicMock()
    doc.id, doc.name = id, name
    return doc


def _fixtures(outcomes: list[bool]):
    repo = MagicMock(spec_set=LibraryRepositoryProtocol)
    repo.list_missing_page_numbers.return_value = [_doc(i + 1, f"doc{i + 1}.pdf") for i in range(len(outcomes))]
    service = MagicMock(spec_set=IngestionService)
    service.reindex = AsyncMock(side_effect=outcomes)
    return repo, service


async def test_a_dry_run_lists_documents_without_touching_them():
    repo, service = _fixtures([True, True])

    assert await reindex_all(repo, service, apply=False) == (0, 0)

    service.reindex.assert_not_called()


async def test_apply_reindexes_each_document_and_counts_the_ones_left_unchanged():
    repo, service = _fixtures([True, False, True])

    assert await reindex_all(repo, service, apply=True) == (2, 1)

    assert [c.args[0] for c in service.reindex.call_args_list] == [1, 2, 3]
