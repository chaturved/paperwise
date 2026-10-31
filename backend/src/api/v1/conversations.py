import json
import logging

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse

from src.core.dependencies import get_current_user, get_current_user_id
from src.core.exceptions import AppError
from src.core.rate_limit import RateLimit, UserRateLimit
from src.models.user import User
from src.schemas.conversation import (
    AskRequest,
    ConversationCreate,
    ConversationRename,
    ConversationSearchResult,
    FollowUpsResponse,
    MessageRef,
)
from src.services.answer_export_service import AnswerExportService, AnswerExportServiceProtocol
from src.services.ask_service import FAILED_MESSAGE, AskService, AskServiceProtocol
from src.services.conversation_service import ConversationService, ConversationServiceProtocol

_log = logging.getLogger(__name__)

router = APIRouter(prefix="/conversations", tags=["Conversations"])

ask_address_limit = RateLimit("ask-address", "90/minute")
ask_user_limit = UserRateLimit("ask-user", "30/minute")
follow_ups_limit = UserRateLimit("follow-ups", "30/minute")
export_limit = UserRateLimit("export", "30/minute")


def _data(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def _error(message: str) -> str:
    return f"event: error\ndata: {json.dumps({'message': message})}\n\n"


@router.get("")
def get_conversations(
    user_id: int = Depends(get_current_user_id),
    service: ConversationServiceProtocol = Depends(ConversationService),
):
    return service.list_conversations(user_id)


@router.post("")
def create_conversation(
    body: ConversationCreate,
    user_id: int = Depends(get_current_user_id),
    service: ConversationServiceProtocol = Depends(ConversationService),
):
    return service.new_conversation(user_id, body.title)


@router.get("/search", response_model=list[ConversationSearchResult])
def search_conversations(
    q: str = Query(min_length=2, max_length=100),
    user_id: int = Depends(get_current_user_id),
    service: ConversationServiceProtocol = Depends(ConversationService),
) -> list[ConversationSearchResult]:
    return service.search_conversations(user_id, q.strip())


@router.patch("/{conv_id}")
def rename(
    conv_id: int,
    body: ConversationRename,
    user_id: int = Depends(get_current_user_id),
    service: ConversationServiceProtocol = Depends(ConversationService),
):
    return service.rename_conversation(conv_id, user_id, body.title)


@router.delete("/{conv_id}")
def delete(
    conv_id: int,
    user_id: int = Depends(get_current_user_id),
    service: ConversationServiceProtocol = Depends(ConversationService),
):
    return service.remove_conversation(conv_id, user_id)


@router.get("/{conv_id}/messages")
def messages(
    conv_id: int,
    user: User = Depends(get_current_user),
    service: ConversationServiceProtocol = Depends(ConversationService),
):
    return service.list_messages(conv_id, user.id, user.plan)


@router.post("/{conv_id}/versions")
def select_version(
    conv_id: int,
    body: MessageRef,
    user: User = Depends(get_current_user),
    service: ConversationServiceProtocol = Depends(ConversationService),
):
    return service.select_version(conv_id, user.id, body.message_id, user.plan)


@router.post("/{conv_id}/branch")
def branch_conversation(
    conv_id: int,
    body: MessageRef,
    user: User = Depends(get_current_user),
    service: ConversationServiceProtocol = Depends(ConversationService),
):
    return service.branch_conversation(conv_id, user.id, body.message_id, user.plan)


@router.post("/{conv_id}/messages/{message_id}/export", dependencies=[Depends(export_limit)])
def export_answer(
    conv_id: int,
    message_id: int,
    user: User = Depends(get_current_user),
    service: AnswerExportServiceProtocol = Depends(AnswerExportService),
) -> Response:
    file = service.export_docx(conv_id, user.id, message_id, user.plan)
    return Response(
        content=file.content,
        media_type=file.media_type,
        headers={"Content-Disposition": f'attachment; filename="{file.filename}"'},
    )


@router.post("/{conv_id}/follow-ups", response_model=FollowUpsResponse, dependencies=[Depends(follow_ups_limit)])
async def follow_ups(
    conv_id: int,
    user_id: int = Depends(get_current_user_id),
    service: AskServiceProtocol = Depends(AskService),
) -> FollowUpsResponse:
    return await service.follow_ups(conv_id, user_id)


@router.post("/{conv_id}/ask", dependencies=[Depends(ask_address_limit), Depends(ask_user_limit)])
async def ask_question(
    conv_id: int,
    body: AskRequest,
    user: User = Depends(get_current_user),
    service: AskServiceProtocol = Depends(AskService),
):
    async def streamer():
        try:
            async for event_type, data in service.ask(
                conv_id, user.id, body.question, body.filters, body.top_k, user.plan, body.edit_of, body.retry_of
            ):
                yield _data({event_type: data})
        except AppError as e:
            yield _error(e.message)
        except Exception:  # noqa: BLE001 - the stream is already open, so the error has to travel as an event
            _log.exception("Failed to answer question in conversation %s", conv_id)
            yield _error(FAILED_MESSAGE)
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(streamer(), media_type="text/event-stream")
