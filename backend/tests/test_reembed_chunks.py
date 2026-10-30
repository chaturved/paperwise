from unittest.mock import AsyncMock, MagicMock

from src.integrations.ai.base import AIProvider
from src.repositories.library_repository import LibraryRepositoryProtocol
from src.scripts.reembed_chunks import reembed_all


def _chunk(id: int, text: str) -> MagicMock:
    chunk = MagicMock()
    chunk.id = id
    chunk.chunk_text = text
    return chunk


class TestReembedAll:
    async def test_reembeds_in_batches_until_no_chunks_left(self):
        repo = MagicMock(spec_set=LibraryRepositoryProtocol)
        first, second = [_chunk(1, "a"), _chunk(2, "b")], [_chunk(3, "c")]
        repo.get_chunks_after.side_effect = [first, second, []]
        ai = MagicMock(spec_set=AIProvider)
        ai.get_embeddings = AsyncMock(side_effect=[[[0.1], [0.2]], [[0.3]]])

        total = await reembed_all(repo, ai, batch_size=2)

        assert total == 3
        assert [c.args for c in repo.get_chunks_after.call_args_list] == [(0, 2), (2, 2), (3, 2)]
        ai.get_embeddings.assert_any_call(["a", "b"])
        repo.set_embeddings.assert_any_call(first, [[0.1], [0.2]])
        repo.set_embeddings.assert_any_call(second, [[0.3]])

    async def test_does_nothing_when_there_are_no_chunks(self):
        repo = MagicMock(spec_set=LibraryRepositoryProtocol)
        repo.get_chunks_after.return_value = []
        ai = MagicMock(spec_set=AIProvider)

        assert await reembed_all(repo, ai) == 0
        ai.get_embeddings.assert_not_called()
