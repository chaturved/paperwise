"""Run the document worker process for one file, with a timeout and a cap on how many run at once."""

import asyncio
import json
import sys
from pathlib import Path

from ...config import settings
from ...core.exceptions import BadRequestError
from ...utils.concurrency import PerLoopSemaphore
from .messages import (
    BUSY_MESSAGE,
    TIMEOUT_MESSAGE,
    TOO_LARGE_MESSAGE,
    UNREADABLE_FILE_MESSAGE,
)

# The worker is started as `python -m src.integrations.documents.worker`, so it must run from the backend root.
_BACKEND_ROOT = Path(__file__).resolve().parents[3]

# Only a few workers run at once, however many uploads arrive together.
_worker_slots = PerLoopSemaphore(lambda: settings.EXTRACT_MAX_CONCURRENCY)


async def _run_worker(contents: bytes, ext: str) -> str:
    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "src.integrations.documents.worker",
        ext.lower(),
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
        cwd=_BACKEND_ROOT,
    )

    try:
        stdout, _ = await asyncio.wait_for(process.communicate(contents), timeout=settings.EXTRACT_TIMEOUT_SECONDS)
    except TimeoutError:
        raise BadRequestError(TIMEOUT_MESSAGE) from None
    finally:
        if process.returncode is None:
            process.kill()
            await process.wait()

    if process.returncode != 0 or not stdout:
        # Killed by a resource limit or crashed while parsing.
        raise BadRequestError(TOO_LARGE_MESSAGE)

    try:
        result = json.loads(stdout)
    except json.JSONDecodeError:
        raise BadRequestError(UNREADABLE_FILE_MESSAGE) from None

    if not result.get("ok"):
        raise BadRequestError(str(result.get("message") or UNREADABLE_FILE_MESSAGE))
    return str(result["text"])


async def extract_text_isolated(contents: bytes, ext: str) -> str:
    """Parse an uploaded file in a separate process with a timeout, and return its text.

    At most EXTRACT_MAX_CONCURRENCY workers run at once. Raises BadRequestError for unreadable or
    oversized files, when parsing runs too long, and when no worker frees up in time.
    """
    slots = _worker_slots.get()
    try:
        await asyncio.wait_for(slots.acquire(), timeout=settings.EXTRACT_QUEUE_TIMEOUT_SECONDS)
    except TimeoutError:
        raise BadRequestError(BUSY_MESSAGE) from None

    try:
        return await _run_worker(contents, ext)
    finally:
        slots.release()
