from fastapi import FastAPI
from app.database import engine
from app.models import Base
from app.routes import resume, job_description

app = FastAPI()

Base.metadata.create_all(bind=engine)
app.include_router(resume.router, prefix="/api/resume", tags=["resume"])
app.include_router(job_description.router, prefix="/api/job-description", tags=["job-description"])

@app.get("/")
def root():
    return {"message": "Welcome to the Resume Analysis API!"}
    
