"""Worker process that parses one uploaded file.

Run as `python -m src.integrations.documents.worker <ext>`: the file bytes arrive on stdin and one JSON
object is written to stdout. The parent (runner.py) enforces the wall-clock timeout; this process also
limits its own memory and CPU so a hostile file cannot take down the web server.
"""

import json
import sys

from ...config import settings
from ...core.exceptions import BadRequestError
from .messages import TOO_LARGE_MESSAGE
from .parsers import parse_document


def _limit_resources() -> None:
    try:
        import resource
    except ImportError:  # not a POSIX platform
        return

    limits = (
        (resource.RLIMIT_AS, settings.EXTRACT_MAX_MEMORY_MB * 1024 * 1024),
        (resource.RLIMIT_CPU, settings.EXTRACT_TIMEOUT_SECONDS + 5),
    )
    for kind, value in limits:
        try:
            resource.setrlimit(kind, (value, value))
        except (ValueError, OSError):  # the platform refuses this limit (for example macOS and RLIMIT_AS)
            pass


def main() -> None:
    ext = sys.argv[1] if len(sys.argv) > 1 else ""
    _limit_resources()
    contents = sys.stdin.buffer.read()

    try:
        result: dict[str, object] = {"ok": True, "text": parse_document(contents, ext)}
    except BadRequestError as exc:
        result = {"ok": False, "message": exc.message}
    except MemoryError:
        result = {"ok": False, "message": TOO_LARGE_MESSAGE}

    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()
