from src.utils.text_utils import chunk_text, clean_text


def test_clean_text_collapses_whitespace():
    assert clean_text("  a \n\n b\t c  ") == "a b c"


def test_chunk_text_collapses_whitespace_and_respects_size():
    chunks = chunk_text("a  b\n\nc d e f", chunk_size=5, overlap=2)

    assert chunks[0] == "a b c"
    assert all(len(chunk) <= 5 for chunk in chunks)
