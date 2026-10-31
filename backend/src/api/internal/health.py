from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/ping")
def ping_route():
    return {"message": "pong!"}


@router.get("/healthz")
def healthz_route():
    return {"status": "ok"}
