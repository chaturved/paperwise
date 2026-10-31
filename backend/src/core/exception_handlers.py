from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .exceptions import AppError, PlanLimitError


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(PlanLimitError)
    async def plan_limit_error_handler(request: Request, exc: PlanLimitError) -> JSONResponse:
        return JSONResponse(
            status_code=402,
            content={
                "error": {
                    "code": "LIMIT_EXCEEDED",
                    "limit": exc.limit,
                    "upgrade_url": "/settings/billing",
                }
            },
        )

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.message, "code": exc.code},
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={"error": "An unexpected error occurred", "code": "INTERNAL_SERVER_ERROR"},
        )
