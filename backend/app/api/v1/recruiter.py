from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from app.api.deps import require_recruiter
from app.core.config import settings
from app.models.user import User
from app.models.company import Company
from app.models.job import Job
from app.models.application import Application, ApplicationStatus, ApplicationAuditLog
from app.models.resume import Resume
from app.models.ats_report import ATSReport
from app.models.github_evidence import GitHubEvidenceRecord
from app.models import get_link_id
from app.schemas.job import (
    ApplicationTrendItem,
    CandidateApplicationResponse,
    CandidateCompareItem,
    CandidateCompareRequest,
    CandidateCompareResponse,
    CandidateProjectItem,
    CompanyCreateRequest,
    CompanyResponse,
    JobAnalyticsItem,
    JobCreateRequest,
    JobUpdateRequest,
    JobResponse,
    RecruiterStatsResponse,
    ValidatedSkillItem,
)
from app.services.groq_service import (
    generate_candidate_intelligence_dossier,
    generate_candidate_interview_questions,
    summarize_candidate_profile,
)

router = APIRouter(prefix="/recruiter", tags=["Recruiter Portal"])


class CandidateStatusUpdateRequest(BaseModel):
    status: ApplicationStatus
    recruiter_notes: Optional[str] = None


async def build_candidate_response(
    a: Application,
    job: Job,
    student: Optional[User] = None,
    resume: Optional[Resume] = None,
    ats_rep: Optional[ATSReport] = None,
) -> CandidateApplicationResponse:
    """Construct complete CandidateApplicationResponse with 3-tier skill categorization and project evidence."""
    sid = get_link_id(a.student_id)
    if not student and sid:
        student = await User.get(sid)

    rid = get_link_id(a.resume_id)
    if not resume and rid:
        resume = await Resume.get(rid)

    if not ats_rep:
        if a.ats_report_id:
            ats_rep = await ATSReport.get(get_link_id(a.ats_report_id))
        elif rid:
            ats_rep = await ATSReport.find(resume_id=rid).sort(-ATSReport.created_at).first_or_none()

    gh_rec = None
    if resume and resume.id:
        gh_rec = await GitHubEvidenceRecord.find(resume_id=str(resume.id)).sort(-GitHubEvidenceRecord.created_at).first_or_none()

    contact_info = (resume.parsed_data.get("contact_info", {}) if resume and isinstance(resume.parsed_data, dict) else {}) or {}
    email = contact_info.get("email") or (student.email if student else "")
    phone = contact_info.get("phone") or getattr(student, "phone_number", None)
    github_url = contact_info.get("github") or getattr(student, "github_url", None)
    linkedin_url = contact_info.get("linkedin") or getattr(student, "linkedin_url", None)
    portfolio_url = contact_info.get("portfolio") or getattr(student, "portfolio_url", None)
    website_url = contact_info.get("website") or getattr(student, "website_url", None)

    ats_score = float(a.ats_score)
    min_ats = float(job.min_ats_score)
    is_eligible = ats_score >= min_ats
    score_diff = round(ats_score - min_ats, 1)

    enhanced_ats = (
        ats_rep.enhanced_ats_score
        if ats_rep and ats_rep.enhanced_ats_score is not None
        else ats_score
    )
    gh_evidence_score = (
        ats_rep.github_evidence_score
        if ats_rep and ats_rep.github_evidence_score is not None
        else (gh_rec.github_evidence_score if gh_rec else 0.0)
    )

    cand_skills = list(resume.extracted_skills or []) if resume else []
    if resume and isinstance(resume.parsed_data, dict):
        for sk in resume.parsed_data.get("skills", []):
            if sk not in cand_skills:
                cand_skills.append(sk)

    cand_skills_lower = {s.lower(): s for s in cand_skills}
    raw_resume_text = (resume.raw_text or "").lower() if resume else ""

    rep_validated = set()
    if ats_rep and isinstance(ats_rep.skill_validation_details, dict):
        for vs in ats_rep.skill_validation_details.get("validated_skills", []):
            rep_validated.add(vs.lower())
    if gh_rec:
        for sm in (gh_rec.skill_matches or []):
            if isinstance(sm, dict) and "skill" in sm:
                rep_validated.add(sm["skill"].lower())
        for pm in (gh_rec.project_matches or []):
            for lang in pm.get("languages", []):
                rep_validated.add(lang.lower())
            for sk in pm.get("detected_technologies", []):
                rep_validated.add(sk.lower())

    req_skills = job.required_skills or []
    validated_skills = []
    validated_skills_items = []
    unverified_skills = []
    missing_skills = []

    for req in req_skills:
        req_l = req.lower()
        has_skill = req_l in cand_skills_lower or req_l in raw_resume_text
        if has_skill:
            if req_l in rep_validated:
                validated_skills.append(req)
                ev_sources = []
                if gh_rec and any(req_l in str(sm).lower() for sm in (gh_rec.skill_matches or [])):
                    ev_sources.append("GitHub repository code evidence")
                if resume and any(req_l in str(p).lower() for p in resume.parsed_data.get("projects", [])):
                    ev_sources.append("Demonstrated in candidate project")
                if not ev_sources:
                    ev_sources.append("Validated via semantic project matching")
                validated_skills_items.append(ValidatedSkillItem(
                    skill=req,
                    evidence=ev_sources,
                    similarity=1.0,
                    source="github" if "GitHub" in ev_sources[0] else "project",
                ))
            else:
                unverified_skills.append(req)
        else:
            missing_skills.append(req)

    matching_skills = validated_skills + unverified_skills

    projects_data = []
    raw_projects = (resume.parsed_data.get("projects", []) if resume and isinstance(resume.parsed_data, dict) else []) or []
    gh_verified_repos = set()
    if gh_rec and gh_rec.project_matches:
        for pm in gh_rec.project_matches:
            if pm.get("repo_name"):
                gh_verified_repos.add(pm["repo_name"].lower())

    for rp in raw_projects:
        if not isinstance(rp, dict):
            continue
        p_title = rp.get("title", "Project")
        p_desc = rp.get("description", "")
        p_tech = rp.get("technologies", [])
        p_gh = rp.get("github_url")
        p_live = rp.get("live_url")

        v_status = "Resume Project"
        if (p_title.lower() in gh_verified_repos) or (p_gh and gh_rec and gh_rec.projects_verified_count > 0):
            v_status = "Verified on GitHub"
        elif p_gh:
            v_status = "Repository Linked"

        matched_sk = [s for s in req_skills if s.lower() in p_desc.lower() or any(s.lower() == t.lower() for t in p_tech)]
        rel_score = round((len(matched_sk) / max(len(req_skills), 1)) * 100, 1)

        projects_data.append(CandidateProjectItem(
            title=p_title,
            description=p_desc,
            technologies=p_tech,
            github_url=p_gh,
            live_url=p_live,
            verification_status=v_status,
            relevance_score=rel_score,
            matched_skills=matched_sk,
        ))

    projects_data.sort(key=lambda p: (p.verification_status == "Verified on GitHub", p.relevance_score), reverse=True)

    exp = (resume.parsed_data.get("experience", []) if resume and isinstance(resume.parsed_data, dict) else []) or []
    edu = (resume.parsed_data.get("education", []) if resume and isinstance(resume.parsed_data, dict) else []) or []
    certs = (resume.parsed_data.get("certifications", []) if resume and isinstance(resume.parsed_data, dict) else []) or []

    audit_records = await ApplicationAuditLog.find(application_id=str(a.id)).sort(-ApplicationAuditLog.created_at).to_list()
    audit_logs_list = [
        {
            "id": str(log.id),
            "recruiter_id": log.recruiter_id,
            "previous_status": log.previous_status,
            "new_status": log.new_status,
            "notes": log.notes,
            "created_at": log.created_at.isoformat(),
        }
        for log in audit_records
    ]

    return CandidateApplicationResponse(
        id=str(a.id),
        job_id=str(job.id),
        job_title=job.title,
        student_id=sid or "",
        student_name=student.full_name if student else "Candidate",
        student_email=email,
        resume_id=rid or "",
        ats_report_id=str(a.ats_report_id) if a.ats_report_id else (str(ats_rep.id) if ats_rep else None),
        skill_gap_report_id=str(a.skill_gap_report_id) if getattr(a, "skill_gap_report_id", None) else None,
        ats_score=ats_score,
        enhanced_ats_score=enhanced_ats,
        min_ats_score=min_ats,
        is_eligible=is_eligible,
        score_difference=score_diff,
        github_evidence_score=gh_evidence_score,
        formatting_score=ats_rep.formatting_score if ats_rep else 0.0,
        keywords_score=ats_rep.keywords_score if ats_rep else 0.0,
        content_score=ats_rep.content_score if ats_rep else 0.0,
        skill_validation_score=ats_rep.skill_validation_score if ats_rep else 0.0,
        ats_compatibility_score=ats_rep.ats_compatibility_score if ats_rep else 0.0,
        match_percentage=a.match_percentage,
        status=a.status,
        cover_letter=a.cover_letter,
        recruiter_notes=a.recruiter_notes,
        ai_candidate_summary=a.ai_candidate_summary,
        ai_interview_questions=a.ai_interview_questions,
        github_url=github_url,
        linkedin_url=linkedin_url,
        portfolio_url=portfolio_url,
        website_url=website_url,
        phone=phone,
        file_url=resume.file_url if resume else None,
        extracted_skills=cand_skills,
        matching_skills=matching_skills,
        validated_skills=validated_skills,
        validated_skills_items=validated_skills_items,
        unverified_skills=unverified_skills,
        missing_skills=missing_skills,
        projects=projects_data,
        experience=exp,
        education=edu,
        certifications=certs,
        raw_text=resume.raw_text if resume else "",
        filename=resume.filename if resume else None,
        file_type=resume.file_type if resume else "pdf",
        audit_logs=audit_logs_list,
        applied_at=a.applied_at,
    )


# --- Recruiter Dashboard Stats ---
@router.get("/stats", response_model=RecruiterStatsResponse)
@router.get("/dashboard", response_model=RecruiterStatsResponse)
async def get_recruiter_stats(current_user: User = Depends(require_recruiter)):
    """Aggregate comprehensive statistics for recruiter intelligence dashboard."""
    uid = str(current_user.id)
    jobs = await Job.find(recruiter_id=uid).sort(-Job.created_at).to_list()
    job_ids = [str(j.id) for j in jobs]

    if not job_ids:
        return RecruiterStatsResponse(
            total_jobs=0,
            active_jobs=0,
            total_applications=0,
            total_candidates=0,
            meeting_threshold_candidates=0,
            reviewing_candidates=0,
            shortlisted_candidates=0,
            rejected_candidates=0,
            offered_candidates=0,
            avg_ats_score=0.0,
            average_candidate_ats_score=0.0,
            job_analytics=[],
            application_trends=[],
        )

    active_count = sum(1 for j in jobs if j.is_active)
    applications = await Application.find(Application.job_id.in_(job_ids)).to_list()

    job_dict = {str(j.id): j for j in jobs}
    total_apps = len(applications)

    meeting_thresh_count = sum(
        1 for a in applications
        if a.ats_score >= job_dict.get(str(a.job_id), Job(title="", company_id="", recruiter_id="", location="", description="")).min_ats_score
    )
    reviewing_count = sum(1 for a in applications if a.status == ApplicationStatus.REVIEWING)
    shortlisted_count = sum(1 for a in applications if a.status == ApplicationStatus.SHORTLISTED)
    rejected_count = sum(1 for a in applications if a.status == ApplicationStatus.REJECTED)
    offered_count = sum(1 for a in applications if a.status == ApplicationStatus.OFFERED)

    avg_ats = (
        sum(a.ats_score for a in applications) / total_apps
        if total_apps > 0
        else 0.0
    )

    # Job-wise analytics
    job_analytics = []
    for j in jobs:
        jid = str(j.id)
        j_apps = [a for a in applications if str(a.job_id) == jid]
        j_thresh = sum(1 for a in j_apps if a.ats_score >= j.min_ats_score)
        j_shortlisted = sum(1 for a in j_apps if a.status == ApplicationStatus.SHORTLISTED)
        j_avg = sum(a.ats_score for a in j_apps) / len(j_apps) if j_apps else 0.0

        cid = get_link_id(j.company_id)
        company = await Company.get(cid) if cid else None
        comp_name = j.company_name or (company.name if company else "Company")

        job_analytics.append(JobAnalyticsItem(
            job_id=jid,
            title=j.title,
            company_name=comp_name,
            status=getattr(j, "status", "active"),
            is_active=j.is_active,
            min_ats_score=j.min_ats_score,
            total_applications=len(j_apps),
            meeting_threshold=j_thresh,
            shortlisted_count=j_shortlisted,
            avg_ats_score=round(j_avg, 1),
            created_at=j.created_at,
        ))

    # Application trends by date
    trends_map: Dict[str, Dict[str, int]] = {}
    for a in applications:
        d_str = a.applied_at.strftime("%Y-%m-%d")
        if d_str not in trends_map:
            trends_map[d_str] = {"applications": 0, "meeting_threshold": 0}
        trends_map[d_str]["applications"] += 1
        j = job_dict.get(str(a.job_id))
        if j and a.ats_score >= j.min_ats_score:
            trends_map[d_str]["meeting_threshold"] += 1

    application_trends = [
        ApplicationTrendItem(
            date=d,
            applications=val["applications"],
            meeting_threshold=val["meeting_threshold"],
        )
        for d, val in sorted(trends_map.items())
    ]

    return RecruiterStatsResponse(
        total_jobs=len(jobs),
        active_jobs=active_count,
        total_applications=total_apps,
        total_candidates=total_apps,
        meeting_threshold_candidates=meeting_thresh_count,
        reviewing_candidates=reviewing_count,
        shortlisted_candidates=shortlisted_count,
        rejected_candidates=rejected_count,
        offered_candidates=offered_count,
        avg_ats_score=round(avg_ats, 1),
        average_candidate_ats_score=round(avg_ats, 1),
        job_analytics=job_analytics,
        application_trends=application_trends,
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
    """Create a new job vacancy with recruiter-defined ATS eligibility threshold."""
    company = await Company.get(req.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if req.min_ats_score < 0.0 or req.min_ats_score > 100.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum ATS score threshold must be between 0 and 100.",
        )

    job = Job(
        title=req.title.strip(),
        company_id=str(company.id),
        recruiter_id=str(current_user.id),
        company_name=req.company_name or company.name,
        company_logo_url=req.company_logo_url or company.logo_url,
        location=req.location.strip(),
        job_type=req.job_type,
        experience_level=req.experience_level,
        salary_range=req.salary_range,
        description=req.description.strip(),
        responsibilities=req.responsibilities,
        qualifications=req.qualifications,
        required_skills=req.required_skills,
        preferred_skills=req.preferred_skills,
        min_ats_score=req.min_ats_score,
        enforce_threshold=req.enforce_threshold,
        disclose_threshold=req.disclose_threshold,
        deadline=req.deadline,
        status=req.status,
        is_active=req.status != "closed",
    )
    await job.insert()

    return JobResponse(
        id=str(job.id),
        title=job.title,
        company_name=job.company_name or company.name,
        company_id=str(company.id),
        company_logo_url=job.company_logo_url or company.logo_url,
        location=job.location,
        job_type=job.job_type,
        experience_level=job.experience_level,
        salary_range=job.salary_range,
        description=job.description,
        responsibilities=job.responsibilities,
        qualifications=job.qualifications,
        required_skills=job.required_skills,
        preferred_skills=job.preferred_skills,
        min_ats_score=job.min_ats_score,
        enforce_threshold=job.enforce_threshold,
        disclose_threshold=job.disclose_threshold,
        deadline=job.deadline,
        status=job.status,
        is_active=job.is_active,
        applicant_count=0,
        created_at=job.created_at,
    )


@router.patch("/jobs/{job_id}", response_model=JobResponse)
async def update_recruiter_job(
    job_id: str,
    req: JobUpdateRequest,
    current_user: User = Depends(require_recruiter),
):
    """Update job posting details, status, or modify the minimum ATS score threshold."""
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    recruiter_id = get_link_id(job.recruiter_id)
    if recruiter_id != str(current_user.id) and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this job")

    if req.min_ats_score is not None:
        if req.min_ats_score < 0.0 or req.min_ats_score > 100.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Minimum ATS score threshold must be between 0 and 100.",
            )
        job.min_ats_score = req.min_ats_score

    if req.title is not None:
        job.title = req.title.strip()
    if req.location is not None:
        job.location = req.location.strip()
    if req.job_type is not None:
        job.job_type = req.job_type
    if req.experience_level is not None:
        job.experience_level = req.experience_level
    if req.salary_range is not None:
        job.salary_range = req.salary_range
    if req.description is not None:
        job.description = req.description.strip()
    if req.responsibilities is not None:
        job.responsibilities = req.responsibilities
    if req.qualifications is not None:
        job.qualifications = req.qualifications
    if req.required_skills is not None:
        job.required_skills = req.required_skills
    if req.preferred_skills is not None:
        job.preferred_skills = req.preferred_skills
    if req.enforce_threshold is not None:
        job.enforce_threshold = req.enforce_threshold
    if req.disclose_threshold is not None:
        job.disclose_threshold = req.disclose_threshold
    if req.deadline is not None:
        job.deadline = req.deadline
    if req.status is not None:
        job.status = req.status
        job.is_active = req.status != "closed"
    if req.is_active is not None:
        job.is_active = req.is_active
        job.status = "active" if req.is_active else "closed"

    job.updated_at = datetime.now(timezone.utc)
    await job.save()

    cid = get_link_id(job.company_id)
    company = await Company.get(cid) if cid else None
    app_count = await Application.find(job_id=str(job.id)).count()

    return JobResponse(
        id=str(job.id),
        title=job.title,
        company_name=job.company_name or (company.name if company else "Company"),
        company_id=cid or "",
        company_logo_url=job.company_logo_url or (company.logo_url if company else None),
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
        deadline=job.deadline,
        status=job.status,
        is_active=job.is_active,
        applicant_count=app_count,
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
        comp_name = j.company_name or (company.name if company else "Company")
        comp_logo = j.company_logo_url or (company.logo_url if company else None)
        app_count = await Application.find(job_id=str(j.id)).count()

        results.append(JobResponse(
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
            created_at=j.created_at,
        ))

    return results


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_recruiter_job(job_id: str, current_user: User = Depends(require_recruiter)):
    """Retrieve details of a single recruiter job."""
    job = await Job.get(job_id)
    recruiter_id = get_link_id(job.recruiter_id) if job else ""
    if not job or (recruiter_id != str(current_user.id) and current_user.role.value != "admin"):
        raise HTTPException(status_code=404, detail="Job not found or access denied")

    cid = get_link_id(job.company_id)
    company = await Company.get(cid) if cid else None
    app_count = await Application.find(job_id=str(job.id)).count()

    return JobResponse(
        id=str(job.id),
        title=job.title,
        company_name=job.company_name or (company.name if company else "Company"),
        company_id=cid or "",
        company_logo_url=job.company_logo_url or (company.logo_url if company else None),
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
        deadline=job.deadline,
        status=job.status,
        is_active=job.is_active,
        applicant_count=app_count,
        created_at=job.created_at,
    )


# --- Candidate Management & Pipeline ---
@router.get("/jobs/{job_id}/candidates", response_model=List[CandidateApplicationResponse])
async def get_job_candidates(
    job_id: str,
    sort_by: str = Query("ats_score", pattern="^(ats_score|match_percentage|github_evidence|applied_at)$"),
    min_ats: Optional[float] = Query(None),
    status_filter: Optional[ApplicationStatus] = Query(None),
    eligibility: Optional[str] = Query(None, pattern="^(eligible|below_threshold|all)$"),
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_recruiter),
):
    """
    Search, filter, and rank applicants for a specific job.
    Supports deterministic sorting by ATS score, JD match %, GitHub evidence, and application date.
    Supports filtering by eligibility, threshold, and hiring pipeline status.
    """
    job = await Job.get(job_id)
    recruiter_id = get_link_id(job.recruiter_id) if job else ""
    if not job or (recruiter_id != str(current_user.id) and current_user.role.value != "admin"):
        raise HTTPException(status_code=404, detail="Job not found or access denied")

    builder = Application.find(job_id=str(job.id))
    if isinstance(status_filter, ApplicationStatus) or (isinstance(status_filter, str) and status_filter):
        builder.filter(Application.status == status_filter)
    if isinstance(min_ats, (int, float)):
        builder.filter(Application.ats_score >= min_ats)

    applications = await builder.to_list()

    # Build full candidate responses
    results: List[CandidateApplicationResponse] = []
    for a in applications:
        resp = await build_candidate_response(a, job)
        results.append(resp)

    # Apply eligibility filter if specified
    if isinstance(eligibility, str):
        if eligibility == "eligible":
            results = [r for r in results if r.is_eligible]
        elif eligibility == "below_threshold":
            results = [r for r in results if not r.is_eligible]

    # Apply search keyword filter if specified
    if isinstance(search, str) and search.strip():
        q = search.strip().lower()
        results = [
            r for r in results
            if q in r.student_name.lower()
            or q in r.student_email.lower()
            or any(q in s.lower() for s in r.extracted_skills)
        ]

    # Deterministic sorting
    if sort_by == "match_percentage":
        results.sort(key=lambda c: (c.match_percentage, c.ats_score), reverse=True)
    elif sort_by == "github_evidence":
        results.sort(key=lambda c: (c.github_evidence_score or 0.0, c.ats_score), reverse=True)
    elif sort_by == "applied_at":
        results.sort(key=lambda c: c.applied_at, reverse=True)
    else:  # default ats_score
        results.sort(key=lambda c: (c.ats_score, c.match_percentage), reverse=True)

    return results


@router.get("/applications/{application_id}", response_model=CandidateApplicationResponse)
async def get_recruiter_application_detail(
    application_id: str,
    current_user: User = Depends(require_recruiter),
):
    """Retrieve detailed candidate evaluation dossier for a specific applicant."""
    app_doc = await Application.get(application_id)
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    jid = get_link_id(app_doc.job_id)
    job = await Job.get(jid) if jid else None
    recruiter_id = get_link_id(job.recruiter_id) if job else ""
    if not job or (recruiter_id != str(current_user.id) and current_user.role.value != "admin"):
        raise HTTPException(status_code=403, detail="Access denied")

    return await build_candidate_response(app_doc, job)


@router.patch("/applications/{application_id}/status")
async def update_candidate_status(
    application_id: str,
    req: CandidateStatusUpdateRequest,
    current_user: User = Depends(require_recruiter),
):
    """Update applicant pipeline status (shortlist, reject, review, offer) and record audit log."""
    app_doc = await Application.get(application_id)
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    jid = get_link_id(app_doc.job_id)
    job = await Job.get(jid) if jid else None
    recruiter_id = get_link_id(job.recruiter_id) if job else ""
    if not job or (recruiter_id != str(current_user.id) and current_user.role.value != "admin"):
        raise HTTPException(status_code=403, detail="Access denied")

    previous_status = app_doc.status.value if hasattr(app_doc.status, "value") else str(app_doc.status)
    new_status = req.status.value if hasattr(req.status, "value") else str(req.status)

    app_doc.status = req.status
    if req.recruiter_notes is not None:
        app_doc.recruiter_notes = req.recruiter_notes
    app_doc.updated_at = datetime.now(timezone.utc)
    await app_doc.save()

    # Record audit log entry
    audit_entry = ApplicationAuditLog(
        application_id=str(app_doc.id),
        recruiter_id=str(current_user.id),
        job_id=str(job.id),
        previous_status=previous_status,
        new_status=new_status,
        notes=req.recruiter_notes or f"Status changed from {previous_status} to {new_status}",
    )
    await audit_entry.insert()

    return {
        "message": f"Candidate status successfully updated to {new_status}",
        "application_id": str(app_doc.id),
        "status": app_doc.status,
        "previous_status": previous_status,
        "audit_log_id": str(audit_entry.id),
    }


@router.get("/applications/{application_id}/audit-logs")
async def get_application_audit_logs(
    application_id: str,
    current_user: User = Depends(require_recruiter),
):
    """Retrieve full audit history for candidate application status modifications."""
    app_doc = await Application.get(application_id)
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    jid = get_link_id(app_doc.job_id)
    job = await Job.get(jid) if jid else None
    recruiter_id = get_link_id(job.recruiter_id) if job else ""
    if not job or (recruiter_id != str(current_user.id) and current_user.role.value != "admin"):
        raise HTTPException(status_code=403, detail="Access denied")

    logs = await ApplicationAuditLog.find(application_id=str(app_doc.id)).sort(-ApplicationAuditLog.created_at).to_list()
    return [
        {
            "id": str(l.id),
            "application_id": l.application_id,
            "recruiter_id": l.recruiter_id,
            "job_id": l.job_id,
            "previous_status": l.previous_status,
            "new_status": l.new_status,
            "notes": l.notes,
            "created_at": l.created_at,
        }
        for l in logs
    ]


@router.get("/applications/{application_id}/resume")
async def get_candidate_resume(
    application_id: str,
    download: bool = Query(False),
    current_user: User = Depends(require_recruiter),
):
    """
    Secure resume access endpoint:
    Verifies recruiter ownership of the job before returning resume content or streaming PDF.
    """
    app_doc = await Application.get(application_id)
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    jid = get_link_id(app_doc.job_id)
    job = await Job.get(jid) if jid else None
    recruiter_id = get_link_id(job.recruiter_id) if job else ""
    if not job or (recruiter_id != str(current_user.id) and current_user.role.value != "admin"):
        raise HTTPException(status_code=403, detail="Access denied to candidate resume")

    rid = get_link_id(app_doc.resume_id)
    resume = await Resume.get(rid) if rid else None
    if not resume:
        raise HTTPException(status_code=404, detail="Resume record not found")

    # If local file exists, stream it
    if resume.file_url:
        clean_name = Path(resume.file_url).name
        local_path = settings.LOCAL_UPLOAD_DIR / clean_name
        if local_path.is_file():
            disposition = "attachment" if download else "inline"
            return FileResponse(
                path=str(local_path),
                media_type="application/pdf",
                filename=resume.filename,
                headers={"Content-Disposition": f'{disposition}; filename="{resume.filename}"'},
            )

    return {
        "file_url": resume.file_url,
        "filename": resume.filename,
        "file_type": resume.file_type,
        "raw_text": resume.raw_text,
    }


# --- Groq AI Recruiter Assist ---
@router.post("/applications/{application_id}/ai-summary")
async def get_candidate_ai_summary(
    application_id: str,
    current_user: User = Depends(require_recruiter),
):
    """Generate structured Groq AI candidate intelligence dossier."""
    app_doc = await Application.get(application_id)
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    jid = get_link_id(app_doc.job_id)
    job = await Job.get(jid) if jid else None
    recruiter_id = get_link_id(job.recruiter_id) if job else ""
    if not job or (recruiter_id != str(current_user.id) and current_user.role.value != "admin"):
        raise HTTPException(status_code=403, detail="Access denied")

    cand_resp = await build_candidate_response(app_doc, job)
    resume = await Resume.get(get_link_id(app_doc.resume_id))

    dossier = generate_candidate_intelligence_dossier(
        candidate_name=cand_resp.student_name,
        target_role=job.title,
        job_description=job.description,
        resume_text=resume.raw_text if resume else "",
        skills=cand_resp.extracted_skills,
        validated_skills=cand_resp.validated_skills,
        missing_skills=cand_resp.missing_skills,
        verified_projects=[p.model_dump() for p in cand_resp.projects],
        github_evidence_score=cand_resp.github_evidence_score or 0.0,
        ats_score=cand_resp.ats_score,
        match_percentage=cand_resp.match_percentage,
    )

    app_doc.ai_candidate_summary = dossier.get("executive_summary")
    app_doc.ai_interview_questions = dossier.get("technical_interview_questions", [])
    await app_doc.save()

    return {
        "summary": dossier.get("executive_summary"),
        "executive_summary": dossier.get("executive_summary"),
        "match_rationale": dossier.get("match_rationale"),
        "strongest_capabilities": dossier.get("strongest_capabilities", []),
        "missing_requirements": dossier.get("missing_requirements", []),
        "potential_concerns": dossier.get("potential_concerns", []),
        "project_evidence_analysis": dossier.get("project_evidence_analysis"),
        "technical_interview_questions": dossier.get("technical_interview_questions", []),
    }


@router.post("/applications/{application_id}/ai-questions")
async def get_candidate_ai_questions(
    application_id: str,
    current_user: User = Depends(require_recruiter),
):
    """Generate tailored technical interview questions based on missing skills and candidate strengths."""
    app_doc = await Application.get(application_id)
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    jid = get_link_id(app_doc.job_id)
    job = await Job.get(jid) if jid else None
    recruiter_id = get_link_id(job.recruiter_id) if job else ""
    if not job or (recruiter_id != str(current_user.id) and current_user.role.value != "admin"):
        raise HTTPException(status_code=403, detail="Access denied")

    cand_resp = await build_candidate_response(app_doc, job)
    resume = await Resume.get(get_link_id(app_doc.resume_id))

    missing = cand_resp.missing_skills or job.required_skills
    questions = generate_candidate_interview_questions(
        candidate_name=cand_resp.student_name,
        target_role=job.title,
        missing_skills=missing,
        experience_summary=resume.raw_text[:2000] if resume else "",
    )

    app_doc.ai_interview_questions = questions
    await app_doc.save()

    return {"questions": questions}


# --- Candidate Comparison ---
@router.post("/jobs/{job_id}/compare", response_model=CandidateCompareResponse)
@router.post("/applications/compare", response_model=CandidateCompareResponse)
async def compare_job_candidates(
    req: CandidateCompareRequest,
    job_id: Optional[str] = None,
    current_user: User = Depends(require_recruiter),
):
    """
    Side-by-side comparison matrix for 2-5 candidate applicants.
    Compares ATS score, threshold delta, JD match, GitHub evidence, required skill coverage,
    project relevance, experience, and certifications without fabricated metrics.
    """
    if len(req.application_ids) < 2 or len(req.application_ids) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comparison requires selecting between 2 and 5 candidates.",
        )

    # Fetch first application to resolve job if not supplied
    first_app = await Application.get(req.application_ids[0])
    if not first_app:
        raise HTTPException(status_code=404, detail=f"Application {req.application_ids[0]} not found")

    resolved_job_id = job_id or get_link_id(first_app.job_id)
    job = await Job.get(resolved_job_id)
    recruiter_id = get_link_id(job.recruiter_id) if job else ""
    if not job or (recruiter_id != str(current_user.id) and current_user.role.value != "admin"):
        raise HTTPException(status_code=403, detail="Access denied to job applications")

    compare_items: List[CandidateCompareItem] = []
    for app_id in req.application_ids:
        app_doc = await Application.get(app_id)
        if not app_doc:
            raise HTTPException(status_code=404, detail=f"Application {app_id} not found")
        if get_link_id(app_doc.job_id) != str(job.id):
            raise HTTPException(
                status_code=400,
                detail=f"Application {app_id} does not belong to job {job.title}",
            )

        cand = await build_candidate_response(app_doc, job)
        total_req = max(len(job.required_skills), 1)
        cov_pct = round((len(cand.matching_skills) / total_req) * 100, 1)

        exp_str = "; ".join(
            [f"{e.get('job_title', 'Role')} at {e.get('company', 'Company')}" for e in cand.experience[:2] if isinstance(e, dict)]
        ) if cand.experience else "No experience listed"

        edu_str = (
            cand.education[0].get("degree", "Degree")
            if cand.education and isinstance(cand.education[0], dict)
            else "Not specified"
        )

        compare_items.append(CandidateCompareItem(
            application_id=cand.id,
            student_id=cand.student_id,
            student_name=cand.student_name,
            student_email=cand.student_email,
            job_id=str(job.id),
            job_title=job.title,
            ats_score=cand.ats_score,
            enhanced_ats_score=cand.enhanced_ats_score or cand.ats_score,
            min_ats_score=cand.min_ats_score,
            score_difference=cand.score_difference,
            is_eligible=cand.is_eligible,
            match_percentage=cand.match_percentage,
            github_evidence_score=cand.github_evidence_score or 0.0,
            status=cand.status,
            validated_skills_count=len(cand.validated_skills),
            validated_skills=cand.validated_skills,
            unverified_skills=cand.unverified_skills,
            missing_skills=cand.missing_skills,
            skill_coverage_percentage=cov_pct,
            projects_count=len(cand.projects),
            top_projects=cand.projects[:3],
            experience_summary=exp_str,
            education_summary=edu_str,
            certifications=cand.certifications or [],
            applied_at=cand.applied_at,
        ))

    return CandidateCompareResponse(
        job_id=str(job.id),
        job_title=job.title,
        min_ats_score=job.min_ats_score,
        candidates=compare_items,
    )
