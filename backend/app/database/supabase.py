import asyncio
import logging
from typing import Any, Dict, List, Optional
from supabase import Client, create_client
from app.core.config import settings

logger = logging.getLogger(__name__)

supabase_client: Optional[Client] = None

# Local fallback in-memory store if running in development without live Supabase credentials
_in_memory_db: Dict[str, Dict[str, Dict[str, Any]]] = {
    "users": {},
    "resumes": {},
    "ats_reports": {},
    "companies": {},
    "jobs": {},
    "applications": {},
    "skill_gap_reports": {},
    "career_test_results": {},
}


def get_supabase_client() -> Optional[Client]:
    """Return the global Supabase client."""
    global supabase_client
    return supabase_client


def is_supabase_configured() -> bool:
    """Check if valid Supabase credentials have been configured."""
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
    return bool(settings.SUPABASE_URL and key and settings.SUPABASE_URL.startswith("http"))


async def init_db():
    """Initialize Supabase client connection."""
    global supabase_client
    if is_supabase_configured():
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
        try:
            logger.info(f"Connecting to Supabase at {settings.SUPABASE_URL}...")
            supabase_client = create_client(settings.SUPABASE_URL, key)
            logger.info("✅ Supabase client initialized successfully.")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase client: {e}. Falling back to memory storage.")
            supabase_client = None
    else:
        logger.warning(
            "⚠️ Supabase URL or Key not set in environment. "
            "Running with in-memory persistence for local development. "
            "To persist to cloud, set SUPABASE_URL and SUPABASE_KEY in your .env file."
        )
        supabase_client = None


async def close_db():
    """Close / cleanup database resources on shutdown."""
    global supabase_client
    supabase_client = None
    logger.info("Supabase client connection closed.")
