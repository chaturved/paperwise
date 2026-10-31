import asyncio
import io
import sys
import zipfile

import docx
import pymupdf
import pytest

from src.config import settings
from src.core.exceptions import BadRequestError
from src.integrations.documents import IsolatedExtractor, Page, runner
from src.integrations.documents.messages import BUSY_MESSAGE, TIMEOUT_MESSAGE


def _docx_bytes(text: str) -> bytes:
    document = docx.Document()
    document.add_paragraph(text)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


async def test_returns_text_from_the_worker_process():
    assert await IsolatedExtractor().extract(b"hello world", "txt") == [Page(None, "hello world")]


async def test_pdf_pages_keep_their_numbers_through_the_worker_process():
    pdf = pymupdf.open()
    for text in ("first page", "second page"):
        pdf.new_page().insert_text((72, 72), text)

    pages = await IsolatedExtractor().extract(pdf.tobytes(), "pdf")

    assert [(p.number, p.text.strip()) for p in pages] == [(1, "first page"), (2, "second page")]


async def test_extension_is_case_insensitive():
    assert await IsolatedExtractor().extract(b"hello", "TXT") == [Page(None, "hello")]


async def test_docx_is_parsed_in_the_worker():
    assert await IsolatedExtractor().extract(_docx_bytes("Payment due in 30 days"), "docx") == [
        Page(None, "Payment due in 30 days")
    ]


async def test_worker_errors_keep_their_plain_message():
    with pytest.raises(BadRequestError) as exc:
        await IsolatedExtractor().extract(b"not a real pdf", "pdf")
    assert "couldn't be read" in exc.value.message


async def test_unsupported_type_is_reported():
    with pytest.raises(BadRequestError) as exc:
        await IsolatedExtractor().extract(b"x", "exe")
    assert "Unsupported file type" in exc.value.message


async def test_zip_bomb_is_rejected_inside_the_worker():
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("word/document.xml", b"\0" * (settings.MAX_DOCX_UNZIPPED_MB * 1024 * 1024 + 1))

    with pytest.raises(BadRequestError) as exc:
        await IsolatedExtractor().extract(buffer.getvalue(), "docx")
    assert "too large" in exc.value.message


async def test_slow_parsing_is_stopped_after_the_timeout(monkeypatch):
    monkeypatch.setattr(settings, "EXTRACT_TIMEOUT_SECONDS", 0)

    with pytest.raises(BadRequestError) as exc:
        await IsolatedExtractor().extract(b"hello", "txt")
    assert exc.value.message == TIMEOUT_MESSAGE


async def test_timed_out_worker_is_killed(monkeypatch):
    monkeypatch.setattr(settings, "EXTRACT_TIMEOUT_SECONDS", 0)
    started = []
    real_exec = runner.asyncio.create_subprocess_exec

    async def spy(*args, **kwargs):
        process = await real_exec(*args, **kwargs)
        started.append(process)
        return process

    monkeypatch.setattr(runner.asyncio, "create_subprocess_exec", spy)

    with pytest.raises(BadRequestError):
        await IsolatedExtractor().extract(b"hello", "txt")

    assert started and started[0].returncode is not None


async def test_crashed_worker_is_reported_as_too_complex(monkeypatch):
    real_exec = runner.asyncio.create_subprocess_exec

    async def crashing(*_args, **kwargs):
        return await real_exec(sys.executable, "-c", "import os; os._exit(139)", **kwargs)

    monkeypatch.setattr(runner.asyncio, "create_subprocess_exec", crashing)

    with pytest.raises(BadRequestError) as exc:
        await IsolatedExtractor().extract(b"hello", "txt")
    assert "too large or complex" in exc.value.message


_SLOW_WORKER = 'import time; time.sleep(0.3); print(\'{"ok": true, "pages": [{"number": null, "text": "done"}]}\')'


def _track_concurrency(monkeypatch):
    """Replace the worker with a slow stand-in and record how many run at the same time."""
    state = {"running": 0, "peak": 0}
    real_exec = runner.asyncio.create_subprocess_exec

    async def slow_worker(*_args, **kwargs):
        state["running"] += 1
        state["peak"] = max(state["peak"], state["running"])
        process = await real_exec(sys.executable, "-c", _SLOW_WORKER, **kwargs)
        original_wait = process.wait

        async def wait():
            code = await original_wait()
            state["running"] -= 1
            return code

        process.wait = wait
        return process

    monkeypatch.setattr(runner.asyncio, "create_subprocess_exec", slow_worker)
    return state


async def test_only_a_few_workers_run_at_once(monkeypatch):
    monkeypatch.setattr(settings, "EXTRACT_MAX_CONCURRENCY", 2)
    state = _track_concurrency(monkeypatch)

    results = await asyncio.gather(*(IsolatedExtractor().extract(b"x", "txt") for _ in range(6)))

    assert results == [[Page(None, "done")]] * 6
    assert state["peak"] <= 2


async def test_upload_is_refused_when_no_worker_frees_up_in_time(monkeypatch):
    monkeypatch.setattr(settings, "EXTRACT_MAX_CONCURRENCY", 1)
    monkeypatch.setattr(settings, "EXTRACT_QUEUE_TIMEOUT_SECONDS", 0.05)
    _track_concurrency(monkeypatch)

    outcomes = await asyncio.gather(
        *(IsolatedExtractor().extract(b"x", "txt") for _ in range(3)), return_exceptions=True
    )

    refused = [o for o in outcomes if isinstance(o, BadRequestError)]
    assert refused and all(o.message == BUSY_MESSAGE for o in refused)
    assert [Page(None, "done")] in outcomes


async def test_a_slot_is_released_after_a_failed_parse(monkeypatch):
    monkeypatch.setattr(settings, "EXTRACT_MAX_CONCURRENCY", 1)

    with pytest.raises(BadRequestError):
        await IsolatedExtractor().extract(b"not a pdf", "pdf")

    assert await IsolatedExtractor().extract(b"still works", "txt") == [Page(None, "still works")]


@pytest.mark.skipif(sys.platform != "linux", reason="address-space limits are only enforced on Linux")
async def test_worker_memory_limit_is_enforced(monkeypatch):
    monkeypatch.setenv("EXTRACT_MAX_MEMORY_MB", "64")

    with pytest.raises(BadRequestError):
        await IsolatedExtractor().extract(_docx_bytes("x" * 1000), "docx")


def test_the_workers_result_is_its_last_line_so_a_library_warning_cannot_break_it():
    output = b'warning: this API is deprecated\n{"ok": true}\n'

    assert IsolatedExtractor._last_line(output) == b'{"ok": true}'


def test_a_worker_that_printed_nothing_has_no_result_line():
    assert IsolatedExtractor._last_line(b"  \n") == b""


async def test_a_warning_printed_before_the_result_does_not_make_a_file_unreadable(monkeypatch):
    class _Process:
        returncode = 0

        async def communicate(self, _contents):
            return b'warning: the fitz API is deprecated\n{"ok": true, "pages": [{"number": null, "text": "hi"}]}', b""

    async def start(*_args, **_kwargs):
        return _Process()

    monkeypatch.setattr(asyncio, "create_subprocess_exec", start)

    assert await IsolatedExtractor().extract(b"hi", "txt") == [Page(None, "hi")]
