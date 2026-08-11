from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from pydantic import Field, field_validator
from app.models.base import SupabaseModel


class Resume(SupabaseModel):
    __table_name__: str = "resumes"

    user_id: str
    filename: str
    file_url: Optional[str] = None  # Cloudinary / Supabase Storage URL or local path
    file_size_bytes: int = 0
    file_type: str = "pdf"  # pdf, docx
    raw_text: str = ""
    parsed_data: Dict[str, Any] = Field(default_factory=dict)
    extracted_skills: List[str] = Field(default_factory=list)
    action_verbs: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("user_id", mode="before")
    @classmethod
    def convert_user_id(cls, v: Any) -> str:
        if hasattr(v, "id"):
            return str(v.id)
        return str(v) if v is not None else ""
