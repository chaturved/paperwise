import pytest

from src.utils.citations import CitationExtractor


@pytest.mark.parametrize(
    ("answer", "count", "expected"),
    [
        ("Rent is due monthly [1].", 3, [1]),
        ("Late fee of 2% [2][1].", 3, [2, 1]),
        ("Repeated [2] and again [2].", 3, [2]),
        ("Invented [9] and [0] are dropped.", 3, []),
        ("A real one [3] beside a fake [4].", 3, [3]),
        ("No citations at all.", 3, []),
        ("Brackets that are not citations [a] [] [1a].", 3, []),
    ],
)
def test_only_numbers_that_match_a_source_are_kept(answer, count, expected):
    assert CitationExtractor().cited(answer, count) == expected
