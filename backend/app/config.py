import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "CX PULSE Platform"
    APP_ENV: str = "production"
    API_V1_STR: str = "/api/v1"
    
    # Supabase credentials (optional, falls back gracefully to SQLite)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    DATABASE_URL: str = "sqlite:///./cx_pulse.db"
    
    # Gemini API Key (optional, falls back gracefully to deterministic AI reasoning)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    
    # Multi-tenant defaults
    DEFAULT_COMPANY_ID: str = "shopsphere"
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

