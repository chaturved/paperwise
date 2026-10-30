from fastapi import Depends

from ...core.exceptions import BadRequestError
from ...utils.text_utils import TextChunker
from .messages import NO_TEXT_MESSAGE
from .runner import IsolatedExtractor


class ReadableTextExtractor:
    def __init__(
        self,
        extractor: IsolatedExtractor = Depends(IsolatedExtractor),
        chunker: TextChunker = Depends(TextChunker),
    ) -> None:
        self.extractor = extractor
        self.chunker = chunker

    async def extract(self, contents: bytes, ext: str) -> str:
        """The text of an uploaded file, parsed safely. Raises BadRequestError if there is nothing to read."""
        text = await self.extractor.extract(contents, ext)
        if not self.chunker.clean(text):
            raise BadRequestError(NO_TEXT_MESSAGE)
        return text
