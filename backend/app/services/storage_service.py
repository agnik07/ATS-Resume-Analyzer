import io
import os
import logging
from pathlib import Path
from typing import Optional
from app.core.config import settings
from app.database.supabase import get_supabase_client

logger = logging.getLogger(__name__)


def upload_resume_file(file_bytes: bytes, filename: str, user_id: str) -> str:
    """
    Upload resume file with prioritized storage backends:
    1. Supabase Storage (if configured)
    2. Cloudinary (if configured)
    3. Local filesystem in uploads/
    """
    clean_filename = f"{user_id}_{filename}".replace(" ", "_")

    # 1. Supabase Storage
    client = get_supabase_client()
    if client and settings.SUPABASE_STORAGE_BUCKET:
        try:
            bucket_name = settings.SUPABASE_STORAGE_BUCKET
            file_path = f"resumes/{clean_filename}"
            
            # Upload or update file in bucket
            client.storage.from_(bucket_name).upload(
                path=file_path,
                file=file_bytes,
                file_options={"upsert": "true"},
            )
            # Retrieve public URL
            public_url = client.storage.from_(bucket_name).get_public_url(file_path)
            logger.info(f"✅ Uploaded resume to Supabase Storage: {public_url}")
            return public_url
        except Exception as e:
            logger.warning(f"Supabase Storage upload warning: {e}. Checking secondary storage.")

    # 2. Cloudinary Storage
    if (
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    ):
        try:
            import cloudinary
            import cloudinary.uploader

            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
            )

            res = cloudinary.uploader.upload(
                io.BytesIO(file_bytes),
                resource_type="raw",
                public_id=f"resumes/{clean_filename}",
                overwrite=True,
            )
            return res.get("secure_url", "")
        except Exception as e:
            logger.warning(f"Cloudinary upload failed: {e}. Falling back to local storage.")

    # 3. Local storage fallback
    upload_dir = settings.LOCAL_UPLOAD_DIR
    upload_dir.mkdir(parents=True, exist_ok=True)
    local_path = upload_dir / clean_filename

    with open(local_path, "wb") as f:
        f.write(file_bytes)

    return f"/uploads/{clean_filename}"
