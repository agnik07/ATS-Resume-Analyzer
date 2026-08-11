from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from app.api.deps import require_admin
from app.models.user import User, UserRole
from app.models.resume import Resume
from app.models.ats_report import ATSReport
from app.models.job import Job
from app.models.application import Application
from app.schemas.auth import UserProfileResponse

router = APIRouter(prefix="/admin", tags=["Admin Portal"])


class UserStatusUpdateRequest(BaseModel):
    is_active: bool
    role: Optional[UserRole] = None


@router.get("/dashboard")
async def get_admin_dashboard(current_user: User = Depends(require_admin)):
    """System-wide platform analytics and health monitoring."""
    total_users = await User.count()
    total_students = await User.find(User.role == UserRole.STUDENT).count()
    total_recruiters = await User.find(User.role == UserRole.RECRUITER).count()
    total_resumes = await Resume.count()
    total_reports = await ATSReport.count()
    total_jobs = await Job.count()
    total_applications = await Application.count()

    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_recruiters": total_recruiters,
        "total_resumes_parsed": total_resumes,
        "total_ats_evaluations": total_reports,
        "total_jobs_posted": total_jobs,
        "total_applications": total_applications,
        "system_status": "Healthy & Operational",
    }


@router.get("/users", response_model=List[UserProfileResponse])
async def list_all_users(
    role: Optional[UserRole] = Query(None),
    current_user: User = Depends(require_admin),
):
    """List registered users with optional role filtering."""
    query = {}
    if role:
        query = {"role": role}

    users = await User.find(query).sort(-User.created_at).to_list()
    return [
        UserProfileResponse(
            id=str(u.id),
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            company_name=u.company_name,
            avatar_url=u.avatar_url,
            bio=u.bio,
            phone=u.phone,
            headline=u.headline,
            github_url=u.github_url,
            linkedin_url=u.linkedin_url,
            created_at=u.created_at,
        )
        for u in users
    ]


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    req: UserStatusUpdateRequest,
    current_user: User = Depends(require_admin),
):
    """Enable, disable, or adjust permissions for user accounts."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = req.is_active
    if req.role:
        user.role = req.role
    await user.save()

    return {"message": "User status updated successfully", "user_id": str(user.id), "is_active": user.is_active, "role": user.role}
