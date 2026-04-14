from fastapi import APIRouter, UploadFile, File, Depends, Response, Cookie
from app.database import get_db
from sqlalchemy.orm import Session
from app.models import Resume
import pdfplumber
import io
import uuid

router = APIRouter()

def extract_text_from_pdf(file_bytes: bytes) -> str:
    text=""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            if page_text := page.extract_text():
                text += page_text + "\n"
    return text


@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...), 
    response: Response = None,
    session_id: str = Cookie(default=None),
    db: Session = Depends(get_db)
):
    if file.content_type != "application/pdf":
        return {"error": "Only PDF files are allowed."}
    
    file_bytes = await file.read() 
    resume_text = extract_text_from_pdf(file_bytes)

    if len(resume_text.split()) <= 50:  # Arbitrary threshold for minimum word count
        return {"error": "The uploaded resume must contain 50 words minimum."}

    if not session_id:
        session_id = str(uuid.uuid4())
        response.set_cookie(key="session_id", value=session_id, httponly=True)

    existing = db.query(Resume).filter(Resume.session_id == session_id).first()

    if existing:
        existing.resume_text = resume_text
        existing.resume_data = file_bytes
    else:
        new_resume = Resume(
            session_id=session_id, 
            resume_text=resume_text, 
            resume_data=file_bytes
            )
        db.add(new_resume)
    db.commit()

    response.set_cookie(key="session_id", value=session_id, httponly=False, samesite="none", secure=True)
    return {"message": "Resume uploaded successfully", "session_id": session_id}
