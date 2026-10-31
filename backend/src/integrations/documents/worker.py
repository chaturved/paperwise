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
from .parsers import DocumentParser
from .timeouts import ExtractionTimeout


class ResourceLimits:
    def apply(self, timeout_seconds: int) -> None:
        try:
            import resource
        except ImportError:
            return

        limits = (
            (resource.RLIMIT_AS, settings.EXTRACT_MAX_MEMORY_MB * 1024 * 1024),
            (resource.RLIMIT_CPU, timeout_seconds + 5),
        )
        for kind, value in limits:
            try:
                resource.setrlimit(kind, (value, value))
            except (ValueError, OSError):
                pass


class ExtractionWorker:
    def __init__(self, parser: DocumentParser, limits: ResourceLimits, timeout: ExtractionTimeout) -> None:
        self.parser = parser
        self.limits = limits
        self.timeout = timeout

    def run(self, ext: str) -> None:
        self.limits.apply(self.timeout.seconds(ext))
        contents = sys.stdin.buffer.read()

        try:
            pages = self.parser.parse(contents, ext)
            result: dict[str, object] = {
                "ok": True,
                "pages": [{"number": p.number, "text": p.text, "scanned": p.scanned} for p in pages],
            }
        except BadRequestError as exc:
            result = {"ok": False, "message": exc.message}
        except MemoryError:
            result = {"ok": False, "message": TOO_LARGE_MESSAGE}

        sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    ExtractionWorker(DocumentParser(), ResourceLimits(), ExtractionTimeout()).run(
        sys.argv[1] if len(sys.argv) > 1 else ""
    )
