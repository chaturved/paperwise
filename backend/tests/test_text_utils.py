from src.utils.text_utils import TextChunker


def test_clean_collapses_whitespace():
    assert TextChunker().clean("  a \n\n b\t c  ") == "a b c"


def test_chunk_collapses_whitespace_and_respects_size():
    chunks = TextChunker(chunk_size=5, overlap=2).chunk("a  b\n\nc d e f")

    assert chunks[0] == "a b c"
    assert all(len(chunk) <= 5 for chunk in chunks)
