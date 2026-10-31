from src.utils.json_reply import parse_json_reply


def test_plain_json_is_parsed():
    assert parse_json_reply('["a", "b"]') == ["a", "b"]


def test_json_in_a_code_fence_is_parsed():
    assert parse_json_reply('```json\n[{"a": 1}]\n```') == [{"a": 1}]


def test_text_that_is_not_json_gives_none():
    assert parse_json_reply("Sorry, I can't help with that.") is None
