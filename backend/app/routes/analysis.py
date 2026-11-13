import json
from fastapi import APIRouter, Depends, Cookie, HTTPException, Header
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.models import Resume, JobDescription, AnalysisScores, ResumeFeedback, AnalysisHistory, User
from app.services.analysis import analyze_resume, stream_analysis
from app.services.ats import scan_resume
from app.services.auth import get_optional_user
from pydantic import BaseModel

router = APIRouter()

class AnalysisRequest(BaseModel):
    role_level: str = "intern"


def load_inputs(db: Session, session_id: str | None, x_session_id: str | None) -> tuple[str, Resume, JobDescription]:
    effective_session_id = session_id or x_session_id
    if not effective_session_id:
        raise HTTPException(status_code=400, detail="No session found. Please upload a resume first.")

    resume = db.query(Resume).filter(Resume.session_id == effective_session_id).first()
    if not resume:
        raise HTTPException(status_code=400, detail="No resume found. Please upload a resume first.")

    job_desc = db.query(JobDescription).filter(JobDescription.session_id == effective_session_id).first()
    if not job_desc:
        raise HTTPException(status_code=400, detail="No job description found. Please upload a job description first.")

    return effective_session_id, resume, job_desc


def save_analysis(
    db: Session,
    effective_session_id: str,
    analysis: dict,
    job_description: str,
    role_level: str,
    user_id: str | None,
) -> None:
    existing_score = db.query(AnalysisScores).filter(AnalysisScores.session_id == effective_session_id).first()
    if existing_score:
        existing_score.analysis_data = analysis
    else:
        db.add(AnalysisScores(
            session_id=effective_session_id,
            analysis_data=analysis
        ))

    existing_feedback = db.query(ResumeFeedback).filter(
        ResumeFeedback.session_id == effective_session_id
    ).first()
    if existing_feedback:
        existing_feedback.improvements_data = analysis.get("improvements", [])
    else:
        db.add(ResumeFeedback(
            session_id=effective_session_id,
            improvements_data=analysis.get("improvements", [])
        ))

    # Append-only history; anonymous rows (user_id None) are claimed on login/signup.
    db.add(AnalysisHistory(
        session_id=effective_session_id,
        user_id=user_id,
        job_description=job_description,
        role_level=role_level,
        analysis_data=analysis,
    ))

    db.commit()


@router.post("/analyze")
async def analyze(
    request: AnalysisRequest,
    session_id: str = Cookie(default=None),
    x_session_id: str = Header(default=None),
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    effective_session_id, resume, job_desc = load_inputs(db, session_id, x_session_id)
    scan = await run_in_threadpool(
        scan_resume, resume.resume_data, resume.resume_text, job_desc.job_description
    )

    try:
        analysis = await run_in_threadpool(
            analyze_resume, resume.resume_text, job_desc.job_description, request.role_level, scan
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    analysis["ats_scan"] = scan

    save_analysis(
        db, effective_session_id, analysis,
        job_desc.job_description, request.role_level, user.id if user else None,
    )
    return analysis


def _sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _save_in_new_session(effective_session_id: str, analysis: dict, *args) -> None:
    # The request-scoped session may already be closed while the stream is still open.
    db = SessionLocal()
    try:
        save_analysis(db, effective_session_id, analysis, *args)
    finally:
        db.close()


@router.post("/analyze-stream")
async def analyze_stream(
    request: AnalysisRequest,
    session_id: str = Cookie(default=None),
    x_session_id: str = Header(default=None),
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Server-sent events: one `section` event per finished field, then `done` or `error`."""
    effective_session_id, resume, job_desc = load_inputs(db, session_id, x_session_id)
    resume_text, job_description = resume.resume_text, job_desc.job_description
    user_id = user.id if user else None
    scan = await run_in_threadpool(scan_resume, resume.resume_data, resume_text, job_description)

    async def events():
        # The parser results are measured, not generated, so they can show before Claude starts.
        yield _sse("section", {"key": "ats_scan", "value": scan})
        try:
            async for kind, payload in stream_analysis(
                resume_text, job_description, request.role_level, ats_scan=scan
            ):
                if kind == "section":
                    key, value = payload
                    yield _sse("section", {"key": key, "value": value})
                else:
                    payload["ats_scan"] = scan
                    await run_in_threadpool(
                        _save_in_new_session, effective_session_id, payload,
                        job_description, request.role_level, user_id,
                    )
                    yield _sse("done", {})
        except Exception as e:
            yield _sse("error", {"detail": str(e) if isinstance(e, ValueError) else "Analysis failed."})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
