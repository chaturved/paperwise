import re


class CitationExtractor:
    _MARKER = re.compile(r"\[(\d+)\]")

    def cited(self, answer: str, source_count: int) -> list[int]:
        """The source numbers an answer cites, in order of first use. Numbers with no matching source are dropped."""
        numbers: list[int] = []
        for match in self._MARKER.finditer(answer):
            n = int(match.group(1))
            if 1 <= n <= source_count and n not in numbers:
                numbers.append(n)
        return numbers
