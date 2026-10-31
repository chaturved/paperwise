from types import SimpleNamespace

from src.utils.message_tree import MessageTree


def _message(id: int, parent_id: int | None) -> SimpleNamespace:
    return SimpleNamespace(id=id, parent_id=parent_id)


def _two_versions_of_the_second_question() -> MessageTree:
    return MessageTree([_message(1, None), _message(2, 1), _message(3, 2), _message(4, 1), _message(5, 4)])


def test_the_path_runs_from_the_first_message_down_to_the_leaf():
    assert [m.id for m in _two_versions_of_the_second_question().path_to(3)] == [1, 2, 3]


def test_without_a_leaf_the_path_follows_the_newest_branch():
    assert [m.id for m in _two_versions_of_the_second_question().path_to(None)] == [1, 4, 5]


def test_an_unknown_leaf_falls_back_to_the_newest_branch():
    assert [m.id for m in _two_versions_of_the_second_question().path_to(99)] == [1, 4, 5]


def test_the_latest_leaf_follows_the_newest_child_down():
    tree = _two_versions_of_the_second_question()

    assert tree.latest_leaf(1).id == 5
    assert tree.latest_leaf(2).id == 3
    assert tree.latest_leaf(5).id == 5


def test_siblings_are_the_versions_of_one_turn_oldest_first():
    tree = _two_versions_of_the_second_question()

    assert [m.id for m in tree.versions(tree.by_id[4])] == [2, 4]


def test_first_messages_are_versions_of_each_other():
    tree = MessageTree([_message(1, None), _message(2, None)])

    assert [m.id for m in tree.versions(tree.by_id[1])] == [1, 2]


def test_an_empty_conversation_has_an_empty_path():
    assert MessageTree([]).path_to(None) == []
