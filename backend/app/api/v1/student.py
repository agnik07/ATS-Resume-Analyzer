from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from app.api.deps import require_student
from app.models.user import User
from app.models.resume import Resume
from app.models.ats_report import ATSReport
from app.models.skill_gap import SkillGapReport
from app.models.application import Application
from app.models.job import Job
from app.models.company import Company
from app.models import get_link_id

router = APIRouter(prefix="/student", tags=["Student Portal"])


@router.get("/dashboard")
async def get_student_dashboard(current_user: User = Depends(require_student)):
    """Aggregated dashboard summary for students."""
    uid = str(current_user.id)

    # Latest ATS report
    latest_ats = await ATSReport.find(user_id=uid).sort(-ATSReport.created_at).first_or_none()

    # Total resumes
    resume_count = await Resume.find(user_id=uid).count()

    # Recent skill gaps
    recent_gaps = await SkillGapReport.find(user_id=uid).sort(-SkillGapReport.created_at).limit(5).to_list()

    # Job applications
    apps = await Application.find(student_id=uid).sort(-Application.applied_at).to_list()

    return {
        "latest_ats_score": latest_ats.overall_score if latest_ats else None,
        "latest_ats_interpretation": latest_ats.interpretation if latest_ats else None,
        "total_resumes": resume_count,
        "total_applications": len(apps),
        "recent_skill_gaps": [
            {
                "id": str(g.id),
                "company": g.target_company,
                "role": g.target_role,
                "match_percentage": g.match_percentage,
                "created_at": g.created_at,
            }
            for g in recent_gaps
        ],
        "applications": [
            {
                "id": str(a.id),
                "job_id": get_link_id(a.job_id),
                "ats_score": a.ats_score,
                "match_percentage": a.match_percentage,
                "status": a.status,
                "applied_at": a.applied_at,
            }
            for a in apps[:5]
        ],
    }


@router.get("/applications")
async def get_my_applications(current_user: User = Depends(require_student)):
    """List all job applications submitted by current student."""
    uid = str(current_user.id)
    apps = await Application.find(student_id=uid).sort(-Application.applied_at).to_list()
    results = []

    for a in apps:
        jid = get_link_id(a.job_id)
        job = await Job.get(jid) if jid else None
        comp_name = "Company"
        if job:
            cid = get_link_id(job.company_id)
            comp = await Company.get(cid) if cid else None
            if comp:
                comp_name = comp.name

        results.append({
            "id": str(a.id),
            "job_id": str(job.id) if job else "",
            "job_title": job.title if job else "Position",
            "company_name": comp_name,
            "ats_score": a.ats_score,
            "match_percentage": a.match_percentage,
            "status": a.status,
            "applied_at": a.applied_at,
        })

    return results


@router.get("/resumes")
async def get_my_resumes(current_user: User = Depends(require_student)):
    """List all uploaded resumes for the current student."""
    uid = str(current_user.id)
    resumes = await Resume.find(user_id=uid).sort(-Resume.created_at).to_list()
    return [
        {
            "id": str(r.id),
            "filename": r.filename,
            "file_url": r.file_url,
            "file_type": r.file_type,
            "file_size_bytes": r.file_size_bytes,
            "skills_count": len(r.extracted_skills),
            "skills": r.extracted_skills,
            "created_at": r.created_at,
        }
        for r in resumes
    ]
