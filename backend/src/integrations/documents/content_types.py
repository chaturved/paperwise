from typing import ClassVar


class ContentTypes:
    """The type stored files are labelled with. Chosen here, never taken from the browser: a file labelled
    text/html would be served as a web page by storage."""

    _BY_EXTENSION: ClassVar[dict[str, str]] = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "txt": "text/plain",
        "md": "text/plain",
    }

    def for_extension(self, ext: str) -> str:
        return self._BY_EXTENSION.get(ext.lower(), "application/octet-stream")
