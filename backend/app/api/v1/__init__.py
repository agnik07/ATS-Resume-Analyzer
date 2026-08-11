from app.api.v1.auth import router as auth_router
from app.api.v1.ats import router as ats_router
from app.api.v1.skill_gap import router as skill_gap_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.student import router as student_router
from app.api.v1.recruiter import router as recruiter_router
from app.api.v1.career import router as career_router
from app.api.v1.admin import router as admin_router

__all__ = [
    "auth_router",
    "ats_router",
    "skill_gap_router",
    "jobs_router",
    "student_router",
    "recruiter_router",
    "career_router",
    "admin_router",
]
