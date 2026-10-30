import asyncio
import json
import sys
import weakref
from pathlib import Path

from ..config import settings
from ..core.exceptions import BadRequestError
from .text_utils import TOO_LARGE_MESSAGE, UNREADABLE_FILE_MESSAGE

TIMEOUT_MESSAGE = "This file took too long to process. Try a smaller or simpler file."
BUSY_MESSAGE = "Paperwise is busy processing other files. Please try again in a moment."

# The worker is started as `python -m src.utils.extract_worker`, so it must run from the backend root.
_BACKEND_ROOT = Path(__file__).resolve().parents[2]

# One limiter per event loop, so only a few workers run at once however many uploads arrive together.
_worker_slots: "weakref.WeakKeyDictionary[asyncio.AbstractEventLoop, asyncio.Semaphore]" = weakref.WeakKeyDictionary()


def _slots() -> asyncio.Semaphore:
    loop = asyncio.get_running_loop()
    if loop not in _worker_slots:
        _worker_slots[loop] = asyncio.Semaphore(settings.EXTRACT_MAX_CONCURRENCY)
    return _worker_slots[loop]


async def _run_worker(contents: bytes, ext: str) -> str:
    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "src.utils.extract_worker",
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
    slots = _slots()
    try:
        await asyncio.wait_for(slots.acquire(), timeout=settings.EXTRACT_QUEUE_TIMEOUT_SECONDS)
    except TimeoutError:
        raise BadRequestError(BUSY_MESSAGE) from None

    try:
        return await _run_worker(contents, ext)
    finally:
        slots.release()
