from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.services.synthetic_data import seed_synthetic_dataset

# Import routers
from app.routers import (
    companies, customer_feedback, signals,
    incidents, ai_investigation, decisions,
    recovery, jury_adaptation, verification,
    supabase_router
)

# Create tables
Base.metadata.create_all(bind=engine)

# Seed initial synthetic datasets
with SessionLocal() as db:
    seed_synthetic_dataset(db)

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Customer Experience Predictive Understanding, Learning & Strategic Evaluation Platform"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(companies.router, prefix=settings.API_V1_STR)
app.include_router(customer_feedback.router, prefix=settings.API_V1_STR)
app.include_router(signals.router, prefix=settings.API_V1_STR)
app.include_router(incidents.router, prefix=settings.API_V1_STR)
app.include_router(ai_investigation.router, prefix=settings.API_V1_STR)
app.include_router(decisions.router, prefix=settings.API_V1_STR)
app.include_router(recovery.router, prefix=settings.API_V1_STR)
app.include_router(jury_adaptation.router, prefix=settings.API_V1_STR)
app.include_router(verification.router, prefix=settings.API_V1_STR)
app.include_router(supabase_router.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "platform": "CX PULSE",
        "status": "online",
        "version": "1.0.0",
        "api_documentation": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

