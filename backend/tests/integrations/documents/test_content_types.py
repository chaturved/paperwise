import pytest

from src.integrations.documents import ContentTypes


@pytest.mark.parametrize(
    ("ext", "expected"),
    [("pdf", "application/pdf"), ("PDF", "application/pdf"), ("txt", "text/plain"), ("md", "text/plain")],
)
def test_known_extensions_get_a_fixed_type(ext, expected):
    assert ContentTypes().for_extension(ext) == expected


@pytest.mark.parametrize("ext", ["html", "svg", "js", "", "unknown"])
def test_anything_else_is_never_labelled_as_something_a_browser_would_run(ext):
    assert ContentTypes().for_extension(ext) == "application/octet-stream"
