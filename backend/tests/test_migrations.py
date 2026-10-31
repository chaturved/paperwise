import importlib.util
from pathlib import Path
from types import SimpleNamespace

from alembic.config import Config
from alembic.script import ScriptDirectory

BACKEND = Path(__file__).resolve().parents[1]


def _load(filename: str):
    path = BACKEND / "alembic" / "versions" / filename
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_the_migrations_form_one_line_with_a_single_head():
    scripts = ScriptDirectory.from_config(Config(str(BACKEND / "alembic.ini")))

    assert len(scripts.get_heads()) == 1
    assert len(list(scripts.walk_revisions())) >= 13


def _migration_with(monkeypatch, *, table_exists: bool, offline: bool = False):
    """The migration module with a stand-in for Alembic's `op`, plus the list of tables it tried to create."""
    module = _load("88e37589c795_add_recent_queries.py")
    created: list[str] = []
    fake_op = SimpleNamespace(
        get_bind=lambda: object(),
        create_table=lambda name, *columns: created.append(name),
        create_index=lambda *args, **kwargs: None,
        f=lambda name: name,
    )
    monkeypatch.setattr(module, "op", fake_op)
    monkeypatch.setattr(module, "context", SimpleNamespace(is_offline_mode=lambda: offline))
    monkeypatch.setattr(module.sa, "inspect", lambda _bind: SimpleNamespace(has_table=lambda name: table_exists))
    return module, created


def test_the_second_recent_queries_migration_skips_a_table_that_already_exists(monkeypatch):
    module, created = _migration_with(monkeypatch, table_exists=True)

    module.upgrade()

    assert created == []


def test_the_second_recent_queries_migration_still_creates_a_table_that_is_missing(monkeypatch):
    module, created = _migration_with(monkeypatch, table_exists=False)

    module.upgrade()

    assert created == ["recent_queries"]


def test_a_generated_sql_script_assumes_the_initial_migration_made_the_table(monkeypatch):
    module, created = _migration_with(monkeypatch, table_exists=False, offline=True)

    module.upgrade()

    assert created == []
