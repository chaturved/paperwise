import asyncio
import json
import sys
from pathlib import Path

from ..config import settings
from ..core.exceptions import BadRequestError
from .text_utils import TOO_LARGE_MESSAGE, UNREADABLE_FILE_MESSAGE

TIMEOUT_MESSAGE = "This file took too long to process. Try a smaller or simpler file."

# The worker is started as `python -m src.utils.extract_worker`, so it must run from the backend root.
_BACKEND_ROOT = Path(__file__).resolve().parents[2]


async def extract_text_isolated(contents: bytes, ext: str) -> str:
    """Parse an uploaded file in a separate process with a timeout, and return its text.

    Raises BadRequestError for unreadable or oversized files, and when parsing runs too long.
    """
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
