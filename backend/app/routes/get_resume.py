from fastapi import APIRouter, HTTPException, Depends, Cookie, Header
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Resume

router = APIRouter()

@router.get("/get-resume")
async def get_resume(
    session_id: str = Cookie(default=None),
    x_session_id: str = Header(default=None),
    db: Session = Depends(get_db)
):
    effective_session_id = session_id or x_session_id
    if not effective_session_id:
        raise HTTPException(status_code=400, detail="No session found. Please upload a resume first.")

    resume = db.query(Resume).filter(Resume.session_id == effective_session_id).first()
    if not resume:
        raise HTTPException(status_code=400, detail="No resume found. Please upload a resume first.")

    return Response(
        content=resume.resume_data, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=resume_{effective_session_id}.pdf"}
        )