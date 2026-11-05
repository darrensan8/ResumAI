from fastapi import APIRouter, Depends, Cookie, HTTPException, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Resume, JobDescription, AnalysisScores, SavedAnalysis
from app.auth import get_current_user_id
from app.routes.analysis import new_saved_analysis

router = APIRouter()

PREVIEW_CHARS = 200


@router.get("/")
async def list_history(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    rows = (
        db.query(SavedAnalysis)
        .filter(SavedAnalysis.user_id == user_id)
        .order_by(SavedAnalysis.created_at.desc())
        .all()
    )
    return [
        {
            "id": row.id,
            "created_at": row.created_at,
            "overall_score": row.overall_score,
            "hiring_recommendation": row.hiring_recommendation,
            "job_description_preview": row.job_description[:PREVIEW_CHARS],
        }
        for row in rows
    ]


def _get_owned(db: Session, analysis_id: str, user_id: str) -> SavedAnalysis:
    # Scoped to the user, so another account's ID looks the same as a missing one.
    row = db.query(SavedAnalysis).filter(SavedAnalysis.id == analysis_id, SavedAnalysis.user_id == user_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Saved analysis not found.")
    return row


@router.post("/claim")
async def claim_session_analysis(
    session_id: str = Cookie(default=None),
    x_session_id: str = Header(default=None),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Save the anonymous session's latest analysis to the user's history. Safe to call repeatedly."""
    effective_session_id = session_id or x_session_id
    if not effective_session_id:
        return {"claimed": False}

    score = db.query(AnalysisScores).filter(AnalysisScores.session_id == effective_session_id).first()
    resume = db.query(Resume).filter(Resume.session_id == effective_session_id).first()
    job_desc = db.query(JobDescription).filter(JobDescription.session_id == effective_session_id).first()
    if not (score and resume and job_desc):
        return {"claimed": False}

    already_saved = db.query(SavedAnalysis).filter(
        SavedAnalysis.user_id == user_id,
        SavedAnalysis.session_id == effective_session_id,
        SavedAnalysis.job_description == job_desc.job_description,
    ).first()
    if already_saved:
        return {"claimed": False}

    db.add(new_saved_analysis(
        user_id, effective_session_id, resume.resume_text, job_desc.job_description, score.analysis_data
    ))
    db.commit()
    return {"claimed": True}


@router.get("/{analysis_id}")
async def get_history_item(analysis_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    row = _get_owned(db, analysis_id, user_id)
    return {
        "id": row.id,
        "created_at": row.created_at,
        "job_description": row.job_description,
        "analysis": row.analysis_data,
    }


@router.delete("/{analysis_id}")
async def delete_history_item(analysis_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    db.delete(_get_owned(db, analysis_id, user_id))
    db.commit()
    return {"message": "Saved analysis deleted"}
