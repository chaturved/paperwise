import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from .api import router
from .config import settings
from .core.exception_handlers import register_exception_handlers
from .core.jobs import DocumentJobs


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    try:
        DocumentJobs().recover_interrupted()
    except Exception:  # a failed cleanup must never stop the API from starting
        logging.getLogger(__name__).exception("Could not recover interrupted documents")
    yield


app = FastAPI(title="Paperwise API", lifespan=lifespan)

app.add_middleware(SessionMiddleware, secret_key=settings.SESSION_SECRET_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

register_exception_handlers(app)
