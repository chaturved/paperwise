from datetime import timedelta

import pytest

from src.core.exceptions import UnauthorizedError
from src.services.token_service import TokenService
from src.utils.jwt import JwtCodec
from src.utils.security import PasswordHasher


class TestTokenService:
    @pytest.fixture(autouse=True)
    def setup(self) -> None:
        self.svc = TokenService(codec=JwtCodec())

    def test_access_token_round_trips_to_the_user_id(self):
        assert self.svc.validate_access_token(self.svc.create_access_token(42)) == 42

    def test_refresh_token_round_trips_to_the_user_id(self):
        assert self.svc.validate_refresh_token(self.svc.create_refresh_token(42)) == 42

    def test_refresh_token_is_not_accepted_as_an_access_token(self):
        with pytest.raises(UnauthorizedError, match="Invalid token type"):
            self.svc.validate_access_token(self.svc.create_refresh_token(42))

    def test_expired_token_is_rejected(self):
        expired = self.svc._create(42, timedelta(seconds=-10), "access")
        with pytest.raises(UnauthorizedError, match="expired"):
            self.svc.validate_access_token(expired)

    def test_garbage_token_is_rejected(self):
        with pytest.raises(UnauthorizedError):
            self.svc.validate_access_token("not-a-token")


class TestPasswordHasher:
    def test_verifies_the_right_password_only(self):
        hasher = PasswordHasher()
        hashed = hasher.hash("correct horse")

        assert hashed != "correct horse"
        assert hasher.verify("correct horse", hashed)
        assert not hasher.verify("wrong", hashed)
