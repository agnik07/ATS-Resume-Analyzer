from typing import Any
from app.models.base import SupabaseModel
from app.models.user import User, UserRole
from app.models.resume import Resume
from app.models.ats_report import ATSReport
from app.models.company import Company
from app.models.job import Job
from app.models.application import Application, ApplicationStatus
from app.models.skill_gap import SkillGapReport
from app.models.career_test import CareerTestResult


def get_link_id(link: Any) -> str:
    """Safely extract the string ID from a reference or model instance."""
    if link is None:
        return ""
    if hasattr(link, "id"):
        return str(link.id)
    if hasattr(link, "ref"):
        return str(getattr(link.ref, "id", link.ref))
    return str(link)


__all__ = [
    "SupabaseModel",
    "User",
    "UserRole",
    "Resume",
    "ATSReport",
    "Company",
    "Job",
    "Application",
    "ApplicationStatus",
    "SkillGapReport",
    "CareerTestResult",
    "get_link_id",
]
