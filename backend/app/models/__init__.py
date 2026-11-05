from sqlalchemy import Column, String, Text, LargeBinary, JSON, DateTime, Integer
from app.database import Base
from sqlalchemy.sql import func
import uuid

class Resume(Base):
    __tablename__ = "resumes"

    session_id = Column(String, primary_key=True, index=True)
    resume_text = Column(Text, nullable=False)
    resume_data = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class JobDescription(Base):
    __tablename__ = "job_descriptions"

    session_id = Column(String, primary_key=True, index=True)
    job_description = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AnalysisScores(Base):
    __tablename__ = "analysis_scores"

    session_id = Column(String, primary_key=True, index=True)
    analysis_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ResumeFeedback(Base):
    __tablename__ = "resume_feedback"

    session_id = Column(String, primary_key=True, index=True)
    improvements_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Analytics(Base):
    __tablename__ = "analytics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String, index=True)
    resume_length = Column(String, nullable=False)
    job_description_length = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SavedAnalysis(Base):
    """A logged-in user's analysis history; unlike the session tables, rows are appended, not upserted."""
    __tablename__ = "saved_analyses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, nullable=False)
    session_id = Column(String, index=True)
    job_description = Column(Text, nullable=False)
    resume_text = Column(Text, nullable=False)
    overall_score = Column(Integer)
    hiring_recommendation = Column(String)
    analysis_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
