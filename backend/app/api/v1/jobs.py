from datetime import datetime, timezone
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.api.deps import (
    get_current_user,
    get_current_user_optional,
    get_embedder,
    require_student,
)
from app.models.user import User
from app.models.job import Job
from app.models.company import Company
from app.models.resume import Resume
from app.models.ats_report import ATSReport
from app.models.application import Application, ApplicationStatus
from app.models.skill_gap import SkillGapReport
from app.models import get_link_id
from app.schemas.job import (
    ApplicationCreateRequest,
    JobResponse,
    StudentApplicationResponse,
)
from app.services.skill_gap_engine import analyze_skill_gap

router = APIRouter(prefix="/jobs", tags=["Job Opportunities"])


def _synthesize_job_description(job: Job, company_name: str) -> str:
    """Build comprehensive, multi-section job description text for ATS analysis."""
    sections = [
        f"Title: {job.title}",
        f"Company: {company_name}",
        f"Location: {job.location} ({job.job_type})",
        f"Experience Level: {job.experience_level}",
        f"\nOverview:\n{job.description.strip()}",
    ]
    if job.responsibilities:
        resp_bullets = "\n".join(f"- {r.strip()}" for r in job.responsibilities if r.strip())
        if resp_bullets:
            sections.append(f"\nKey Responsibilities:\n{resp_bullets}")

    if job.qualifications:
        qual_bullets = "\n".join(f"- {q.strip()}" for q in job.qualifications if q.strip())
        if qual_bullets:
            sections.append(f"\nQualifications & Experience:\n{qual_bullets}")

    if job.required_skills:
        sections.append(f"\nRequired Core Skills:\n{', '.join(job.required_skills)}")

    if job.preferred_skills:
        sections.append(f"\nPreferred & Bonus Skills:\n{', '.join(job.preferred_skills)}")

    return "\n\n".join(sections)


@router.get("", response_model=List[JobResponse])
async def list_jobs(
    query: Optional[str] = Query(None, description="Search role, company, or skills"),
    location: Optional[str] = Query(None, description="Filter by location"),
    experience_level: Optional[str] = Query(None, description="Filter by experience level"),
    job_type: Optional[str] = Query(None, description="Filter by employment type"),
    sort_by: Optional[str] = Query("newest", description="Sorting: newest, deadline, min_ats_score"),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    List all active job postings for discovery:
    - Excludes closed and expired postings.
    - Supports full-text search, multi-faceted filtering, and sorting.
    - Populates has_applied flag for authenticated candidates.
    """
    now = datetime.now(timezone.utc)
    jobs = await Job.find(Job.is_active == True).sort(-Job.created_at).to_list()

    # Pre-fetch applied job IDs if student is logged in
    applied_job_ids = set()
    if current_user and current_user.role.value == "student":
        user_apps = await Application.find(student_id=str(current_user.id)).to_list()
        applied_job_ids = {str(a.job_id) for a in user_apps}

    results = []
    for j in jobs:
        # Check active status & deadline expiration
        if getattr(j, "status", "active") == "closed":
            continue
        if j.deadline and j.deadline < now:
            continue

        cid = get_link_id(j.company_id)
        company = await Company.get(cid) if cid else None
        comp_name = j.company_name or (company.name if company else "Company")
        comp_logo = j.company_logo_url or (company.logo_url if company else None)

        # Keyword search filter across title, company, and required skills
        if query:
            q_lower = query.lower().strip()
            skills_str = " ".join(j.required_skills + j.preferred_skills).lower()
            text_haystack = f"{j.title} {comp_name} {j.location} {skills_str}".lower()
            if q_lower not in text_haystack:
                continue

        # Location filter
        if location and location.lower().strip() not in j.location.lower():
            continue

        # Experience level filter
        if experience_level and experience_level.lower().strip() != j.experience_level.lower():
            continue

        # Employment type filter
        if job_type and job_type.lower().strip() not in j.job_type.lower():
            continue

        app_count = await Application.find(job_id=str(j.id)).count()

        results.append(
            JobResponse(
                id=str(j.id),
                title=j.title,
                company_name=comp_name,
                company_id=cid or "",
                company_logo_url=comp_logo,
                location=j.location,
                job_type=j.job_type,
                experience_level=j.experience_level,
                salary_range=j.salary_range,
                description=j.description,
                responsibilities=getattr(j, "responsibilities", []),
                qualifications=getattr(j, "qualifications", []),
                required_skills=j.required_skills,
                preferred_skills=j.preferred_skills,
                min_ats_score=j.min_ats_score,
                enforce_threshold=getattr(j, "enforce_threshold", True),
                disclose_threshold=getattr(j, "disclose_threshold", True),
                deadline=getattr(j, "deadline", None),
                status=getattr(j, "status", "active"),
                is_active=j.is_active,
                applicant_count=app_count,
                has_applied=str(j.id) in applied_job_ids if current_user else None,
                created_at=j.created_at,
            )
        )

    # Sort results
    if sort_by == "deadline":
        results.sort(key=lambda x: (x.deadline is None, x.deadline or datetime.max.replace(tzinfo=timezone.utc)))
    elif sort_by == "min_ats_score":
        results.sort(key=lambda x: x.min_ats_score)
    elif sort_by == "min_ats_score_desc":
        results.sort(key=lambda x: x.min_ats_score, reverse=True)
    else:  # newest
        results.sort(key=lambda x: x.created_at, reverse=True)

    return results


@router.get("/applications/me", response_model=List[StudentApplicationResponse])
async def get_my_job_applications(
    current_user: User = Depends(require_student),
):
    """
    Dedicated Student Application Tracker:
    - Lists all submitted applications with dynamic timeline status:
      applied -> reviewing -> shortlisted -> rejected / offered.
    - Includes recruiter notes, verified ATS score, and linked Skill Gap intelligence.
    """
    uid = str(current_user.id)
    apps = await Application.find(student_id=uid).sort(-Application.applied_at).to_list()
    results = []

    for a in apps:
        jid = get_link_id(a.job_id)
        job = await Job.get(jid) if jid else None
        comp_name = "Company"
        comp_logo = None
        job_title = "Position"
        loc = "Remote"
        j_type = "Full-time"
        min_ats = 60.0

        if job:
            job_title = job.title
            loc = job.location
            j_type = job.job_type
            min_ats = job.min_ats_score
            cid = get_link_id(job.company_id)
            comp = await Company.get(cid) if cid else None
            comp_name = job.company_name or (comp.name if comp else "Company")
            comp_logo = job.company_logo_url or (comp.logo_url if comp else None)

        # Get enhanced ATS score if available on ATSReport
        enhanced_score = None
        if a.ats_report_id:
            rep = await ATSReport.get(a.ats_report_id)
            if rep:
                enhanced_score = rep.enhanced_ats_score

        results.append(
            StudentApplicationResponse(
                id=str(a.id),
                job_id=str(a.job_id),
                job_title=job_title,
                company_name=comp_name,
                company_logo_url=comp_logo,
                location=loc,
                job_type=j_type,
                ats_score=a.ats_score,
                enhanced_ats_score=enhanced_score,
                min_ats_score=min_ats,
                match_percentage=a.match_percentage,
                status=a.status,
                applied_at=a.applied_at,
                updated_at=getattr(a, "updated_at", a.applied_at),
                recruiter_notes=a.recruiter_notes,
                ats_report_id=str(a.ats_report_id) if a.ats_report_id else None,
                skill_gap_report_id=str(a.skill_gap_report_id) if a.skill_gap_report_id else None,
                resume_id=str(a.resume_id),
            )
        )

    return results


@router.get("/{job_id}", response_model=JobResponse)
async def get_job_by_id(
    job_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Retrieve complete posting description and eligibility requirements for a job listing."""
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job listing not found")

    cid = get_link_id(job.company_id)
    company = await Company.get(cid) if cid else None
    comp_name = job.company_name or (company.name if company else "Company")
    comp_logo = job.company_logo_url or (company.logo_url if company else None)
    app_count = await Application.find(job_id=str(job.id)).count()

    has_applied = False
    if current_user and current_user.role.value == "student":
        existing_app = await Application.find_one(
            Application.job_id == str(job.id),
            Application.student_id == str(current_user.id),
        )
        has_applied = existing_app is not None

    return JobResponse(
        id=str(job.id),
        title=job.title,
        company_name=comp_name,
        company_id=cid or "",
        company_logo_url=comp_logo,
        location=job.location,
        job_type=job.job_type,
        experience_level=job.experience_level,
        salary_range=job.salary_range,
        description=job.description,
        responsibilities=getattr(job, "responsibilities", []),
        qualifications=getattr(job, "qualifications", []),
        required_skills=job.required_skills,
        preferred_skills=job.preferred_skills,
        min_ats_score=job.min_ats_score,
        enforce_threshold=getattr(job, "enforce_threshold", True),
        disclose_threshold=getattr(job, "disclose_threshold", True),
        deadline=getattr(job, "deadline", None),
        status=getattr(job, "status", "active"),
        is_active=job.is_active,
        applicant_count=app_count,
        has_applied=has_applied if current_user else None,
        created_at=job.created_at,
    )


@router.post("/{job_id}/apply", status_code=status.HTTP_201_CREATED)
async def apply_for_job(
    job_id: str,
    req: ApplicationCreateRequest,
    current_user: User = Depends(require_student),
    embedder: Optional[Any] = Depends(get_embedder),
):
    """
    ATS-Powered Job Application Workflow:
    - Enforces that the job is open and not past deadline.
    - Prevents duplicate applications for the same job.
    - Recalculates/validates candidate ATS score server-side against recruiter threshold.
    - Rejects ineligible candidates with HTTP 400 when below threshold.
    - Persists Application linked with Resume, ATS Report, and tailored SkillGapReport.
    """
    job = await Job.get(job_id)
    if not job or not job.is_active or getattr(job, "status", "active") == "closed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job position is closed or no longer accepting applications.",
        )

    # Check deadline
    now = datetime.now(timezone.utc)
    if job.deadline and job.deadline < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The application deadline for this position has passed.",
        )

    uid = str(current_user.id)

    # Check duplicate application (Scenario E)
    existing_app = await Application.find_one(
        Application.job_id == str(job.id),
        Application.student_id == uid,
    )
    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied for this position.",
        )

    # Resolve company name
    cid = get_link_id(job.company_id)
    company = await Company.get(cid) if cid else None
    comp_name = job.company_name or (company.name if company else "Target Company")

    # Resolve resume (Scenario H: supports replaced/updated resume_id)
    if req.resume_id:
        resume = await Resume.get(req.resume_id)
        if not resume or str(resume.user_id) != uid:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specified resume not found or does not belong to your account.",
            )
    else:
        resume = await Resume.find(user_id=uid).sort(-Resume.created_at).first_or_none()

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a resume on the ATS portal before applying.",
        )

    # Resolve ATS report associated with this resume
    ats_report = None
    if req.ats_report_id:
        candidate_report = await ATSReport.get(req.ats_report_id)
        if candidate_report and str(candidate_report.user_id) == uid and str(candidate_report.resume_id) == str(resume.id):
            ats_report = candidate_report

    if not ats_report:
        ats_report = await ATSReport.find(resume_id=str(resume.id)).sort(-ATSReport.created_at).first_or_none()

    if not ats_report:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No ATS report found for your resume. Please run Career Readiness evaluation before applying.",
        )

    # Server-side ATS Score & Threshold Verification (Never trust frontend scores)
    ats_score = float(ats_report.overall_score)
    min_required = float(job.min_ats_score)

    if getattr(job, "enforce_threshold", True) and ats_score < min_required:
        score_diff = round(min_required - ats_score, 1)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Your verified ATS score ({ats_score:.1f}/100) is below the minimum threshold "
                f"({min_required:.1f}/100) required by {comp_name} (short by {score_diff} pts). "
                f"Please improve your resume using Career Readiness recommendations before applying."
            ),
        )

    # Build synthesized, multi-section Job Description for tailored skill gap analysis
    synthesized_jd = _synthesize_job_description(job, comp_name)

    # Compute application-specific skill gap analysis
    gap_result = analyze_skill_gap(
        resume_skills=resume.extracted_skills or resume.parsed_data.get("skills", []),
        resume_text=resume.raw_text,
        target_company=comp_name,
        target_role=job.title,
        job_description_text=synthesized_jd,
        embedder=embedder,
        ats_report=ats_report.to_db_dict(),
    )
    match_pct = float(gap_result.get("match_percentage", 0.0))

    # Persist Application-Specific SkillGapReport
    gap_report = SkillGapReport(
        user_id=uid,
        resume_id=str(resume.id),
        ats_report_id=str(ats_report.id),
        job_id=str(job.id),
        target_company=comp_name,
        target_role=job.title,
        job_description=synthesized_jd,
        match_percentage=match_pct,
        confidence_score=gap_result.get("confidence_score", 0.85),
        confidence_level=gap_result.get("confidence_level", "High"),
        fallback_used=gap_result.get("fallback_used", "L_JD"),
        resume_skills=gap_result.get("resume_skills", []),
        job_skills=gap_result.get("job_skills", []),
        matched_skills=gap_result.get("matched_skills", []),
        missing_skills=gap_result.get("missing_skills", []),
        skill_gaps=gap_result.get("skill_gaps", []),
        learning_roadmap=gap_result.get("learning_roadmap", ""),
        learning_resources=gap_result.get("learning_resources", {}),
        company_dsa_problems=gap_result.get("company_dsa_problems", []),
    )
    await gap_report.insert()

    # Link report IDs bidirectionally
    if not ats_report.job_id:
        ats_report.job_id = str(job.id)
        ats_report.skill_gap_report_id = str(gap_report.id)
        await ats_report.save()

    # Insert Application
    application = Application(
        job_id=str(job.id),
        student_id=uid,
        resume_id=str(resume.id),
        ats_report_id=str(ats_report.id),
        skill_gap_report_id=str(gap_report.id),
        ats_score=ats_score,
        match_percentage=match_pct,
        status=ApplicationStatus.APPLIED,
        cover_letter=req.cover_letter.strip() if req.cover_letter else None,
    )
    await application.insert()

    return {
        "message": "Application submitted successfully!",
        "application_id": str(application.id),
        "ats_score": ats_score,
        "enhanced_ats_score": ats_report.enhanced_ats_score,
        "min_ats_score": min_required,
        "match_percentage": match_pct,
        "status": ApplicationStatus.APPLIED.value,
        "skill_gap_report_id": str(gap_report.id),
    }
