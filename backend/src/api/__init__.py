from fastapi import APIRouter

from ..api import internal, v1

router = APIRouter()

router.include_router(v1.router)
router.include_router(internal.router)
