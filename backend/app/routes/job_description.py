from fastapi import APIRouter, Depends, Cookie, HTTPException, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import JobDescription, Resume, AnalysisScores, ResumeFeedback
from pydantic import BaseModel

router = APIRouter()

class JobDescriptionRequest(BaseModel):
    job_description: str

@router.post("/upload-job-description")
async def upload_job_description(
    request: JobDescriptionRequest,
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
    
    if len(request.job_description.split()) <= 50:  
        raise HTTPException(status_code=400, detail="The job description must contain 50 words minimum.")
    
    existing = db.query(JobDescription).filter(JobDescription.session_id == effective_session_id).first()

    if existing:
        existing.job_description = request.job_description
    else:
        new_job_desc = JobDescription(
            session_id=effective_session_id, 
            job_description=request.job_description
        )
        db.add(new_job_desc)
    # The session's previous analysis was run against the old job description, so drop it;
    # otherwise /api/history/claim would save it paired with this new job description.
    db.query(AnalysisScores).filter(AnalysisScores.session_id == effective_session_id).delete()
    db.query(ResumeFeedback).filter(ResumeFeedback.session_id == effective_session_id).delete()
    db.commit()

    return {"message": "Job description uploaded successfully"}
       