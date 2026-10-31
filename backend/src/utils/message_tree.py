from collections import defaultdict
from collections.abc import Iterable
from typing import Generic, Protocol, TypeVar


class TreeMessage(Protocol):
    id: int
    parent_id: int | None


M = TypeVar("M", bound=TreeMessage)


class MessageTree(Generic[M]):
    """The messages of one conversation as a tree: an edited question or a retried answer is a sibling of the
    one it replaces. The visible conversation is one path from a first message down to a leaf."""

    def __init__(self, messages: Iterable[M]) -> None:
        self.by_id = {m.id: m for m in messages}
        self._children: dict[int | None, list[M]] = defaultdict(list)
        for message in sorted(self.by_id.values(), key=lambda m: m.id):
            self._children[message.parent_id].append(message)

    def path_to(self, leaf_id: int | None) -> list[M]:
        """The messages from the first one down to `leaf_id`. With no usable leaf, the newest message ends the path."""
        leaf = self.by_id.get(leaf_id) if leaf_id is not None else None
        if leaf is None:
            leaf = self.latest_leaf(None)
        path: list[M] = []
        seen: set[int] = set()
        while leaf is not None and leaf.id not in seen:
            seen.add(leaf.id)
            path.append(leaf)
            leaf = self.by_id.get(leaf.parent_id) if leaf.parent_id is not None else None
        return path[::-1]

    def latest_leaf(self, message_id: int | None) -> M | None:
        """Follow the newest child downward from `message_id` (or from the newest first message) to a leaf."""
        node = self.by_id.get(message_id) if message_id is not None else None
        children = self._children.get(message_id, [])
        while children:
            node = children[-1]
            children = self._children.get(node.id, [])
        return node

    def versions(self, message: M) -> list[M]:
        """The message and its siblings, oldest first: every version of the same turn."""
        return self._children[message.parent_id]
