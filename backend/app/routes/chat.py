import logging
from typing import Literal

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AnalysisHistory, AnalysisScores
from app.routes.analysis import _sse, load_inputs
from app.services.chat import build_chat_system, stream_chat

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_MESSAGES = 30
MAX_MESSAGE_CHARS = 4000


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


def validate_messages(messages: list[ChatMessage]) -> None:
    if not 1 <= len(messages) <= MAX_MESSAGES:
        raise HTTPException(status_code=400, detail=f"A conversation can have 1 to {MAX_MESSAGES} messages.")
    for i, message in enumerate(messages):
        expected = "user" if i % 2 == 0 else "assistant"
        if message.role != expected:
            raise HTTPException(status_code=400, detail="Messages must alternate, starting with the user.")
        if not message.content.strip():
            raise HTTPException(status_code=400, detail="Messages can't be empty.")
        if len(message.content) > MAX_MESSAGE_CHARS:
            raise HTTPException(status_code=400, detail=f"Messages must be at most {MAX_MESSAGE_CHARS} characters.")
    if messages[-1].role != "user":
        raise HTTPException(status_code=400, detail="The last message must be from the user.")


@router.post("/message")
async def chat_message(
    request: ChatRequest,
    session_id: str = Cookie(default=None),
    x_session_id: str = Header(default=None),
    db: Session = Depends(get_db),
):
    """Server-sent events: `delta` events with reply text, then `done` or `error`."""
    validate_messages(request.messages)
    effective_session_id, resume, job_desc = load_inputs(db, session_id, x_session_id)

    scores = db.query(AnalysisScores).filter(AnalysisScores.session_id == effective_session_id).first()
    if not scores:
        raise HTTPException(status_code=400, detail="Run an analysis first.")
    latest = (
        db.query(AnalysisHistory)
        .filter(AnalysisHistory.session_id == effective_session_id)
        .order_by(AnalysisHistory.created_at.desc(), AnalysisHistory.id.desc())
        .first()
    )

    # Plain values only: the request-scoped DB session may close while the stream is open.
    system = build_chat_system(
        resume.resume_text,
        job_desc.job_description,
        scores.analysis_data,
        latest.role_level if latest else "entry",
    )
    messages = [m.model_dump() for m in request.messages]

    async def events():
        try:
            async for text in stream_chat(system, messages):
                yield _sse("delta", {"text": text})
            yield _sse("done", {})
        except Exception as e:
            if not isinstance(e, ValueError):
                logger.exception("Chat failed")
            yield _sse("error", {"detail": str(e) if isinstance(e, ValueError) else "Chat failed."})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
