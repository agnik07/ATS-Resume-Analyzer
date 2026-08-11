import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.database.supabase import close_db, init_db
from app.api.v1 import (
    admin_router,
    ats_router,
    auth_router,
    career_router,
    jobs_router,
    recruiter_router,
    skill_gap_router,
    student_router,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("skillgap_ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager: initialize database and preload NLP/embedding models."""
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}...")

    # 1. Initialize MongoDB & Beanie ODM
    try:
        await init_db()
    except Exception as e:
        logger.error(f"Database initialization warning: {e}. (Will retry on queries)")

    # 2. Preload SentenceTransformer
    try:
        logger.info(f"Loading SentenceTransformer: {settings.SENTENCE_TRANSFORMER_MODEL}...")
        from sentence_transformers import SentenceTransformer
        try:
            app.state.embedder = SentenceTransformer(settings.SENTENCE_TRANSFORMER_MODEL, local_files_only=True)
        except Exception:
            app.state.embedder = SentenceTransformer(settings.SENTENCE_TRANSFORMER_MODEL)
        logger.info("✅ SentenceTransformer loaded.")
    except Exception as e:
        logger.warning(f"Failed to load SentenceTransformer: {e}. Embedder set to None.")
        app.state.embedder = None

    # 3. Preload spaCy NLP
    try:
        logger.info(f"Loading spaCy NLP model: {settings.SPACY_MODEL_PRIMARY}...")
        import spacy
        try:
            app.state.nlp = spacy.load(settings.SPACY_MODEL_PRIMARY)
            logger.info(f"✅ Loaded spaCy {settings.SPACY_MODEL_PRIMARY}.")
        except Exception:
            logger.warning(f"Falling back to spaCy {settings.SPACY_MODEL_SECONDARY}...")
            app.state.nlp = spacy.load(settings.SPACY_MODEL_SECONDARY)
            logger.info(f"✅ Loaded spaCy {settings.SPACY_MODEL_SECONDARY}.")
    except Exception as e:
        logger.warning(f"Failed to load spaCy: {e}. NLP set to None.")
        app.state.nlp = None

    logger.info("🚀 Platform API is ready to serve requests.")
    yield

    logger.info("Shutting down platform API...")
    await close_db()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Unified AI-Powered Recruitment & Career Intelligence Platform",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 Routers
api_v1_prefix = settings.API_V1_STR
app.include_router(auth_router, prefix=api_v1_prefix)
app.include_router(ats_router, prefix=api_v1_prefix)
app.include_router(skill_gap_router, prefix=api_v1_prefix)
app.include_router(jobs_router, prefix=api_v1_prefix)
app.include_router(student_router, prefix=api_v1_prefix)
app.include_router(recruiter_router, prefix=api_v1_prefix)
app.include_router(career_router, prefix=api_v1_prefix)
app.include_router(admin_router, prefix=api_v1_prefix)

# Mount local uploads directory if it exists
settings.LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(settings.LOCAL_UPLOAD_DIR)), name="uploads")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/")
async def root():
    """Root metadata discovery."""
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "documentation": "/docs",
        "endpoints": {
            "auth": f"{api_v1_prefix}/auth",
            "ats": f"{api_v1_prefix}/ats",
            "skill_gap": f"{api_v1_prefix}/skill-gap",
            "jobs": f"{api_v1_prefix}/jobs",
            "student": f"{api_v1_prefix}/student",
            "recruiter": f"{api_v1_prefix}/recruiter",
            "career": f"{api_v1_prefix}/career",
            "admin": f"{api_v1_prefix}/admin",
        },
    }
