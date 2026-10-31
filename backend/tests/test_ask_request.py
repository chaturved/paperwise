import pytest
from pydantic import ValidationError

from src.schemas.conversation import AskRequest


def test_a_request_can_edit_a_question():
    assert AskRequest(question="q", edit_of=3).edit_of == 3


def test_a_request_can_retry_an_answer():
    assert AskRequest(question="q", retry_of=4).retry_of == 4


def test_a_request_cannot_edit_and_retry_at_once():
    with pytest.raises(ValidationError):
        AskRequest(question="q", edit_of=3, retry_of=4)
