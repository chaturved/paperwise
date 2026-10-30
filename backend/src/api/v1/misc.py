from fastapi import APIRouter, Depends

from src.schemas.user import WaitlistRequest
from src.services.waitlist_service import WaitlistService, WaitlistServiceProtocol

router = APIRouter(tags=["Misc"])


@router.post("/waitlist")
def join_waitlist(body: WaitlistRequest, service: WaitlistServiceProtocol = Depends(WaitlistService)):
    return service.join(body.email)
