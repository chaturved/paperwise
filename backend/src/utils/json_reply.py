import json
from typing import Any


def parse_json_reply(output: str) -> Any | None:
    """The JSON in a model's reply, which may be wrapped in a code fence. None when it isn't valid JSON."""
    text = output.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None
