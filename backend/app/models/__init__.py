from sqlalchemy import Column, String, Text, LargeBinary, JSON, DateTime
from app.database import Base
from sqlalchemy.sql import func

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
    session_id = Column(String, primary_key=True, index=True)
    resume_length = Column(String, nullable=False)
    job_description_length = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())