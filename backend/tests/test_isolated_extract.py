import io
import sys
import zipfile

import docx
import pytest

from src.config import settings
from src.core.exceptions import BadRequestError
from src.utils import isolated_extract
from src.utils.isolated_extract import TIMEOUT_MESSAGE, extract_text_isolated


def _docx_bytes(text: str) -> bytes:
    document = docx.Document()
    document.add_paragraph(text)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


async def test_returns_text_from_the_worker_process():
    assert await extract_text_isolated(b"hello world", "txt") == "hello world"


async def test_extension_is_case_insensitive():
    assert await extract_text_isolated(b"hello", "TXT") == "hello"


async def test_docx_is_parsed_in_the_worker():
    assert await extract_text_isolated(_docx_bytes("Payment due in 30 days"), "docx") == "Payment due in 30 days"


async def test_worker_errors_keep_their_plain_message():
    with pytest.raises(BadRequestError) as exc:
        await extract_text_isolated(b"not a real pdf", "pdf")
    assert "couldn't be read" in exc.value.message


async def test_unsupported_type_is_reported():
    with pytest.raises(BadRequestError) as exc:
        await extract_text_isolated(b"x", "exe")
    assert "Unsupported file type" in exc.value.message


async def test_zip_bomb_is_rejected_inside_the_worker():
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("word/document.xml", b"\0" * (settings.MAX_DOCX_UNZIPPED_MB * 1024 * 1024 + 1))

    with pytest.raises(BadRequestError) as exc:
        await extract_text_isolated(buffer.getvalue(), "docx")
    assert "too large" in exc.value.message


async def test_slow_parsing_is_stopped_after_the_timeout(monkeypatch):
    monkeypatch.setattr(settings, "EXTRACT_TIMEOUT_SECONDS", 0)

    with pytest.raises(BadRequestError) as exc:
        await extract_text_isolated(b"hello", "txt")
    assert exc.value.message == TIMEOUT_MESSAGE


async def test_timed_out_worker_is_killed(monkeypatch):
    monkeypatch.setattr(settings, "EXTRACT_TIMEOUT_SECONDS", 0)
    started = []
    real_exec = isolated_extract.asyncio.create_subprocess_exec

    async def spy(*args, **kwargs):
        process = await real_exec(*args, **kwargs)
        started.append(process)
        return process

    monkeypatch.setattr(isolated_extract.asyncio, "create_subprocess_exec", spy)

    with pytest.raises(BadRequestError):
        await extract_text_isolated(b"hello", "txt")

    assert started and started[0].returncode is not None


async def test_crashed_worker_is_reported_as_too_complex(monkeypatch):
    real_exec = isolated_extract.asyncio.create_subprocess_exec

    async def crashing(*_args, **kwargs):
        return await real_exec(sys.executable, "-c", "import os; os._exit(139)", **kwargs)

    monkeypatch.setattr(isolated_extract.asyncio, "create_subprocess_exec", crashing)

    with pytest.raises(BadRequestError) as exc:
        await extract_text_isolated(b"hello", "txt")
    assert "too large or complex" in exc.value.message


@pytest.mark.skipif(sys.platform != "linux", reason="address-space limits are only enforced on Linux")
async def test_worker_memory_limit_is_enforced(monkeypatch):
    monkeypatch.setenv("EXTRACT_MAX_MEMORY_MB", "64")

    with pytest.raises(BadRequestError):
        await extract_text_isolated(_docx_bytes("x" * 1000), "docx")
