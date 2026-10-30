from fastapi import APIRouter

from ..internal import health

router = APIRouter(prefix="/internal")

router.include_router(health.router)