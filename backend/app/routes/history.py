from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AnalysisHistory, User
from app.services.auth import get_current_user

router = APIRouter()

PREVIEW_CHARS = 200


@router.get("/")
def list_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(AnalysisHistory)
        .filter(AnalysisHistory.user_id == user.id)
        .order_by(AnalysisHistory.created_at.desc(), AnalysisHistory.id.desc())
        .all()
    )
    return [
        {
            "id": row.id,
            "created_at": row.created_at,
            "role_level": row.role_level,
            "overall_score": row.analysis_data.get("overall_score"),
            "hiring_recommendation": row.analysis_data.get("hiring_recommendation"),
            "job_description_preview": row.job_description[:PREVIEW_CHARS],
        }
        for row in rows
    ]


@router.get("/{history_id}")
def get_history(history_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = (
        db.query(AnalysisHistory)
        .filter(AnalysisHistory.id == history_id, AnalysisHistory.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return {
        "id": row.id,
        "created_at": row.created_at,
        "role_level": row.role_level,
        "job_description": row.job_description,
        "analysis_data": row.analysis_data,
    }
