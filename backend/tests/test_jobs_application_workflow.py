from datetime import datetime, timedelta, timezone
import pytest
from fastapi import HTTPException
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.job import Job
from app.models.application import Application, ApplicationStatus
from app.models.ats_report import ATSReport
from app.models.resume import Resume
from app.schemas.job import ApplicationCreateRequest, JobUpdateRequest
from app.api.v1.jobs import apply_for_job
from app.api.v1.recruiter import update_recruiter_job


async def create_workflow_context():
    """Helper to setup recruiter, company, and student for testing all application scenarios."""
    ts = datetime.now().timestamp()
    recruiter = User(
        email=f"recruiter_{ts}@example.com",
        password_hash="fakehash",
        full_name="Alex Recruiter",
        role=UserRole.RECRUITER,
    )
    await recruiter.insert()

    company = Company(
        name="Global Tech Corp",
        slug=f"global-tech-{ts}",
        recruiter_id=str(recruiter.id),
        location="San Francisco, CA",
    )
    await company.insert()

    student = User(
        email=f"student_{ts}@example.com",
        password_hash="fakehash",
        full_name="Sarah Candidate",
        role=UserRole.STUDENT,
    )
    await student.insert()

    return {
        "recruiter": recruiter,
        "company": company,
        "student": student,
    }


@pytest.mark.asyncio
async def test_scenario_a_student_applies_above_threshold():
    """Scenario A: Student applies to a job with an ATS score strictly above the threshold."""
    ctx = await create_workflow_context()
    student = ctx["student"]
    company = ctx["company"]
    recruiter = ctx["recruiter"]

    # 1. Job with min_ats_score = 70.0
    job = Job(
        title="Senior Python Backend Engineer",
        company_id=str(company.id),
        recruiter_id=str(recruiter.id),
        location="Remote",
        description="Build FastAPI microservices and manage PostgreSQL databases.",
        required_skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
        min_ats_score=70.0,
        enforce_threshold=True,
    )
    await job.insert()

    # 2. Student resume
    resume = Resume(
        user_id=str(student.id),
        filename="sarah_python_expert.pdf",
        raw_text="Experienced Senior Python Engineer with 6 years building FastAPI and Docker services with PostgreSQL.",
        extracted_skills=["Python", "FastAPI", "PostgreSQL", "Docker", "Git"],
    )
    await resume.insert()

    # 3. ATS Report with score 85.0 (Above threshold of 70.0)
    report = ATSReport(
        user_id=str(student.id),
        resume_id=str(resume.id),
        filename=resume.filename,
        overall_score=85.0,
        formatting_score=18.0,
        keywords_score=23.0,
        content_score=22.0,
        skill_validation_score=12.0,
        ats_compatibility_score=10.0,
        interpretation="Strong candidate profile.",
    )
    await report.insert()

    # 4. Apply
    req = ApplicationCreateRequest(
        resume_id=str(resume.id),
        ats_report_id=str(report.id),
        cover_letter="I am excited to apply for this backend role.",
    )
    res = await apply_for_job(job_id=str(job.id), req=req, current_user=student, embedder=None)

    assert res["ats_score"] == 85.0
    assert res["min_ats_score"] == 70.0
    assert res["status"] == "applied"
    assert "application_id" in res

    # Verify saved application
    saved_app = await Application.get(res["application_id"])
    assert saved_app is not None
    assert saved_app.ats_score == 85.0
    assert saved_app.status == ApplicationStatus.APPLIED
    assert saved_app.cover_letter == "I am excited to apply for this backend role."


@pytest.mark.asyncio
async def test_scenario_b_student_applies_exactly_at_threshold():
    """Scenario B: Student applies to a job with an ATS score exactly equal to the threshold."""
    ctx = await create_workflow_context()
    student = ctx["student"]
    company = ctx["company"]
    recruiter = ctx["recruiter"]

    job = Job(
        title="Full Stack Engineer",
        company_id=str(company.id),
        recruiter_id=str(recruiter.id),
        location="Remote",
        description="Full stack development with React and Node.",
        required_skills=["React", "Node.js", "TypeScript"],
        min_ats_score=75.0,
        enforce_threshold=True,
    )
    await job.insert()

    resume = Resume(
        user_id=str(student.id),
        filename="sarah_exact.pdf",
        raw_text="Full stack web developer with React and Node.js experience.",
        extracted_skills=["React", "Node.js", "TypeScript"],
    )
    await resume.insert()

    # Exact threshold: 75.0 == 75.0
    report = ATSReport(
        user_id=str(student.id),
        resume_id=str(resume.id),
        filename=resume.filename,
        overall_score=75.0,
        interpretation="Qualified baseline profile.",
    )
    await report.insert()

    req = ApplicationCreateRequest(
        resume_id=str(resume.id),
        ats_report_id=str(report.id),
    )
    res = await apply_for_job(job_id=str(job.id), req=req, current_user=student, embedder=None)

    assert res["ats_score"] == 75.0
    assert res["min_ats_score"] == 75.0
    assert res["status"] == "applied"


@pytest.mark.asyncio
async def test_scenario_c_student_applies_below_threshold_rejected():
    """Scenario C: Student applies with an ATS score below the recruiter-defined threshold."""
    ctx = await create_workflow_context()
    student = ctx["student"]
    company = ctx["company"]
    recruiter = ctx["recruiter"]

    # High threshold: 80.0
    job = Job(
        title="Staff ML Engineer",
        company_id=str(company.id),
        recruiter_id=str(recruiter.id),
        location="Remote",
        description="Lead research and model training at scale.",
        required_skills=["PyTorch", "Kubernetes", "Distributed Systems"],
        min_ats_score=80.0,
        enforce_threshold=True,
    )
    await job.insert()

    resume = Resume(
        user_id=str(student.id),
        filename="sarah_junior.pdf",
        raw_text="Junior developer with basic Python knowledge.",
        extracted_skills=["Python"],
    )
    await resume.insert()

    # Sub-threshold score: 55.0 < 80.0
    report = ATSReport(
        user_id=str(student.id),
        resume_id=str(resume.id),
        filename=resume.filename,
        overall_score=55.0,
        interpretation="Developing profile.",
    )
    await report.insert()

    req = ApplicationCreateRequest(
        resume_id=str(resume.id),
        ats_report_id=str(report.id),
    )

    with pytest.raises(HTTPException) as excinfo:
        await apply_for_job(job_id=str(job.id), req=req, current_user=student, embedder=None)

    assert excinfo.value.status_code == 400
    assert "below the minimum threshold" in excinfo.value.detail
    assert "55.0/100" in excinfo.value.detail
    assert "80.0/100" in excinfo.value.detail

    # Verify that NO application was inserted in the database
    apps_count = await Application.find(job_id=str(job.id), student_id=str(student.id)).count()
    assert apps_count == 0


@pytest.mark.asyncio
async def test_scenario_d_recruiter_changes_threshold_after_publishing():
    """Scenario D: Recruiter modifies threshold after publishing; eligibility must recalculate."""
    ctx = await create_workflow_context()
    student = ctx["student"]
    company = ctx["company"]
    recruiter = ctx["recruiter"]

    # Initial threshold: 60.0
    job = Job(
        title="DevOps Specialist",
        company_id=str(company.id),
        recruiter_id=str(recruiter.id),
        location="Remote",
        description="Kubernetes cluster setup and Terraform automation.",
        required_skills=["Kubernetes", "Terraform", "AWS"],
        min_ats_score=60.0,
        enforce_threshold=True,
    )
    await job.insert()

    resume = Resume(
        user_id=str(student.id),
        filename="sarah_devops.pdf",
        raw_text="DevOps engineer with Docker and AWS experience.",
        extracted_skills=["Docker", "AWS"],
    )
    await resume.insert()

    # Candidate has score 72.0
    report = ATSReport(
        user_id=str(student.id),
        resume_id=str(resume.id),
        filename=resume.filename,
        overall_score=72.0,
    )
    await report.insert()

    # Recruiter raises threshold to 85.0 (Candidate with 72.0 should now be rejected)
    update_req = JobUpdateRequest(min_ats_score=85.0)
    await update_recruiter_job(job_id=str(job.id), req=update_req, current_user=recruiter)

    apply_req = ApplicationCreateRequest(resume_id=str(resume.id), ats_report_id=str(report.id))
    with pytest.raises(HTTPException) as excinfo:
        await apply_for_job(job_id=str(job.id), req=apply_req, current_user=student, embedder=None)

    assert excinfo.value.status_code == 400
    assert "85.0/100" in excinfo.value.detail

    # Recruiter adjusts threshold down to 70.0 (Candidate with 72.0 should now be accepted)
    update_req2 = JobUpdateRequest(min_ats_score=70.0)
    await update_recruiter_job(job_id=str(job.id), req=update_req2, current_user=recruiter)

    res = await apply_for_job(job_id=str(job.id), req=apply_req, current_user=student, embedder=None)
    assert res["status"] == "applied"
    assert res["min_ats_score"] == 70.0


@pytest.mark.asyncio
async def test_scenario_e_duplicate_application_prevention():
    """Scenario E: Student attempts to apply twice to the same job."""
    ctx = await create_workflow_context()
    student = ctx["student"]
    company = ctx["company"]
    recruiter = ctx["recruiter"]

    job = Job(
        title="Frontend Architect",
        company_id=str(company.id),
        recruiter_id=str(recruiter.id),
        location="Remote",
        description="React design systems.",
        required_skills=["React", "TypeScript"],
        min_ats_score=60.0,
    )
    await job.insert()

    resume = Resume(
        user_id=str(student.id),
        filename="sarah_fe.pdf",
        raw_text="Experienced frontend developer with React.",
        extracted_skills=["React"],
    )
    await resume.insert()

    report = ATSReport(
        user_id=str(student.id),
        resume_id=str(resume.id),
        filename=resume.filename,
        overall_score=78.0,
    )
    await report.insert()

    apply_req = ApplicationCreateRequest(resume_id=str(resume.id), ats_report_id=str(report.id))

    # First application succeeds
    res1 = await apply_for_job(job_id=str(job.id), req=apply_req, current_user=student, embedder=None)
    assert res1["status"] == "applied"

    # Second application must be rejected
    with pytest.raises(HTTPException) as excinfo:
        await apply_for_job(job_id=str(job.id), req=apply_req, current_user=student, embedder=None)

    assert excinfo.value.status_code == 400
    assert "already applied" in excinfo.value.detail.lower()


@pytest.mark.asyncio
async def test_scenario_f_job_closed_or_expired_prevention():
    """Scenario F: Job is closed or deadline passed before application submission."""
    ctx = await create_workflow_context()
    student = ctx["student"]
    company = ctx["company"]
    recruiter = ctx["recruiter"]

    # Closed job
    closed_job = Job(
        title="Closed Position",
        company_id=str(company.id),
        recruiter_id=str(recruiter.id),
        location="Remote",
        description="Old role.",
        status="closed",
        is_active=False,
        min_ats_score=50.0,
    )
    await closed_job.insert()

    # Expired job (deadline yesterday)
    expired_job = Job(
        title="Expired Deadline Role",
        company_id=str(company.id),
        recruiter_id=str(recruiter.id),
        location="Remote",
        description="Role with expired deadline.",
        deadline=datetime.now(timezone.utc) - timedelta(days=1),
        min_ats_score=50.0,
    )
    await expired_job.insert()

    resume = Resume(
        user_id=str(student.id),
        filename="sarah_res.pdf",
        raw_text="Developer resume.",
        extracted_skills=["Python"],
    )
    await resume.insert()

    report = ATSReport(
        user_id=str(student.id),
        resume_id=str(resume.id),
        filename=resume.filename,
        overall_score=80.0,
    )
    await report.insert()

    apply_req = ApplicationCreateRequest(resume_id=str(resume.id), ats_report_id=str(report.id))

    # Applying to closed job should fail
    with pytest.raises(HTTPException) as exc_closed:
        await apply_for_job(job_id=str(closed_job.id), req=apply_req, current_user=student, embedder=None)
    assert exc_closed.value.status_code == 400
    assert "closed" in exc_closed.value.detail.lower() or "no longer accepting" in exc_closed.value.detail.lower()

    # Applying to expired job should fail
    with pytest.raises(HTTPException) as exc_expired:
        await apply_for_job(job_id=str(expired_job.id), req=apply_req, current_user=student, embedder=None)
    assert exc_expired.value.status_code == 400
    assert "deadline" in exc_expired.value.detail.lower()


@pytest.mark.asyncio
async def test_scenario_g_ats_outage_resilient_fallback():
    """Scenario G: ATS & skill gap evaluation completes safely even with embedder=None (outage simulation)."""
    ctx = await create_workflow_context()
    student = ctx["student"]
    company = ctx["company"]
    recruiter = ctx["recruiter"]

    job = Job(
        title="Resilience Test Engineer",
        company_id=str(company.id),
        recruiter_id=str(recruiter.id),
        location="Remote",
        description="Testing offline and fallback behavior.",
        required_skills=["Python", "FastAPI"],
        min_ats_score=60.0,
    )
    await job.insert()

    resume = Resume(
        user_id=str(student.id),
        filename="sarah_fallback.pdf",
        raw_text="Python and FastAPI developer.",
        extracted_skills=["Python", "FastAPI"],
    )
    await resume.insert()

    report = ATSReport(
        user_id=str(student.id),
        resume_id=str(resume.id),
        filename=resume.filename,
        overall_score=88.0,
    )
    await report.insert()

    # Pass embedder=None simulating transformer embedding outage
    req = ApplicationCreateRequest(resume_id=str(resume.id), ats_report_id=str(report.id))
    res = await apply_for_job(job_id=str(job.id), req=req, current_user=student, embedder=None)

    assert res["status"] == "applied"
    assert res["match_percentage"] > 0.0


@pytest.mark.asyncio
async def test_scenario_h_resume_replaced_before_final_submission():
    """Scenario H: Candidate replaces older low-score resume with an updated high-score resume."""
    ctx = await create_workflow_context()
    student = ctx["student"]
    company = ctx["company"]
    recruiter = ctx["recruiter"]

    job = Job(
        title="High Bar Engineer",
        company_id=str(company.id),
        recruiter_id=str(recruiter.id),
        location="Remote",
        description="High threshold position.",
        required_skills=["Go", "Docker", "Kubernetes"],
        min_ats_score=80.0,
        enforce_threshold=True,
    )
    await job.insert()

    # 1. Old resume: Low score (60.0 < 80.0)
    old_resume = Resume(
        user_id=str(student.id),
        filename="old_draft.pdf",
        raw_text="Beginner with basic Go.",
        extracted_skills=["Go"],
    )
    await old_resume.insert()

    old_report = ATSReport(
        user_id=str(student.id),
        resume_id=str(old_resume.id),
        filename=old_resume.filename,
        overall_score=60.0,
    )
    await old_report.insert()

    # Old resume application fails
    req_old = ApplicationCreateRequest(resume_id=str(old_resume.id), ats_report_id=str(old_report.id))
    with pytest.raises(HTTPException):
        await apply_for_job(job_id=str(job.id), req=req_old, current_user=student, embedder=None)

    # 2. Replaced updated resume: High score (88.0 >= 80.0)
    new_resume = Resume(
        user_id=str(student.id),
        filename="sarah_go_expert_v2.pdf",
        raw_text="Senior Go engineer with production Kubernetes and Docker deployment experience.",
        extracted_skills=["Go", "Docker", "Kubernetes", "Microservices"],
    )
    await new_resume.insert()

    new_report = ATSReport(
        user_id=str(student.id),
        resume_id=str(new_resume.id),
        filename=new_resume.filename,
        overall_score=88.0,
    )
    await new_report.insert()

    # Applying with updated resume succeeds
    req_new = ApplicationCreateRequest(resume_id=str(new_resume.id), ats_report_id=str(new_report.id))
    res = await apply_for_job(job_id=str(job.id), req=req_new, current_user=student, embedder=None)

    assert res["status"] == "applied"
    assert res["ats_score"] == 88.0

    # Ensure application record points to new_resume.id, not old_resume.id
    app_doc = await Application.get(res["application_id"])
    assert app_doc.resume_id == str(new_resume.id)
    assert app_doc.ats_score == 88.0
