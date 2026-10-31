from authlib.integrations.starlette_client import OAuth
from fastapi import Request
from pydantic import BaseModel

from src.config import settings


class GoogleUser(BaseModel):
    email: str
    provider_user_id: str
    full_name: str


class GoogleOAuth:
    _oauth = OAuth()
    _oauth.register(
        name="google",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
    )

    async def authorize_redirect(self, request: Request):
        return await self._oauth.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)

    async def fetch_user(self, request: Request) -> GoogleUser:
        """Exchange the callback's code for a token and return the signed-in Google user."""
        token = await self._oauth.google.authorize_access_token(request)
        userinfo = token.get("userinfo") or await self._oauth.google.userinfo(token=token)
        email = userinfo["email"]
        return GoogleUser(
            email=email,
            provider_user_id=userinfo["sub"],
            full_name=userinfo.get("name", email.split("@")[0]),
        )
