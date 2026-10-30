import asyncio
from unittest.mock import MagicMock, patch

from src.config import settings
from src.core.jobs import DocumentJobs


def _session():
    session = MagicMock()
    session.__enter__.return_value = session
    return session


async def test_process_runs_the_service_with_its_own_session():
    session = _session()
    service = MagicMock()
    service.process = MagicMock(side_effect=lambda doc_id: asyncio.sleep(0))

    with patch.object(DocumentJobs, "ingestion_service", return_value=service) as build:
        await DocumentJobs(session_factory=lambda: session).process(5)

    build.assert_called_once_with(session)
    service.process.assert_called_once_with(5)
    session.__exit__.assert_called_once()


async def test_only_a_few_documents_are_processed_at_once(monkeypatch):
    monkeypatch.setattr(settings, "INGEST_MAX_CONCURRENCY", 2)
    state = {"running": 0, "peak": 0}

    async def slow_process(_doc_id):
        state["running"] += 1
        state["peak"] = max(state["peak"], state["running"])
        await asyncio.sleep(0.05)
        state["running"] -= 1

    service = MagicMock()
    service.process = slow_process

    with patch.object(DocumentJobs, "ingestion_service", return_value=service):
        await asyncio.gather(*(DocumentJobs(session_factory=_session).process(i) for i in range(6)))

    assert state["peak"] == 2


def test_recover_interrupted_uses_its_own_session():
    session = _session()
    service = MagicMock()

    with patch.object(DocumentJobs, "ingestion_service", return_value=service):
        DocumentJobs(session_factory=lambda: session).recover_interrupted()

    service.recover_interrupted.assert_called_once_with()
    session.__exit__.assert_called_once()
