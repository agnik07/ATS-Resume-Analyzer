from datetime import datetime, timezone
import pytest
from fastapi import HTTPException
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.job import Job
from app.models.application import Application, ApplicationStatus
from app.models.ats_report import ATSReport
from app.models.resume import Resume
from app.models.progress import UserRoadmapProgress, UserDSAProgress
from app.schemas.job import ApplicationCreateRequest
from app.schemas.skill_gap import SkillGapAnalysisRequest
from app.api.v1.jobs import apply_for_job
from app.api.v1.skill_gap import (
    perform_skill_gap_analysis,
    get_roadmap_progress,
    update_roadmap_progress,
    RoadmapProgressUpdateRequest,
)
from app.api.v1.recruiter import (
    get_job_candidates,
    get_recruiter_application_detail,
    update_candidate_status,
    CandidateStatusUpdateRequest,
)
from app.api.v1.career import (
    get_target_aware_dsa,
    get_dsa_progress,
    update_dsa_progress,
    DSAProgressUpdateRequest,
    get_tech_news,
)
from app.api.v1.student import get_student_dashboard
from app.services.news_service import get_job_news


async def setup_e2e_actors():
    """Setup clean entities for end-to-end integration tests."""
    ts = datetime.now(timezone.utc).timestamp()
    recruiter = User(
        email=f"e2e_recruiter_{ts}@example.com",
        password_hash="hashed_pw",
        full_name="Jane Recruiter",
        role=UserRole.RECRUITER,
    )
    await recruiter.insert()

    company = Company(
        name=f"Apex Technologies {ts}",
        slug=f"apex-tech-{ts}",
        recruiter_id=str(recruiter.id),
        location="Seattle, WA",
    )
    await company.insert()

    student = User(
        email=f"e2e_student_{ts}@example.com",
        password_hash="hashed_pw",
        full_name="Michael Candidate",
        role=UserRole.STUDENT,
    )
    await student.insert()

    return {
        "recruiter": recruiter,
        "company": company,
        "student": student,
    }


# ==============================================================================
# SCENARIO 1: Student Career Readiness Workflow
# ==============================================================================
@pytest.mark.asyncio
async def test_scenario_1_student_career_readiness():
    """
    Scenario 1: Student Career Readiness:
    Upload Resume -> ATS Diagnostics -> Skill Gap Engine -> 4-Week Roadmap -> Target DSA
    """
    actors = await setup_e2e_actors()
    student = actors["student"]

    # 1. Student uploads resume
    resume = Resume(
        user_id=str(student.id),
        filename="michael_resume.pdf",
        raw_text="Experienced Python backend developer skilled in FastAPI, Docker, and PostgreSQL. Built scalable microservices.",
        extracted_skills=["Python", "FastAPI", "Docker", "PostgreSQL", "Git"],
        file_size_bytes=20480,
    )
    await resume.insert()

    # 2. ATS Report generated
    ats_report = ATSReport(
        user_id=str(student.id),
        resume_id=str(resume.id),
        filename="michael_resume.pdf",
        overall_score=84.5,
        formatting_score=90.0,
        keywords_score=85.0,
        content_score=82.0,
        skill_validation_score=80.0,
        ats_compatibility_score=86.0,
        interpretation="Strong competitive score meeting top-tier recruiter thresholds.",
        target_company="Amazon",
        target_role="Backend Software Engineer",
    )
    await ats_report.insert()

    # 3. Student requests skill gap analysis for target company & role
    gap_request = SkillGapAnalysisRequest(
        company="Amazon",
        role="Backend Software Engineer",
        job_description="Amazon AWS team seeks Backend Engineer with Python, Distributed Systems, Redis, and AWS DynamoDB.",
        resume_id=str(resume.id),
        ats_report_id=str(ats_report.id),
    )
    gap_result = await perform_skill_gap_analysis(gap_request, current_user=student)

    assert gap_result.target_company.lower() == "amazon"
    assert gap_result.match_percentage > 0
    assert len(gap_result.roadmap_weeks) == 4
    assert len(gap_result.company_dsa_problems) > 0

    # 4. Target DSA recommendations query
    dsa_recs = await get_target_aware_dsa(
        company="Amazon",
        role="Backend Software Engineer",
        missing_skills="Distributed Systems,Redis",
        limit=10,
    )
    all_recs = dsa_recs.get("company_tagged_questions", []) + dsa_recs.get("role_and_skill_questions", [])
    assert len(all_recs) > 0
    assert any(p["is_company_tagged"] for p in dsa_recs.get("company_tagged_questions", []))

    # 5. Student Dashboard reflects Module 1 & 3 integration
    dash = await get_student_dashboard(current_user=student)
    assert dash["latest_ats_score"] == 84.5
    assert dash["career_readiness"]["latest_ats_score"] == 84.5
    assert dash["career_readiness"]["score_breakdown"]["formatting"] == 90.0
    assert len(dash["dsa"]["top_companies"]) > 0


# ==============================================================================
# SCENARIO 2: Job Application (Eligible Candidate)
# ==============================================================================
@pytest.mark.asyncio
async def test_scenario_2_job_application_eligible():
    """
    Scenario 2: Job application:
    Recruiter publishes job -> Student with passing ATS score applies ->
    Eligibility validated -> Application accepted.
    """
    actors = await setup_e2e_actors()
    recruiter = actors["recruiter"]
    company = actors["company"]
    student = actors["student"]

    # 1. Recruiter publishes job with min_ats_score = 70.0
    job = Job(
        title="Cloud Infrastructure Engineer",
        company_id=str(company.id),
        recruiter_id=str(recruiter.id),
        company_name=company.name,
        location="Remote",
        min_ats_score=70.0,
        enforce_threshold=True,
        description="Seeking Cloud Infrastructure Engineer with Docker, Kubernetes, and Python.",
        required_skills=["Docker", "Kubernetes", "Python"],
    )
    await job.insert()

    # 2. Student has qualifying ATS score of 78.0
    resume = Resume(user_id=str(student.id), filename="cloud_dev.pdf")
    await resume.insert()
    ats_report = ATSReport(
        user_id=str(student.id),
        resume_id=str(resume.id),
        filename="cloud_dev.pdf",
        overall_score=78.0,
    )
    await ats_report.insert()

    # 3. Student applies
    app_req = ApplicationCreateRequest(
        job_id=str(job.id),
        resume_id=str(resume.id),
        ats_report_id=str(ats_report.id),
        cover_letter="Passionate about cloud architecture.",
    )
    app_res = await apply_for_job(job_id=str(job.id), req=app_req, current_user=student)

    status_val = app_res.get("status") if isinstance(app_res, dict) else getattr(app_res, "status", None)
    score_val = app_res.get("ats_score") if isinstance(app_res, dict) else getattr(app_res, "ats_score", None)
    app_id = app_res.get("application_id") if isinstance(app_res, dict) else getattr(app_res, "id", None)

    assert str(status_val) in ("applied", "ApplicationStatus.APPLIED")
    assert score_val == 78.0
    assert app_id is not None


# ==============================================================================
# SCENARIO 3: Ineligible Student (Below-Threshold Application Blocked)
# ==============================================================================
@pytest.mark.asyncio
async def test_scenario_3_ineligible_student():
    """
    Scenario 3: Ineligible candidate:
    Candidate with score below recruiter threshold is rejected with diagnostic feedback.
    """
    actors = await setup_e2e_actors()
    recruiter = actors["recruiter"]
    company = actors["company"]
    student = actors["student"]

    # 1. High threshold job
    job = Job(
        title="Principal AI Research Engineer",
        company_id=str(company.id),
        recruiter_id=str(recruiter.id),
        company_name=company.name,
        location="San Francisco, CA",
        min_ats_score=85.0,
        enforce_threshold=True,
        description="PhD or 8+ years AI systems experience.",
    )
    await job.insert()

    # 2. Student has below-threshold score of 62.0
    resume = Resume(user_id=str(student.id), filename="junior_dev.pdf")
    await resume.insert()
    ats_report = ATSReport(
        user_id=str(student.id),
        resume_id=str(resume.id),
        filename="junior_dev.pdf",
        overall_score=62.0,
    )
    await ats_report.insert()

    # 3. Application attempted -> Must fail with 400
    app_req = ApplicationCreateRequest(
        job_id=str(job.id),
        resume_id=str(resume.id),
        ats_report_id=str(ats_report.id),
    )
    with pytest.raises(HTTPException) as exc_info:
        await apply_for_job(job_id=str(job.id), req=app_req, current_user=student)

    assert exc_info.value.status_code == 400
    assert "threshold" in exc_info.value.detail.lower()


# ==============================================================================
# SCENARIO 4: Recruiter Evaluation & Shortlisting Workflow
# ==============================================================================
@pytest.mark.asyncio
async def test_scenario_4_recruiter_shortlisting_workflow():
    """
    Scenario 4: Recruiter Shortlisting:
    Recruiter inspects ranked candidate list -> Opens evaluation dossier -> Shortlists candidate with audit logging.
    """
    actors = await setup_e2e_actors()
    recruiter = actors["recruiter"]
    company = actors["company"]
    student = actors["student"]

    job = Job(
        title="Full Stack Software Engineer",
        company_id=str(company.id),
        recruiter_id=str(recruiter.id),
        location="New York, NY",
        min_ats_score=60.0,
        description="React and Python Full Stack Role.",
        required_skills=["React", "Python", "PostgreSQL"],
    )
    await job.insert()

    resume = Resume(
        user_id=str(student.id),
        filename="applicant.pdf",
        extracted_skills=["React", "Python", "PostgreSQL", "Docker"],
    )
    await resume.insert()

    ats = ATSReport(
        user_id=str(student.id),
        resume_id=str(resume.id),
        filename="applicant.pdf",
        overall_score=88.0,
    )
    await ats.insert()

    application = Application(
        job_id=str(job.id),
        student_id=str(student.id),
        resume_id=str(resume.id),
        ats_report_id=str(ats.id),
        ats_score=88.0,
        match_percentage=91.0,
        status=ApplicationStatus.APPLIED,
    )
    await application.insert()

    # 1. Recruiter queries candidates list
    candidates = await get_job_candidates(
        job_id=str(job.id),
        sort_by="ats_score",
        current_user=recruiter,
    )
    assert len(candidates) == 1
    cand = candidates[0]
    cand_name = cand.student_name if hasattr(cand, "student_name") else cand["student_name"]
    assert cand_name == student.full_name

    # 2. Recruiter opens candidate evaluation dossier
    dossier = await get_recruiter_application_detail(
        application_id=str(application.id),
        current_user=recruiter,
    )
    assert dossier.student_name == student.full_name
    assert dossier.ats_score == 88.0
    assert hasattr(dossier, "matching_skills")
    assert hasattr(dossier, "missing_skills")

    # 3. Recruiter updates status to shortlisted with notes
    updated_app = await update_candidate_status(
        application_id=str(application.id),
        req=CandidateStatusUpdateRequest(
            status=ApplicationStatus.SHORTLISTED,
            recruiter_notes="Strong technical background and verified React/Python projects.",
        ),
        current_user=recruiter,
    )
    status_result = updated_app.get("status") if isinstance(updated_app, dict) else updated_app.status
    assert status_result == ApplicationStatus.SHORTLISTED
    assert "audit_log_id" in updated_app


# ==============================================================================
# SCENARIO 5: Learning & DSA Progress Persistence
# ==============================================================================
@pytest.mark.asyncio
async def test_scenario_5_learning_progress_persistence():
    """
    Scenario 5: Progress Persistence:
    Student checks off roadmap items and DSA questions -> Refreshes -> Progress remains saved.
    """
    actors = await setup_e2e_actors()
    student = actors["student"]

    # 1. Update roadmap progress
    await update_roadmap_progress(
        req=RoadmapProgressUpdateRequest(
            report_id="roadmap-123",
            resource_id="res-week1-01",
            is_completed=True,
            week_number=1,
        ),
        current_user=student,
    )
    await update_roadmap_progress(
        req=RoadmapProgressUpdateRequest(
            report_id="roadmap-123",
            objective_id="obj-week1-01",
            is_completed=True,
            week_number=1,
        ),
        current_user=student,
    )

    # Verify roadmap progress retrieved
    prog = await get_roadmap_progress(current_user=student)
    assert "res-week1-01" in prog["completed_resources"]
    assert "obj-week1-01" in prog["completed_objectives"]

    # 2. Update DSA progress
    await update_dsa_progress(
        req=DSAProgressUpdateRequest(
            problem_id="1",
            problem_title="Two Sum",
            company="google",
            difficulty="Easy",
            is_solved=True,
        ),
        current_user=student,
    )

    # Verify DSA progress retrieved
    dsa_prog = await get_dsa_progress(current_user=student)
    assert "1" in dsa_prog["solved_ids"]
    assert dsa_prog["total_solved"] >= 1


# ==============================================================================
# SCENARIO 6: External API Failure Resilience (Graceful Fallback)
# ==============================================================================
@pytest.mark.asyncio
async def test_scenario_6_external_api_failure_resilience():
    """
    Scenario 6: External API failure handling:
    When external APIs fail or are offline, system provides authentic fallback data without crashing.
    """
    # 1. Tech hiring news fallback query
    news_res = await get_tech_news(count=5, category="Tech Hiring News")
    assert len(news_res["articles"]) > 0
    assert all(a.get("title") for a in news_res["articles"])
    assert all(a.get("source") for a in news_res["articles"])

    # 2. Video fallback query in learning resources
    from app.services.learning_resources import search_youtube_videos_live
    videos = await search_youtube_videos_live("Distributed Systems", max_results=3)
    assert len(videos) > 0
    assert all(v.get("url") for v in videos)
    assert all("youtube.com" in v.get("url") for v in videos)


# ==============================================================================
# SCENARIO 7: Security Boundaries & Cross-Tenant Protection
# ==============================================================================
@pytest.mark.asyncio
async def test_scenario_7_security_access_boundaries():
    """
    Scenario 7: Authorization boundaries:
    Unauthorized recruiters cannot access other recruiters' jobs or applications.
    Students cannot call recruiter endpoints.
    """
    actors_a = await setup_e2e_actors()
    actors_b = await setup_e2e_actors()

    recruiter_a = actors_a["recruiter"]
    company_a = actors_a["company"]
    student = actors_a["student"]
    recruiter_b = actors_b["recruiter"]

    # Job belonging to Recruiter A
    job_a = Job(
        title="Internal Confidential Engineering Lead",
        company_id=str(company_a.id),
        recruiter_id=str(recruiter_a.id),
        location="Remote",
    )
    await job_a.insert()

    resume = Resume(user_id=str(student.id), filename="private.pdf")
    await resume.insert()

    app_a = Application(
        job_id=str(job_a.id),
        student_id=str(student.id),
        resume_id=str(resume.id),
        status=ApplicationStatus.APPLIED,
    )
    await app_a.insert()

    # 1. Recruiter B attempts to view candidates of Recruiter A's job -> 404/403 Access Denied
    with pytest.raises(HTTPException) as exc_info:
        await get_job_candidates(job_id=str(job_a.id), current_user=recruiter_b)
    assert exc_info.value.status_code in (403, 404)

    # 2. Recruiter B attempts to modify candidate status of Recruiter A's job -> 403 Forbidden
    with pytest.raises(HTTPException) as exc_info2:
        await update_candidate_status(
            application_id=str(app_a.id),
            req=CandidateStatusUpdateRequest(
                status=ApplicationStatus.SHORTLISTED,
            ),
            current_user=recruiter_b,
        )
    assert exc_info2.value.status_code == 403
