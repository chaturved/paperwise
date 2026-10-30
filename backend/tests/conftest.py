import os

import pytest

# Must be set before any src.* imports so pydantic-settings can validate them
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-for-testing-only")
os.environ.setdefault("SESSION_SECRET_KEY", "test-session-secret-key-for-testing")
# Unit tests mock database sessions, but importing the models creates an engine.
# Give SQLAlchemy a valid URL in CI, where no application .env file exists.
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")


@pytest.fixture(autouse=True)
def _fresh_rate_limits():
    from src.core.rate_limit import RateLimit

    RateLimit.reset()
