from fastapi import APIRouter

from ..v1 import analytics, auth, conversations, library, misc, users

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(library.router)
router.include_router(conversations.router)
router.include_router(users.router)
router.include_router(misc.router)
router.include_router(analytics.router)
