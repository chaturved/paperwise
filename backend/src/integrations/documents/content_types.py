"""The type stored files are labelled with. Chosen here, never taken from the browser: a file labelled
text/html would be served as a web page by storage."""

_CONTENT_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain",
    "md": "text/plain",
}


def content_type_for(ext: str) -> str:
    return _CONTENT_TYPES.get(ext.lower(), "application/octet-stream")
