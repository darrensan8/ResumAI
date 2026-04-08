from fastapi import APIRouter, HTTPException, Depends, Cookie
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Resume

router = APIRouter()

@router.get("/get-resume")
async def get_resume(
    session_id: str = Cookie(default=None),
    db: Session = Depends(get_db)
):
    if not session_id:
        raise HTTPException(status_code=400, detail="No session found. Please upload a resume first.")

    resume = db.query(Resume).filter(Resume.session_id == session_id).first()
    if not resume:
        raise HTTPException(status_code=400, detail="No resume found. Please upload a resume first.")

    return Response(
        content=resume.resume_data, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=resume_{session_id}.pdf"}
        )