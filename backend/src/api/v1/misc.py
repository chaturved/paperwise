from fastapi import APIRouter, Depends

from src.schemas.demo_request import DemoRequestCreate
from src.schemas.user import WaitlistRequest
from src.services.demo_request_service import DemoRequestService, DemoRequestServiceProtocol
from src.services.waitlist_service import WaitlistService, WaitlistServiceProtocol

router = APIRouter(tags=["Misc"])


@router.post("/waitlist")
def join_waitlist(body: WaitlistRequest, service: WaitlistServiceProtocol = Depends(WaitlistService)):
    return service.join(body.email)


@router.post("/demo-requests")
def request_demo(body: DemoRequestCreate, service: DemoRequestServiceProtocol = Depends(DemoRequestService)):
    return service.submit(body)
