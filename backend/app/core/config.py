import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # API Metadata
    PROJECT_NAME: str = "SkillGap AI - Unified Recruitment Intelligence Platform"
    VERSION: str = "3.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*",
    ]

    # Database (Supabase PostgreSQL)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", os.getenv("SUPABASE_ANON_KEY", ""))
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_STORAGE_BUCKET: str = os.getenv("SUPABASE_STORAGE_BUCKET", "resumes")

    # Security & Auth
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", os.getenv("JWT_SECRET", "super-secret-jwt-key-for-skillgap-ai-2026"))
    JWT_REFRESH_SECRET_KEY: str = os.getenv("JWT_REFRESH_SECRET_KEY", "super-secret-refresh-jwt-key-skillgap-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours for seamless development
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Storage (Cloudinary)
    CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET", "")
    LOCAL_UPLOAD_DIR: Path = BASE_DIR / "uploads"

    # AI & NLP Models
    SENTENCE_TRANSFORMER_MODEL: str = "all-MiniLM-L6-v2"
    SPACY_MODEL_PRIMARY: str = "en_core_web_md"
    SPACY_MODEL_SECONDARY: str = "en_core_web_sm"

    # LLM (Groq API)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_PRIMARY_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_FAST_MODEL: str = "llama-3.1-8b-instant"

    # External APIs
    GNEWS_API_KEY: str = os.getenv("GNEWS_API_KEY", "")
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")

    # ATS Scoring Configuration
    MAX_FILE_SIZE_MB: int = 10
    MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024


settings = Settings()
