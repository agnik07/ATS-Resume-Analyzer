from datetime import datetime, timezone
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.api.deps import get_current_user, get_embedder
from app.models.user import User
from app.models.resume import Resume
from app.models.ats_report import ATSReport
from app.models.skill_gap import SkillGapReport
from app.models import get_link_id
from app.schemas.skill_gap import SkillGapAnalysisRequest, SkillGapItem, SkillGapResponse
from app.services.skill_gap_engine import analyze_skill_gap
from app.services.job_catalog import list_companies, list_roles

router = APIRouter(prefix="/skill-gap", tags=["Skill Gap Engine"])


@router.post("/analyze", response_model=SkillGapResponse)
async def perform_skill_gap_analysis(
    req: SkillGapAnalysisRequest,
    current_user: User = Depends(get_current_user),
    embedder: Optional[Any] = Depends(get_embedder),
):
    """
    Perform deep skill gap analysis:
    - Reuses candidate's existing parsed resume data without reparsing.
    - Computes fuzzy keyword overlap and semantic embedding similarity.
    - Generates prioritized gap level mapping, 4-week learning roadmap, and company-specific DSA preparation problems.
    """
    uid = str(current_user.id)

    # 1. Fetch resume
    if req.resume_id:
        resume = await Resume.get(req.resume_id)
        if not resume or str(resume.user_id) != uid:
            raise HTTPException(status_code=404, detail="Specified resume not found")
    else:
        resume = await Resume.find(user_id=uid).sort(-Resume.created_at).first_or_none()
        if not resume:
            raise HTTPException(
                status_code=400,
                detail="No resume found. Please upload a resume on the ATS portal first.",
            )

    # 1b. Fetch specific or latest ATS Report to get verified skills & GitHub evidence
    ats_doc = None
    if req.ats_report_id:
        ats_doc = await ATSReport.get(req.ats_report_id)
        if ats_doc and str(ats_doc.user_id) != uid and current_user.role.value not in ("recruiter", "admin"):
            ats_doc = None

    if not ats_doc:
        ats_doc = await ATSReport.find(resume_id=str(resume.id)).sort(-ATSReport.created_at).first_or_none()
    if not ats_doc:
        ats_doc = await ATSReport.find(user_id=uid).sort(-ATSReport.created_at).first_or_none()

    # Determine JD text: from request, or fall back to ATS report JD
    effective_jd = (req.job_description or "").strip()
    if not effective_jd and ats_doc and ats_doc.job_description:
        effective_jd = ats_doc.job_description.strip()

    effective_company = req.company.strip() or (ats_doc.target_company if ats_doc else "Target Organization")
    effective_role = req.role.strip() or (ats_doc.target_role if ats_doc else "Software Engineer")
    effective_job_id = req.job_id or (str(ats_doc.job_id) if ats_doc and ats_doc.job_id else None)

    # 2. Run consolidated Skill Gap Engine
    result = analyze_skill_gap(
        resume_skills=resume.extracted_skills or resume.parsed_data.get("skills", []),
        resume_text=resume.raw_text,
        target_company=effective_company,
        target_role=effective_role,
        job_description_text=effective_jd,
        embedder=embedder,
        ats_report=ats_doc.to_db_dict() if ats_doc else None,
    )

    # 3. Save report to Supabase
    report_doc = SkillGapReport(
        user_id=uid,
        resume_id=str(resume.id),
        ats_report_id=str(ats_doc.id) if ats_doc else None,
        job_id=effective_job_id,
        target_company=result["target_company"],
        target_role=result["target_role"],
        job_description=effective_jd,
        match_percentage=result["match_percentage"],
        confidence_score=result["confidence_score"],
        confidence_level=result["confidence_level"],
        fallback_used=result["fallback_used"],
        resume_skills=result["resume_skills"],
        job_skills=result["job_skills"],
        matched_skills=result["matched_skills"],
        missing_skills=result["missing_skills"],
        skill_gaps=result["skill_gaps"],
        learning_roadmap=result["learning_roadmap"],
        learning_resources=result["learning_resources"],
        company_dsa_problems=result.get("company_dsa_problems", []),
    )
    await report_doc.insert()

    # Link back to ATS report bidirectionally
    if ats_doc:
        try:
            ats_doc.skill_gap_report_id = str(report_doc.id)
            if not ats_doc.target_company:
                ats_doc.target_company = effective_company
            if not ats_doc.target_role:
                ats_doc.target_role = effective_role
            if not ats_doc.job_description and effective_jd:
                ats_doc.job_description = effective_jd
            await ats_doc.save()
        except Exception as e:
            logger.warning(f"Failed to link ATS report back: {e}")

    return SkillGapResponse(
        id=str(report_doc.id),
        resume_id=str(report_doc.resume_id),
        ats_report_id=report_doc.ats_report_id,
        job_id=report_doc.job_id,
        target_company=report_doc.target_company,
        target_role=report_doc.target_role,
        job_description=report_doc.job_description,
        match_percentage=report_doc.match_percentage,
        confidence_score=report_doc.confidence_score,
        confidence_level=report_doc.confidence_level,
        fallback_used=report_doc.fallback_used,
        resume_skills=report_doc.resume_skills,
        job_skills=report_doc.job_skills,
        matched_skills=report_doc.matched_skills,
        missing_skills=report_doc.missing_skills,
        skill_gaps=[SkillGapItem(**item) for item in report_doc.skill_gaps],
        learning_roadmap=report_doc.learning_roadmap,
        roadmap_weeks=result.get("roadmap_weeks", []),
        learning_resources=report_doc.learning_resources,
        company_dsa_problems=report_doc.company_dsa_problems,
        created_at=report_doc.created_at,
    )


@router.get("/reports", response_model=List[SkillGapResponse])
async def get_my_skill_gap_reports(current_user: User = Depends(get_current_user)):
    """Retrieve history of user's skill gap evaluations."""
    uid = str(current_user.id)
    reports = await SkillGapReport.find(user_id=uid).sort(-SkillGapReport.created_at).to_list()
    return [
        SkillGapResponse(
            id=str(r.id),
            resume_id=str(r.resume_id),
            ats_report_id=getattr(r, "ats_report_id", None),
            job_id=getattr(r, "job_id", None),
            target_company=r.target_company,
            target_role=r.target_role,
            job_description=getattr(r, "job_description", None),
            match_percentage=r.match_percentage,
            confidence_score=r.confidence_score,
            confidence_level=r.confidence_level,
            fallback_used=r.fallback_used,
            resume_skills=r.resume_skills,
            job_skills=r.job_skills,
            matched_skills=r.matched_skills,
            missing_skills=r.missing_skills,
            skill_gaps=[SkillGapItem(**item) for item in r.skill_gaps],
            learning_roadmap=r.learning_roadmap,
            learning_resources=r.learning_resources,
            company_dsa_problems=r.company_dsa_problems,
            created_at=r.created_at,
        )
        for r in reports
    ]


@router.get("/reports/{report_id}", response_model=SkillGapResponse)
async def get_skill_gap_report_by_id(report_id: str, current_user: User = Depends(get_current_user)):
    """Get single Skill Gap report details."""
    report = await SkillGapReport.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    user_id = str(report.user_id)
    if user_id != str(current_user.id) and current_user.role.value not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized to view this report")

    return SkillGapResponse(
        id=str(report.id),
        resume_id=str(report.resume_id),
        ats_report_id=getattr(report, "ats_report_id", None),
        job_id=getattr(report, "job_id", None),
        target_company=report.target_company,
        target_role=report.target_role,
        job_description=getattr(report, "job_description", None),
        match_percentage=report.match_percentage,
        confidence_score=report.confidence_score,
        confidence_level=report.confidence_level,
        fallback_used=report.fallback_used,
        resume_skills=report.resume_skills,
        job_skills=report.job_skills,
        matched_skills=report.matched_skills,
        missing_skills=report.missing_skills,
        skill_gaps=[SkillGapItem(**item) for item in report.skill_gaps],
        learning_roadmap=report.learning_roadmap,
        learning_resources=report.learning_resources,
        company_dsa_problems=report.company_dsa_problems,
        created_at=report.created_at,
    )


from pydantic import BaseModel
from app.models.progress import UserRoadmapProgress


class RoadmapProgressUpdateRequest(BaseModel):
    report_id: Optional[str] = None
    resource_id: Optional[str] = None
    objective_id: Optional[str] = None
    is_completed: bool = True
    week_number: Optional[int] = None


@router.get("/roadmap/progress")
async def get_roadmap_progress(
    report_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """Retrieve student's persistent learning roadmap progress from Supabase."""
    uid = str(current_user.id)
    rep_id = report_id if isinstance(report_id, str) and report_id.strip() else None

    builder = UserRoadmapProgress.find(user_id=uid)
    if rep_id:
        builder.filter(UserRoadmapProgress.report_id == rep_id)

    progress = await builder.first_or_none()
    if not progress:
        return {
            "completed_resources": [],
            "completed_objectives": [],
            "week_completion": {},
            "total_completed": 0,
        }

    return {
        "completed_resources": progress.completed_resources,
        "completed_objectives": progress.completed_objectives,
        "week_completion": progress.week_completion,
        "total_completed": len(progress.completed_resources) + len(progress.completed_objectives),
    }


@router.post("/roadmap/progress")
async def update_roadmap_progress(
    req: RoadmapProgressUpdateRequest,
    current_user: User = Depends(get_current_user),
):
    """Persist learning roadmap resource or objective completion in Supabase."""
    uid = str(current_user.id)
    progress = await UserRoadmapProgress.find(user_id=uid).first_or_none()

    if not progress:
        progress = UserRoadmapProgress(
            user_id=uid,
            report_id=req.report_id,
            completed_resources=[],
            completed_objectives=[],
            week_completion={},
        )

    if req.report_id and not progress.report_id:
        progress.report_id = req.report_id

    # Toggle resource
    if req.resource_id:
        res_list = list(progress.completed_resources)
        if req.is_completed:
            if req.resource_id not in res_list:
                res_list.append(req.resource_id)
        else:
            if req.resource_id in res_list:
                res_list.remove(req.resource_id)
        progress.completed_resources = res_list

    # Toggle objective
    if req.objective_id:
        obj_list = list(progress.completed_objectives)
        if req.is_completed:
            if req.objective_id not in obj_list:
                obj_list.append(req.objective_id)
        else:
            if req.objective_id in obj_list:
                obj_list.remove(req.objective_id)
        progress.completed_objectives = obj_list

    # Track week completion if specified
    if req.week_number is not None:
        w_dict = dict(progress.week_completion or {})
        w_dict[str(req.week_number)] = req.is_completed
        progress.week_completion = w_dict

    progress.updated_at = datetime.now(timezone.utc)
    if progress.id:
        await progress.save()
    else:
        await progress.insert()

    return {
        "message": "Roadmap progress successfully persisted",
        "completed_resources": progress.completed_resources,
        "completed_objectives": progress.completed_objectives,
        "week_completion": progress.week_completion,
    }


@router.get("/companies", response_model=List[str])
async def get_catalog_companies():
    """List preset target companies."""
    return list_companies()



@router.get("/roles", response_model=List[str])
async def get_catalog_roles(company: Optional[str] = None):
    """List preset target roles."""
    return list_roles(company)
