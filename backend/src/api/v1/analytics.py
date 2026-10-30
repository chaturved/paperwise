from fastapi import APIRouter, Depends
from pydantic import BaseModel

from src.core.dependencies import get_current_user_id
from src.services.analytics_service import AnalyticsService, AnalyticsServiceProtocol

router = APIRouter(prefix="/analytics", tags=["Analytics"])


class FeedbackBody(BaseModel):
    value: str


@router.get("/overview")
def overview(
    user_id: int = Depends(get_current_user_id),
    service: AnalyticsServiceProtocol = Depends(AnalyticsService),
):
    return service.get_overview(user_id)


@router.get("/queries")
def query_volume(
    days: int = 30,
    user_id: int = Depends(get_current_user_id),
    service: AnalyticsServiceProtocol = Depends(AnalyticsService),
):
    return service.get_query_volume(user_id, days)


@router.get("/citations")
def top_citations(
    user_id: int = Depends(get_current_user_id),
    service: AnalyticsServiceProtocol = Depends(AnalyticsService),
):
    return service.get_top_cited_docs(user_id)


@router.post("/messages/{message_id}/feedback")
def set_feedback(
    message_id: int,
    body: FeedbackBody,
    user_id: int = Depends(get_current_user_id),
    service: AnalyticsServiceProtocol = Depends(AnalyticsService),
):
    return service.set_feedback(message_id, user_id, body.value)


@router.get("/messages/feedbacks")
def get_feedbacks(
    message_ids: str,
    user_id: int = Depends(get_current_user_id),
    service: AnalyticsServiceProtocol = Depends(AnalyticsService),
):
    ids = [int(i) for i in message_ids.split(",") if i.strip().isdigit()]
    return service.get_feedbacks(user_id, ids)
