from ...core.exceptions import BadRequestError
from ...utils.text_utils import clean_text
from .messages import NO_TEXT_MESSAGE
from .runner import extract_text_isolated


async def extract_readable_text(contents: bytes, ext: str) -> str:
    """The text of an uploaded file, parsed safely. Raises BadRequestError if there is nothing to read."""
    text = await extract_text_isolated(contents, ext)
    if not clean_text(text):
        raise BadRequestError(NO_TEXT_MESSAGE)
    return text
