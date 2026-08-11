from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from app.api.deps import require_recruiter
from app.models.user import User
from app.models.company import Company
from app.models.job import Job
from app.models.application import Application, ApplicationStatus
from app.models.resume import Resume
from app.models import get_link_id
from app.schemas.job import (
    CandidateApplicationResponse,
    CompanyCreateRequest,
    CompanyResponse,
    JobCreateRequest,
    JobResponse,
)
from app.services.groq_service import (
    generate_candidate_interview_questions,
    summarize_candidate_profile,
)

router = APIRouter(prefix="/recruiter", tags=["Recruiter Portal"])


class CandidateStatusUpdateRequest(BaseModel):
    status: ApplicationStatus
    recruiter_notes: Optional[str] = None


class RecruiterStatsResponse(BaseModel):
    total_jobs: int
    active_jobs: int
    total_candidates: int
    shortlisted_candidates: int
    avg_ats_score: float


# --- Recruiter Dashboard Stats ---
@router.get("/stats", response_model=RecruiterStatsResponse)
async def get_recruiter_stats(current_user: User = Depends(require_recruiter)):
    """Aggregate statistics for recruiter dashboard."""
    uid = str(current_user.id)
    jobs = await Job.find(recruiter_id=uid).to_list()
    job_ids = [str(j.id) for j in jobs]

    if not job_ids:
        return RecruiterStatsResponse(
            total_jobs=0,
            active_jobs=0,
            total_candidates=0,
            shortlisted_candidates=0,
            avg_ats_score=0.0,
        )

    active_count = sum(1 for j in jobs if j.is_active)
    applications = await Application.find(Application.job_id.in_(job_ids)).to_list()

    total_cands = len(applications)
    shortlisted_cands = sum(1 for a in applications if a.status == ApplicationStatus.SHORTLISTED)
    avg_ats = (
        sum(a.ats_score for a in applications) / total_cands
        if total_cands > 0
        else 0.0
    )

    return RecruiterStatsResponse(
        total_jobs=len(jobs),
        active_jobs=active_count,
        total_candidates=total_cands,
        shortlisted_candidates=shortlisted_cands,
        avg_ats_score=round(avg_ats, 1),
    )


# --- Company Management ---
@router.post("/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(req: CompanyCreateRequest, current_user: User = Depends(require_recruiter)):
    """Create or register a company profile."""
    slug = req.name.lower().replace(" ", "-")
    existing = await Company.find_one(Company.slug == slug)
    if existing:
        return CompanyResponse(
            id=str(existing.id),
            name=existing.name,
            slug=existing.slug,
            logo_url=existing.logo_url,
            website=existing.website,
            location=existing.location,
            description=existing.description,
            industry=existing.industry,
        )

    company = Company(
        name=req.name.strip(),
        slug=slug,
        recruiter_id=str(current_user.id),
        logo_url=req.logo_url,
        website=req.website,
        location=req.location,
        description=req.description,
        industry=req.industry,
    )
    await company.insert()

    return CompanyResponse(
        id=str(company.id),
        name=company.name,
        slug=company.slug,
        logo_url=company.logo_url,
        website=company.website,
        location=company.location,
        description=company.description,
        industry=company.industry,
    )


@router.get("/companies", response_model=List[CompanyResponse])
async def list_recruiter_companies(current_user: User = Depends(require_recruiter)):
    """List companies managed by current recruiter."""
    uid = str(current_user.id)
    companies = await Company.find(recruiter_id=uid).to_list()
    return [
        CompanyResponse(
            id=str(c.id),
            name=c.name,
            slug=c.slug,
            logo_url=c.logo_url,
            website=c.website,
            location=c.location,
            description=c.description,
            industry=c.industry,
        )
        for c in companies
    ]


# --- Job Management ---
@router.post("/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(req: JobCreateRequest, current_user: User = Depends(require_recruiter)):
    """Create a new job vacancy."""
    company = await Company.get(req.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    job = Job(
        title=req.title.strip(),
        company_id=str(company.id),
        recruiter_id=str(current_user.id),
        location=req.location.strip(),
        job_type=req.job_type,
        experience_level=req.experience_level,
        salary_range=req.salary_range,
        description=req.description.strip(),
        required_skills=req.required_skills,
        preferred_skills=req.preferred_skills,
        min_ats_score=req.min_ats_score,
    )
    await job.insert()

    return JobResponse(
        id=str(job.id),
        title=job.title,
        company_name=company.name,
        company_id=str(company.id),
        location=job.location,
        job_type=job.job_type,
        experience_level=job.experience_level,
        salary_range=job.salary_range,
        description=job.description,
        required_skills=job.required_skills,
        preferred_skills=job.preferred_skills,
        min_ats_score=job.min_ats_score,
        is_active=job.is_active,
        applicant_count=0,
        created_at=job.created_at,
    )


@router.get("/jobs", response_model=List[JobResponse])
async def list_recruiter_jobs(current_user: User = Depends(require_recruiter)):
    """List all jobs posted by current recruiter."""
    uid = str(current_user.id)
    jobs = await Job.find(recruiter_id=uid).sort(-Job.created_at).to_list()
    results = []

    for j in jobs:
        cid = get_link_id(j.company_id)
        company = await Company.get(cid) if cid else None
        comp_name = company.name if company else "Company"
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


# --- Candidate Management & Ranking ---
@router.get("/jobs/{job_id}/candidates", response_model=List[CandidateApplicationResponse])
async def get_job_candidates(
    job_id: str,
    sort_by: str = Query("ats_score", pattern="^(ats_score|match_percentage|applied_at)$"),
    min_ats: Optional[float] = Query(None),
    status_filter: Optional[ApplicationStatus] = Query(None),
    current_user: User = Depends(require_recruiter),
):
    """
    Search, filter, and rank applicants for a specific job.
    Sorted deterministically by ATS score or skill match percentage.
    """
    job = await Job.get(job_id)
    recruiter_id = get_link_id(job.recruiter_id) if job else ""
    if not job or recruiter_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Job not found or access denied")

    builder = Application.find(job_id=str(job.id))
    if status_filter:
        builder.filter(Application.status == status_filter)
    if min_ats is not None:
        builder.filter(Application.ats_score >= min_ats)

    applications = await builder.to_list()

    # Deterministic sorting
    if sort_by == "match_percentage":
        applications.sort(key=lambda a: a.match_percentage, reverse=True)
    elif sort_by == "applied_at":
        applications.sort(key=lambda a: a.applied_at, reverse=True)
    else:
        applications.sort(key=lambda a: a.ats_score, reverse=True)

    results = []
    for a in applications:
        sid = get_link_id(a.student_id)
        student = await User.get(sid) if sid else None
        rid = get_link_id(a.resume_id)
        results.append(CandidateApplicationResponse(
            id=str(a.id),
            job_id=str(job.id),
            job_title=job.title,
            student_id=sid,
            student_name=student.full_name if student else "Candidate",
            student_email=student.email if student else "",
            resume_id=rid,
            ats_score=a.ats_score,
            match_percentage=a.match_percentage,
            status=a.status,
            cover_letter=a.cover_letter,
            recruiter_notes=a.recruiter_notes,
            ai_candidate_summary=a.ai_candidate_summary,
            ai_interview_questions=a.ai_interview_questions,
            applied_at=a.applied_at,
        ))

    return results


@router.patch("/applications/{application_id}/status")
async def update_candidate_status(
    application_id: str,
    req: CandidateStatusUpdateRequest,
    current_user: User = Depends(require_recruiter),
):
    """Update applicant pipeline status (shortlist, reject, hire) and internal notes."""
    app_doc = await Application.get(application_id)
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    jid = get_link_id(app_doc.job_id)
    job = await Job.get(jid) if jid else None
    recruiter_id = get_link_id(job.recruiter_id) if job else ""
    if not job or recruiter_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    app_doc.status = req.status
    if req.recruiter_notes is not None:
        app_doc.recruiter_notes = req.recruiter_notes
    app_doc.updated_at = datetime.now(timezone.utc)
    await app_doc.save()

    return {
        "message": "Candidate status updated successfully",
        "application_id": str(app_doc.id),
        "status": app_doc.status,
    }


# --- Groq AI Recruiter Assist ---
@router.post("/applications/{application_id}/ai-summary")
async def get_candidate_ai_summary(
    application_id: str,
    current_user: User = Depends(require_recruiter),
):
    """Generate concise Groq AI recruiter summary for candidate."""
    app_doc = await Application.get(application_id)
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    jid = get_link_id(app_doc.job_id)
    job = await Job.get(jid) if jid else None
    recruiter_id = get_link_id(job.recruiter_id) if job else ""
    if not job or recruiter_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    sid = get_link_id(app_doc.student_id)
    student = await User.get(sid) if sid else None
    rid = get_link_id(app_doc.resume_id)
    resume = await Resume.get(rid) if rid else None

    if not resume:
        raise HTTPException(status_code=404, detail="Candidate resume not found")

    summary = summarize_candidate_profile(
        candidate_name=student.full_name if student else "Candidate",
        resume_text=resume.raw_text,
        skills=resume.extracted_skills or resume.parsed_data.get("skills", []),
        target_role=job.title,
    )

    app_doc.ai_candidate_summary = summary
    await app_doc.save()

    return {"summary": summary}


@router.post("/applications/{application_id}/ai-questions")
async def get_candidate_ai_questions(
    application_id: str,
    current_user: User = Depends(require_recruiter),
):
    """Generate role-specific interview questions via Groq LLM."""
    app_doc = await Application.get(application_id)
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    jid = get_link_id(app_doc.job_id)
    job = await Job.get(jid) if jid else None
    recruiter_id = get_link_id(job.recruiter_id) if job else ""
    if not job or recruiter_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    rid = get_link_id(app_doc.resume_id)
    resume = await Resume.get(rid) if rid else None

    if not resume:
        raise HTTPException(status_code=404, detail="Candidate resume not found")

    questions = generate_candidate_interview_questions(
        candidate_name=current_user.full_name,
        target_role=job.title,
        missing_skills=job.required_skills,
        experience_summary=resume.raw_text[:2000],
    )

    app_doc.ai_interview_questions = questions
    await app_doc.save()

    return {"questions": questions}
