from fastapi import APIRouter, Depends

from src.core.rate_limit import RateLimit
from src.schemas.demo_request import DemoRequestCreate
from src.schemas.user import WaitlistRequest
from src.services.demo_request_service import DemoRequestService, DemoRequestServiceProtocol
from src.services.waitlist_service import WaitlistService, WaitlistServiceProtocol

router = APIRouter(tags=["Misc"])

form_limit = RateLimit("public-form", "5/minute")


@router.post("/waitlist", dependencies=[Depends(form_limit)])
def join_waitlist(body: WaitlistRequest, service: WaitlistServiceProtocol = Depends(WaitlistService)):
    return service.join(body.email)


@router.post("/demo-requests", dependencies=[Depends(form_limit)])
def request_demo(body: DemoRequestCreate, service: DemoRequestServiceProtocol = Depends(DemoRequestService)):
    return service.submit(body)
