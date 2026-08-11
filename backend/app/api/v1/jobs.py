from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sentence_transformers import SentenceTransformer
from app.api.deps import get_current_user, get_embedder, require_student
from app.models.user import User
from app.models.job import Job
from app.models.company import Company
from app.models.resume import Resume
from app.models.ats_report import ATSReport
from app.models.application import Application, ApplicationStatus
from app.models import get_link_id
from app.schemas.job import ApplicationCreateRequest, JobResponse
from app.services.skill_gap_engine import analyze_skill_gap

router = APIRouter(prefix="/jobs", tags=["Job Opportunities"])


@router.get("", response_model=List[JobResponse])
async def list_jobs(
    query: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    experience_level: Optional[str] = Query(None),
):
    """List all open job vacancies with optional search and filters."""
    jobs = await Job.find(Job.is_active == True).sort(-Job.created_at).to_list()

    results = []
    for j in jobs:
        cid = get_link_id(j.company_id)
        company = await Company.get(cid) if cid else None
        comp_name = company.name if company else "Company"

        # Apply search filter
        if query:
            q_lower = query.lower()
            if q_lower not in j.title.lower() and q_lower not in comp_name.lower() and not any(q_lower in s.lower() for s in j.required_skills):
                continue

        if location and location.lower() not in j.location.lower():
            continue

        if experience_level and experience_level.lower() != j.experience_level.lower():
            continue

        app_count = await Application.find(job_id=str(j.id)).count()

        results.append(JobResponse(
            id=str(j.id),
            title=j.title,
            company_name=comp_name,
            company_id=cid,
            location=j.location,
            job_type=j.job_type,
            experience_level=j.experience_level,
            salary_range=j.salary_range,
            description=j.description,
            required_skills=j.required_skills,
            preferred_skills=j.preferred_skills,
            min_ats_score=j.min_ats_score,
            is_active=j.is_active,
            applicant_count=app_count,
            created_at=j.created_at,
        ))

    return results


@router.get("/{job_id}", response_model=JobResponse)
async def get_job_by_id(job_id: str):
    """Retrieve detailed description for a job listing."""
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job listing not found")

    cid = get_link_id(job.company_id)
    company = await Company.get(cid) if cid else None
    comp_name = company.name if company else "Company"
    app_count = await Application.find(job_id=str(job.id)).count()

    return JobResponse(
        id=str(job.id),
        title=job.title,
        company_name=comp_name,
        company_id=cid,
        location=job.location,
        job_type=job.job_type,
        experience_level=job.experience_level,
        salary_range=job.salary_range,
        description=job.description,
        required_skills=job.required_skills,
        preferred_skills=job.preferred_skills,
        min_ats_score=job.min_ats_score,
        is_active=job.is_active,
        applicant_count=app_count,
        created_at=job.created_at,
    )


@router.post("/{job_id}/apply", status_code=status.HTTP_201_CREATED)
async def apply_for_job(
    job_id: str,
    req: ApplicationCreateRequest,
    current_user: User = Depends(require_student),
    embedder: Optional[SentenceTransformer] = Depends(get_embedder),
):
    """
    Student job application endpoint:
    - Finds or uses candidate's latest resume and ATS report.
    - Computes deterministic skill match percentage against job requirements.
    - Submits candidate application to recruiter pipeline.
    """
    job = await Job.get(job_id)
    if not job or not job.is_active:
        raise HTTPException(status_code=404, detail="Active job listing not found")

    uid = str(current_user.id)

    # Check if student already applied
    existing_app = await Application.find_one(
        Application.job_id == str(job.id),
        Application.student_id == uid,
    )
    if existing_app:
        raise HTTPException(status_code=400, detail="You have already applied for this position.")

    # Get resume
    if req.resume_id:
        resume = await Resume.get(req.resume_id)
    else:
        resume = await Resume.find(user_id=uid).sort(-Resume.created_at).first_or_none()

    if not resume:
        raise HTTPException(status_code=400, detail="Please upload a resume on the ATS portal before applying.")

    # Get ATS report
    ats_report = await ATSReport.find(resume_id=str(resume.id)).sort(-ATSReport.created_at).first_or_none()
    ats_score = ats_report.overall_score if ats_report else 65.0

    # Compute match percentage against this specific job description
    gap_result = analyze_skill_gap(
        resume_skills=resume.extracted_skills or resume.parsed_data.get("skills", []),
        resume_text=resume.raw_text,
        target_company=job.title,
        target_role=job.title,
        job_description_text=job.description,
        embedder=embedder,
    )
    match_pct = gap_result["match_percentage"]

    # Create application
    application = Application(
        job_id=str(job.id),
        student_id=uid,
        resume_id=str(resume.id),
        ats_report_id=str(ats_report.id) if ats_report else None,
        ats_score=ats_score,
        match_percentage=match_pct,
        status=ApplicationStatus.APPLIED,
        cover_letter=req.cover_letter,
    )
    await application.insert()

    return {
        "message": "Application submitted successfully!",
        "application_id": str(application.id),
        "ats_score": ats_score,
        "match_percentage": match_pct,
    }
