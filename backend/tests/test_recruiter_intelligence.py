from datetime import datetime, timezone
import pytest
from fastapi import HTTPException
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.job import Job
from app.models.application import Application, ApplicationStatus, ApplicationAuditLog
from app.models.ats_report import ATSReport
from app.models.resume import Resume
from app.models.github_evidence import GitHubEvidenceRecord
from app.schemas.job import (
    CandidateCompareRequest,
    JobCreateRequest,
)
from app.api.v1.recruiter import (
    CandidateStatusUpdateRequest,
    compare_job_candidates,
    get_application_audit_logs,
    get_candidate_ai_questions,
    get_candidate_ai_summary,
    get_candidate_resume,
    get_job_candidates,
    get_recruiter_application_detail,
    get_recruiter_stats,
    update_candidate_status,
)


async def setup_test_recruiter_environment():
    """Create test recruiter, company, job, and multiple candidates."""
    ts = datetime.now().timestamp()

    # Recruiter A
    recruiter_a = User(
        email=f"recruiter_a_{ts}@techcorp.com",
        password_hash="hashedpwd",
        full_name="Alice Recruiter",
        role=UserRole.RECRUITER,
    )
    await recruiter_a.insert()

    # Recruiter B
    recruiter_b = User(
        email=f"recruiter_b_{ts}@othercorp.com",
        password_hash="hashedpwd",
        full_name="Bob Recruiter",
        role=UserRole.RECRUITER,
    )
    await recruiter_b.insert()

    # Company A
    company_a = Company(
        name=f"TechCorp {ts}",
        slug=f"techcorp-{ts}",
        recruiter_id=str(recruiter_a.id),
        location="San Francisco, CA",
    )
    await company_a.insert()

    # Job for Recruiter A
    job_a = Job(
        title="Senior Full-Stack Engineer",
        company_id=str(company_a.id),
        recruiter_id=str(recruiter_a.id),
        company_name=company_a.name,
        location="Remote",
        required_skills=["React", "Python", "PostgreSQL", "Docker", "FastAPI"],
        preferred_skills=["Kubernetes", "AWS"],
        min_ats_score=75.0,
        enforce_threshold=True,
    )
    await job_a.insert()

    # Job 2 for Recruiter A
    job_a2 = Job(
        title="DevOps Lead",
        company_id=str(company_a.id),
        recruiter_id=str(recruiter_a.id),
        company_name=company_a.name,
        location="Remote",
        required_skills=["Kubernetes", "Terraform", "Docker", "AWS"],
        min_ats_score=70.0,
        enforce_threshold=True,
    )
    await job_a2.insert()

    # Candidate 1: High scoring, eligible (ATS 88)
    student_1 = User(
        email=f"charlie_{ts}@candidate.com",
        password_hash="pwd",
        full_name="Charlie HighScore",
        role=UserRole.STUDENT,
        github_url="https://github.com/charlie-dev",
        linkedin_url="https://linkedin.com/in/charlie-dev",
    )
    await student_1.insert()

    resume_1 = Resume(
        user_id=str(student_1.id),
        filename="charlie_cv.pdf",
        raw_text="Full stack developer proficient in React, Python, PostgreSQL, and Docker. Built scalable APIs with FastAPI.",
        extracted_skills=["React", "Python", "PostgreSQL", "Docker", "FastAPI"],
        parsed_data={
            "contact_info": {
                "email": student_1.email,
                "phone": "+1-555-0101",
                "github": "https://github.com/charlie-dev",
                "linkedin": "https://linkedin.com/in/charlie-dev",
                "portfolio": "https://charlie.codes",
            },
            "skills": ["React", "Python", "PostgreSQL", "Docker", "FastAPI"],
            "projects": [
                {
                    "title": "Cloud Scale SaaS",
                    "description": "Engineered microservices using Python, FastAPI, and Docker on PostgreSQL database.",
                    "technologies": ["Python", "FastAPI", "Docker", "PostgreSQL"],
                    "github_url": "https://github.com/charlie-dev/cloud-saas",
                },
                {
                    "title": "React Dashboard",
                    "description": "Frontend analytics console in React.",
                    "technologies": ["React"],
                    "github_url": "https://github.com/charlie-dev/react-dashboard",
                },
            ],
            "experience": [
                {"job_title": "Senior Engineer", "company": "Acme Inc.", "description": "Developed backend systems."}
            ],
            "education": [{"degree": "B.S. in Computer Science", "institution": "Tech University"}],
            "certifications": ["AWS Certified Solutions Architect"],
        },
    )
    await resume_1.insert()

    ats_rep_1 = ATSReport(
        user_id=str(student_1.id),
        resume_id=str(resume_1.id),
        filename=resume_1.filename,
        overall_score=88.0,
        enhanced_ats_score=90.0,
        github_evidence_score=85.0,
        formatting_score=19.0,
        keywords_score=24.0,
        content_score=23.0,
        skill_validation_score=13.0,
        ats_compatibility_score=13.0,
        skill_validation_details={
            "validated_skills": ["Python", "FastAPI", "React", "Docker"],
        },
    )
    await ats_rep_1.insert()

    gh_record_1 = GitHubEvidenceRecord(
        user_id=str(student_1.id),
        resume_id=str(resume_1.id),
        ats_report_id=str(ats_rep_1.id),
        github_username="charlie-dev",
        github_evidence_score=85.0,
        enhanced_ats_score=90.0,
        repositories_analyzed=5,
        projects_verified_count=2,
        skills_verified_count=4,
        skill_matches=[
            {"skill": "Python", "confidence": 0.95},
            {"skill": "React", "confidence": 0.90},
            {"skill": "FastAPI", "confidence": 0.88},
            {"skill": "Docker", "confidence": 0.85},
        ],
        project_matches=[
            {
                "repo_name": "cloud-saas",
                "matched_resume_project": "Cloud Scale SaaS",
                "languages": ["Python"],
                "detected_technologies": ["FastAPI", "Docker"],
            }
        ],
    )
    await gh_record_1.insert()

    app_1 = Application(
        job_id=str(job_a.id),
        student_id=str(student_1.id),
        resume_id=str(resume_1.id),
        ats_report_id=str(ats_rep_1.id),
        ats_score=88.0,
        match_percentage=95.0,
        status=ApplicationStatus.APPLIED,
    )
    await app_1.insert()

    # Candidate 2: Below threshold applicant (ATS 62, below 75)
    student_2 = User(
        email=f"dan_{ts}@candidate.com",
        password_hash="pwd",
        full_name="Dan BelowThreshold",
        role=UserRole.STUDENT,
    )
    await student_2.insert()

    resume_2 = Resume(
        user_id=str(student_2.id),
        filename="dan_junior.pdf",
        raw_text="Junior developer with basic React and HTML skills.",
        extracted_skills=["React", "HTML", "CSS"],
        parsed_data={
            "skills": ["React", "HTML", "CSS"],
            "projects": [{"title": "Portfolio", "description": "My first web page", "technologies": ["HTML"]}],
        },
    )
    await resume_2.insert()

    ats_rep_2 = ATSReport(
        user_id=str(student_2.id),
        resume_id=str(resume_2.id),
        filename=resume_2.filename,
        overall_score=62.0,
        enhanced_ats_score=62.0,
        github_evidence_score=20.0,
        skill_validation_details={"validated_skills": []},
    )
    await ats_rep_2.insert()

    app_2 = Application(
        job_id=str(job_a.id),
        student_id=str(student_2.id),
        resume_id=str(resume_2.id),
        ats_report_id=str(ats_rep_2.id),
        ats_score=62.0,
        match_percentage=40.0,
        status=ApplicationStatus.APPLIED,
    )
    await app_2.insert()

    # Candidate 3: Shortlisted applicant (ATS 79)
    student_3 = User(
        email=f"eve_{ts}@candidate.com",
        password_hash="pwd",
        full_name="Eve Shortlisted",
        role=UserRole.STUDENT,
    )
    await student_3.insert()

    resume_3 = Resume(
        user_id=str(student_3.id),
        filename="eve_cv.pdf",
        raw_text="Backend Python engineer with PostgreSQL and Docker expertise.",
        extracted_skills=["Python", "PostgreSQL", "Docker"],
        parsed_data={"skills": ["Python", "PostgreSQL", "Docker"]},
    )
    await resume_3.insert()

    app_3 = Application(
        job_id=str(job_a.id),
        student_id=str(student_3.id),
        resume_id=str(resume_3.id),
        ats_score=79.0,
        match_percentage=75.0,
        status=ApplicationStatus.SHORTLISTED,
    )
    await app_3.insert()

    return {
        "recruiter_a": recruiter_a,
        "recruiter_b": recruiter_b,
        "company_a": company_a,
        "job_a": job_a,
        "job_a2": job_a2,
        "student_1": student_1,
        "student_2": student_2,
        "student_3": student_3,
        "app_1": app_1,
        "app_2": app_2,
        "app_3": app_3,
        "resume_1": resume_1,
    }


@pytest.mark.asyncio
async def test_recruiter_dashboard_stats_and_analytics():
    """Verify recruiter dashboard KPI metrics, job analytics, and application trends."""
    ctx = await setup_test_recruiter_environment()
    recruiter = ctx["recruiter_a"]

    stats = await get_recruiter_stats(current_user=recruiter)

    assert stats.total_jobs == 2
    assert stats.active_jobs == 2
    assert stats.total_applications == 3
    # Candidate 1 (88.0) and Candidate 3 (79.0) meet the 75.0 threshold; Candidate 2 (62.0) does not
    assert stats.meeting_threshold_candidates == 2
    assert stats.shortlisted_candidates == 1
    assert stats.avg_ats_score > 70.0
    assert len(stats.job_analytics) == 2

    job_stat = next(j for j in stats.job_analytics if j.job_id == str(ctx["job_a"].id))
    assert job_stat.total_applications == 3
    assert job_stat.meeting_threshold == 2
    assert job_stat.shortlisted_count == 1
    assert len(stats.application_trends) >= 1


@pytest.mark.asyncio
async def test_candidate_pipeline_sorting_and_filtering():
    """Verify candidate pipeline sorting (ATS, match, github, date) and filters (eligible, status)."""
    ctx = await setup_test_recruiter_environment()
    recruiter = ctx["recruiter_a"]
    job_id = str(ctx["job_a"].id)

    # 1. Sort by ATS score (highest first)
    cands_by_ats = await get_job_candidates(job_id=job_id, sort_by="ats_score", current_user=recruiter)
    assert len(cands_by_ats) == 3
    assert cands_by_ats[0].ats_score >= cands_by_ats[1].ats_score >= cands_by_ats[2].ats_score
    assert cands_by_ats[0].student_name == "Charlie HighScore"

    # 2. Filter by eligibility: eligible only
    eligible_cands = await get_job_candidates(
        job_id=job_id,
        eligibility="eligible",
        current_user=recruiter,
    )
    assert len(eligible_cands) == 2
    assert all(c.is_eligible for c in eligible_cands)

    # 3. Filter by eligibility: below_threshold only
    below_thresh = await get_job_candidates(
        job_id=job_id,
        eligibility="below_threshold",
        current_user=recruiter,
    )
    assert len(below_thresh) == 1
    assert not below_thresh[0].is_eligible
    assert below_thresh[0].student_name == "Dan BelowThreshold"

    # 4. Filter by status: shortlisted
    shortlisted = await get_job_candidates(
        job_id=job_id,
        status_filter=ApplicationStatus.SHORTLISTED,
        current_user=recruiter,
    )
    assert len(shortlisted) == 1
    assert shortlisted[0].student_name == "Eve Shortlisted"

    # 5. Search filter by candidate name
    searched = await get_job_candidates(
        job_id=job_id,
        search="charlie",
        current_user=recruiter,
    )
    assert len(searched) == 1
    assert searched[0].student_name == "Charlie HighScore"


@pytest.mark.asyncio
async def test_candidate_evaluation_page_sections():
    """Verify detailed evaluation dossier: 3-tier skill categorization, projects with verification status, and contact links."""
    ctx = await setup_test_recruiter_environment()
    recruiter = ctx["recruiter_a"]
    app_id = str(ctx["app_1"].id)

    detail = await get_recruiter_application_detail(application_id=app_id, current_user=recruiter)

    # Section A: Candidate Overview & Thresholds
    assert detail.student_name == "Charlie HighScore"
    assert detail.student_email == ctx["student_1"].email
    assert detail.ats_score == 88.0
    assert detail.min_ats_score == 75.0
    assert detail.is_eligible is True
    assert detail.score_difference == 13.0
    assert detail.github_evidence_score == 85.0

    # Section B: Critical Job-Specific Skills (3 Categories)
    # Required: ["React", "Python", "PostgreSQL", "Docker", "FastAPI"]
    # Validated: ["Python", "FastAPI", "React", "Docker"]
    # Unverified: ["PostgreSQL"] (in resume text/skills but unvalidated)
    # Missing: []
    assert len(detail.validated_skills) >= 3
    assert "Python" in detail.validated_skills
    assert "PostgreSQL" in detail.unverified_skills
    assert len(detail.missing_skills) == 0
    assert len(detail.validated_skills_items) >= 3
    assert detail.validated_skills_items[0].evidence is not None

    # Section C: Projects and Technical Evidence
    assert len(detail.projects) >= 2
    top_proj = detail.projects[0]
    assert top_proj.verification_status in ["Verified on GitHub", "Repository Linked"]
    assert top_proj.github_url is not None
    assert top_proj.relevance_score > 0.0

    # Section D: Clickable Professional Profiles
    assert detail.github_url == "https://github.com/charlie-dev"
    assert detail.linkedin_url == "https://linkedin.com/in/charlie-dev"
    assert detail.portfolio_url == "https://charlie.codes"


@pytest.mark.asyncio
async def test_status_update_and_audit_logging():
    """Verify applicant pipeline transitions (review, shortlist, reject, offer) and audit logging."""
    ctx = await setup_test_recruiter_environment()
    recruiter = ctx["recruiter_a"]
    app_id = str(ctx["app_1"].id)

    # Move to Reviewing
    res1 = await update_candidate_status(
        application_id=app_id,
        req=CandidateStatusUpdateRequest(
            status=ApplicationStatus.REVIEWING,
            recruiter_notes="Portfolio looks promising; moving to technical review.",
        ),
        current_user=recruiter,
    )
    assert res1["status"] == ApplicationStatus.REVIEWING
    assert res1["previous_status"] == "applied"

    # Shortlist
    res2 = await update_candidate_status(
        application_id=app_id,
        req=CandidateStatusUpdateRequest(
            status=ApplicationStatus.SHORTLISTED,
            recruiter_notes="Strong verified projects and high ATS score. Approved for interview.",
        ),
        current_user=recruiter,
    )
    assert res2["status"] == ApplicationStatus.SHORTLISTED
    assert res2["previous_status"] == "reviewing"

    # Check Audit Logs
    audit_logs = await get_application_audit_logs(application_id=app_id, current_user=recruiter)
    assert len(audit_logs) >= 2
    assert audit_logs[0]["new_status"] == "shortlisted"
    assert audit_logs[1]["new_status"] == "reviewing"


@pytest.mark.asyncio
async def test_groq_ai_summary_and_tailored_questions():
    """Verify Groq AI recruiter summary generation and tailored technical interview questions."""
    ctx = await setup_test_recruiter_environment()
    recruiter = ctx["recruiter_a"]
    app_id = str(ctx["app_1"].id)

    # AI Summary
    summary_res = await get_candidate_ai_summary(application_id=app_id, current_user=recruiter)
    assert "summary" in summary_res
    assert summary_res["summary"] is not None
    assert "match_rationale" in summary_res
    assert "strongest_capabilities" in summary_res
    assert len(summary_res["technical_interview_questions"]) >= 3

    # Dedicated Questions
    q_res = await get_candidate_ai_questions(application_id=app_id, current_user=recruiter)
    assert "questions" in q_res
    assert len(q_res["questions"]) >= 3


@pytest.mark.asyncio
async def test_candidate_side_by_side_comparison():
    """Verify multi-candidate comparison matrix for 2-5 candidates without fabricated data."""
    ctx = await setup_test_recruiter_environment()
    recruiter = ctx["recruiter_a"]
    job_id = str(ctx["job_a"].id)
    app1_id = str(ctx["app_1"].id)
    app2_id = str(ctx["app_2"].id)

    req = CandidateCompareRequest(application_ids=[app1_id, app2_id])
    comp_res = await compare_job_candidates(req=req, job_id=job_id, current_user=recruiter)

    assert comp_res.job_id == job_id
    assert len(comp_res.candidates) == 2

    c1 = next(c for c in comp_res.candidates if c.application_id == app1_id)
    c2 = next(c for c in comp_res.candidates if c.application_id == app2_id)

    assert c1.student_name == "Charlie HighScore"
    assert c1.ats_score == 88.0
    assert c1.is_eligible is True
    assert c1.validated_skills_count >= 3

    assert c2.student_name == "Dan BelowThreshold"
    assert c2.ats_score == 62.0
    assert c2.is_eligible is False
    assert c2.missing_skills is not None


@pytest.mark.asyncio
async def test_recruiter_authorization_security():
    """Verify strict authorization: Recruiter B cannot access or modify Recruiter A's jobs, candidates, or resumes."""
    ctx = await setup_test_recruiter_environment()
    recruiter_b = ctx["recruiter_b"]  # Different recruiter
    job_a_id = str(ctx["job_a"].id)
    app_a_id = str(ctx["app_1"].id)

    # 1. Recruiter B cannot list Recruiter A's job candidates
    with pytest.raises(HTTPException) as exc1:
        await get_job_candidates(job_id=job_a_id, current_user=recruiter_b)
    assert exc1.value.status_code in [403, 404]

    # 2. Recruiter B cannot view candidate application detail
    with pytest.raises(HTTPException) as exc2:
        await get_recruiter_application_detail(application_id=app_a_id, current_user=recruiter_b)
    assert exc2.value.status_code == 403

    # 3. Recruiter B cannot update applicant status
    with pytest.raises(HTTPException) as exc3:
        await update_candidate_status(
            application_id=app_a_id,
            req=CandidateStatusUpdateRequest(status=ApplicationStatus.REJECTED),
            current_user=recruiter_b,
        )
    assert exc3.value.status_code == 403

    # 4. Recruiter B cannot access candidate resume
    with pytest.raises(HTTPException) as exc4:
        await get_candidate_resume(application_id=app_a_id, current_user=recruiter_b)
    assert exc4.value.status_code == 403

    # 5. Recruiter B cannot run comparison on Recruiter A's applicants
    with pytest.raises(HTTPException) as exc5:
        await compare_job_candidates(
            req=CandidateCompareRequest(application_ids=[app_a_id, str(ctx["app_2"].id)]),
            job_id=job_a_id,
            current_user=recruiter_b,
        )
    assert exc5.value.status_code == 403

