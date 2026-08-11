import pytest
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.job import Job
from app.models.application import Application, ApplicationStatus
from app.models.ats_report import ATSReport
from app.models.resume import Resume
from app.models.skill_gap import SkillGapReport
from app.models.career_test import CareerTestResult


@pytest.mark.asyncio
async def test_user_model_crud():
    # Insert user
    user = User(
        email="test_supabase@example.com",
        password_hash="fakehash123",
        full_name="Supabase Tester",
        role=UserRole.STUDENT,
    )
    await user.insert()
    assert user.id is not None

    # Get user
    fetched = await User.get(user.id)
    assert fetched is not None
    assert fetched.email == "test_supabase@example.com"
    assert fetched.full_name == "Supabase Tester"

    # Find one
    found = await User.find_one(User.email == "test_supabase@example.com")
    assert found is not None
    assert found.id == user.id

    # Update user
    user.full_name = "Updated Tester"
    await user.save()
    updated = await User.get(user.id)
    assert updated.full_name == "Updated Tester"

    # Count
    count = await User.find(role="student").count()
    assert count >= 1

    # Delete
    await user.delete()
    deleted = await User.get(user.id)
    assert deleted is None


@pytest.mark.asyncio
async def test_job_and_application_flow():
    # Create Recruiter
    recruiter = User(
        email="recruiter_test@example.com",
        password_hash="fakehash",
        full_name="Top Recruiter",
        role=UserRole.RECRUITER,
    )
    await recruiter.insert()

    # Create Company
    company = Company(
        name="TechCorp AI",
        slug="techcorp-ai",
        recruiter_id=str(recruiter.id),
    )
    await company.insert()
    assert company.id is not None

    # Create Job
    job = Job(
        title="Full Stack Engineer",
        company_id=str(company.id),
        recruiter_id=str(recruiter.id),
        location="Remote",
        description="Build scalable AI SaaS",
        required_skills=["React", "FastAPI", "PostgreSQL"],
    )
    await job.insert()
    assert job.id is not None

    # Create Student & Resume
    student = User(
        email="student_test@example.com",
        password_hash="fakehash",
        full_name="Talented Student",
        role=UserRole.STUDENT,
    )
    await student.insert()

    resume = Resume(
        user_id=str(student.id),
        filename="resume.pdf",
        raw_text="Experienced in React, Python, and PostgreSQL",
        extracted_skills=["React", "Python", "PostgreSQL"],
    )
    await resume.insert()

    # Create Application
    app = Application(
        job_id=str(job.id),
        student_id=str(student.id),
        resume_id=str(resume.id),
        ats_score=88.5,
        match_percentage=92.0,
        status=ApplicationStatus.APPLIED,
    )
    await app.insert()

    # Query application
    app_list = await Application.find(job_id=str(job.id)).to_list()
    assert len(app_list) == 1
    assert app_list[0].ats_score == 88.5

    # Filter query
    cand = await Application.find_one(
        Application.job_id == str(job.id),
        Application.student_id == str(student.id),
    )
    assert cand is not None
    assert cand.match_percentage == 92.0
