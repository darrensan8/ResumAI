from fastapi import FastAPI
from app.database import engine
from app.models import Base

app = FastAPI()

Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "Welcome to the Resume Analysis API!"}
    
