from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends
from app.api.deps import require_student
from app.models.user import User
from app.models.resume import Resume
from app.models.ats_report import ATSReport
from app.models.skill_gap import SkillGapReport
from app.models.application import Application
from app.models.job import Job
from app.models.company import Company
from app.models.progress import UserRoadmapProgress, UserDSAProgress
from app.services.news_service import get_job_news
from app.models import get_link_id

router = APIRouter(prefix="/student", tags=["Student Portal"])


@router.get("/dashboard")
async def get_student_dashboard(current_user: User = Depends(require_student)):
    """
    Comprehensive aggregated dashboard summary for students across 4 modules:
    Module 1: Career Readiness (Latest ATS score, JD match, history, skills to improve, roadmap progress, next actions)
    Module 2: Jobs (Recommended jobs, recently published, eligible opportunities, application count & status overview)
    Module 3: DSA Tracker (Questions solved, remaining, progress %, difficulty breakdown, company targets)
    Module 4: Hiring Intelligence (Featured news, recent announcements, internship opportunities)
    """
    uid = str(current_user.id)

    # 1. Latest ATS reports & history
    latest_ats = await ATSReport.find(user_id=uid).sort(-ATSReport.created_at).first_or_none()
    ats_history = await ATSReport.find(user_id=uid).sort(-ATSReport.created_at).limit(5).to_list()
    resume_count = await Resume.find(user_id=uid).count()

    # 2. Skill Gaps & Roadmap Progress
    latest_gap = await SkillGapReport.find(user_id=uid).sort(-SkillGapReport.created_at).first_or_none()
    recent_gaps = await SkillGapReport.find(user_id=uid).sort(-SkillGapReport.created_at).limit(5).to_list()

    roadmap_record = await UserRoadmapProgress.find(user_id=uid).first_or_none()
    completed_resources = len(roadmap_record.completed_resources) if roadmap_record else 0
    completed_objectives = len(roadmap_record.completed_objectives) if roadmap_record else 0
    total_roadmap_completed = completed_resources + completed_objectives

    # Estimate 4-week roadmap items (typical 4 weeks * ~6 items = 24 items)
    estimated_roadmap_total = 24
    roadmap_percentage = min(100, int((total_roadmap_completed / estimated_roadmap_total) * 100)) if total_roadmap_completed > 0 else 0

    # Skills to improve
    skills_to_improve: List[str] = []
    if latest_gap and latest_gap.missing_skills:
        skills_to_improve = [s if isinstance(s, str) else s.get("name", "") for s in latest_gap.missing_skills[:6] if s]
    elif latest_ats and latest_ats.critical_issues:
        skills_to_improve = [str(iss)[:40] for iss in latest_ats.critical_issues[:4]]

    # 3. Job Applications & Active Opportunities
    apps = await Application.find(student_id=uid).sort(-Application.applied_at).to_list()
    active_jobs = await Job.find(is_active=True).sort(-Job.created_at).limit(10).to_list()

    candidate_score = latest_ats.overall_score if latest_ats else 0.0

    recent_job_cards = []
    eligible_count = 0
    for j in active_jobs:
        cid = get_link_id(j.company_id)
        comp = await Company.get(cid) if cid else None
        comp_name = j.company_name or (comp.name if comp else "Tech Employer")
        is_eligible = candidate_score >= j.min_ats_score

        if is_eligible:
            eligible_count += 1

        recent_job_cards.append({
            "id": str(j.id),
            "title": j.title,
            "company_name": comp_name,
            "location": j.location,
            "job_type": j.job_type,
            "min_ats_score": j.min_ats_score,
            "is_eligible": is_eligible,
            "required_skills": j.required_skills[:4] if j.required_skills else [],
            "created_at": j.created_at,
        })

    # Recommended jobs: prioritize eligible or matching target role
    target_role = (latest_gap.target_role if latest_gap else (getattr(latest_ats, "target_role", None) or "")).lower()
    recommended_jobs = [
        j for j in recent_job_cards
        if (target_role and target_role in j["title"].lower()) or j["is_eligible"]
    ][:4]
    if not recommended_jobs:
        recommended_jobs = recent_job_cards[:4]

    # Application status overview
    status_overview = {
        "applied": sum(1 for a in apps if a.status == "applied"),
        "reviewing": sum(1 for a in apps if a.status == "reviewing"),
        "shortlisted": sum(1 for a in apps if a.status == "shortlisted"),
        "offered": sum(1 for a in apps if a.status == "offered"),
        "rejected": sum(1 for a in apps if a.status == "rejected"),
    }

    # Detailed application items
    enriched_apps = []
    for a in apps[:5]:
        jid = get_link_id(a.job_id)
        job = await Job.get(jid) if jid else None
        comp_name = "Company"
        if job:
            cid = get_link_id(job.company_id)
            comp = await Company.get(cid) if cid else None
            comp_name = job.company_name or (comp.name if comp else "Company")

        enriched_apps.append({
            "id": str(a.id),
            "job_id": str(job.id) if job else "",
            "job_title": job.title if job else "Position",
            "company_name": comp_name,
            "ats_score": a.ats_score,
            "match_percentage": a.match_percentage,
            "status": a.status,
            "applied_at": a.applied_at,
        })

    # 4. DSA Tracker Progress
    dsa_solved_records = await UserDSAProgress.find(user_id=uid, is_solved=True).to_list()
    total_dsa_bank = 3310
    solved_dsa_count = len(dsa_solved_records)
    remaining_dsa = max(0, total_dsa_bank - solved_dsa_count)
    dsa_percent = round((solved_dsa_count / total_dsa_bank) * 100, 1)

    easy_solved = sum(1 for r in dsa_solved_records if (r.difficulty or "").lower() == "easy")
    medium_solved = sum(1 for r in dsa_solved_records if (r.difficulty or "").lower() == "medium")
    hard_solved = sum(1 for r in dsa_solved_records if (r.difficulty or "").lower() == "hard")

    # 5. Hiring News Highlights
    try:
        news_articles = await get_job_news(count=3, category="Tech Hiring News")
    except Exception:
        news_articles = []

    # 6. Recommended Next Actions
    recommended_actions = []
    if not latest_ats:
        recommended_actions.append({
            "title": "Scan Resume with ATS Diagnostic",
            "description": "Upload your resume to receive a deterministic 5-pillar ATS compatibility score and GitHub verification.",
            "link": "/upload-resume",
            "cta": "Scan Resume",
            "priority": "high",
        })
    elif latest_ats.overall_score < 70:
        recommended_actions.append({
            "title": "Bridge Resume Structural Gaps",
            "description": f"Your current score is {latest_ats.overall_score}/100. Address missing keywords and structural issues to surpass recruiter filters.",
            "link": "/upload-resume",
            "cta": "Review Diagnostics",
            "priority": "high",
        })
    else:
        recommended_actions.append({
            "title": "Apply to Eligible Opportunities",
            "description": f"You qualify for {eligible_count} active job openings meeting recruiter thresholds.",
            "link": "/jobs",
            "cta": "Browse Opportunities",
            "priority": "high",
        })

    if skills_to_improve:
        recommended_actions.append({
            "title": f"Follow 4-Week Roadmap for {skills_to_improve[0]}",
            "description": "Complete verified interactive resources and weekly milestones to elevate your candidate profile.",
            "link": "/skill-analysis",
            "cta": "Open Roadmap",
            "priority": "medium",
        })

    if solved_dsa_count < 15:
        recommended_actions.append({
            "title": "Practice High-Frequency Company DSA",
            "description": "Master algorithmic questions asked by top tech employers like Google, Amazon, and Meta.",
            "link": "/dsa-tracker",
            "cta": "Solve Problems",
            "priority": "medium",
        })

    return {
        # Backward-compatible top-level properties
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
        "applications": enriched_apps,

        # Module 1: Career Readiness
        "career_readiness": {
            "latest_ats_score": latest_ats.overall_score if latest_ats else None,
            "latest_ats_interpretation": latest_ats.interpretation if latest_ats else None,
            "latest_jd_match": latest_gap.match_percentage if latest_gap else (latest_ats.keywords_score if latest_ats else None),
            "score_breakdown": {
                "formatting": latest_ats.formatting_score if latest_ats else 0,
                "keywords": latest_ats.keywords_score if latest_ats else 0,
                "content": latest_ats.content_score if latest_ats else 0,
                "skill_validation": latest_ats.skill_validation_score if latest_ats else 0,
                "ats_compatibility": latest_ats.ats_compatibility_score if latest_ats else 0,
            } if latest_ats else None,
            "history": [
                {
                    "id": str(r.id),
                    "filename": r.filename,
                    "overall_score": r.overall_score,
                    "target_role": getattr(r, "target_role", None) or "Software Engineer",
                    "target_company": getattr(r, "target_company", None) or "Tech Industry",
                    "created_at": r.created_at,
                }
                for r in ats_history
            ],
            "skills_to_improve": skills_to_improve,
            "roadmap_progress": {
                "completed_items": total_roadmap_completed,
                "total_items": estimated_roadmap_total,
                "percentage": roadmap_percentage,
            },
            "recommended_actions": recommended_actions,
        },

        # Module 2: Jobs
        "jobs": {
            "total_active_jobs": len(active_jobs),
            "eligible_jobs_count": eligible_count,
            "recommended_jobs": recommended_jobs,
            "recently_published": recent_job_cards[:4],
            "application_count": len(apps),
            "status_overview": status_overview,
            "recent_applications": enriched_apps,
        },

        # Module 3: DSA Tracker
        "dsa": {
            "total_questions": total_dsa_bank,
            "solved_questions": solved_dsa_count,
            "remaining_questions": remaining_dsa,
            "completion_rate": dsa_percent,
            "difficulty_breakdown": {
                "easy": easy_solved,
                "medium": medium_solved,
                "hard": hard_solved,
            },
            "top_companies": [
                {"name": "Google", "slug": "google"},
                {"name": "Amazon", "slug": "amazon"},
                {"name": "Meta", "slug": "meta"},
                {"name": "Microsoft", "slug": "microsoft"},
                {"name": "Apple", "slug": "apple"},
                {"name": "Stripe", "slug": "stripe"},
            ],
        },

        # Module 4: Hiring Intelligence
        "hiring_intelligence": {
            "featured_news": news_articles[0] if news_articles else None,
            "recent_articles": news_articles[1:4] if len(news_articles) > 1 else news_articles,
            "total_articles": len(news_articles),
        },
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
