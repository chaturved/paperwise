from fastapi import Depends

from ...core.exceptions import BadRequestError
from ...utils.text_utils import TextChunker
from .messages import NO_TEXT_MESSAGE
from .pages import Page
from .runner import IsolatedExtractor


class ReadableTextExtractor:
    def __init__(
        self,
        extractor: IsolatedExtractor = Depends(IsolatedExtractor),
        chunker: TextChunker = Depends(TextChunker),
    ) -> None:
        self.extractor = extractor
        self.chunker = chunker

    async def extract(self, contents: bytes, ext: str) -> list[Page]:
        """The pages of an uploaded file, parsed safely. Raises BadRequestError if there is nothing to read."""
        pages = [page for page in await self.extractor.extract(contents, ext) if self.chunker.clean(page.text)]
        if not pages:
            raise BadRequestError(NO_TEXT_MESSAGE)
        return pages
