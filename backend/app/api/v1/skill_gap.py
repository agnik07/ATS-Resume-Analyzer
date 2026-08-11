from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sentence_transformers import SentenceTransformer
from app.api.deps import get_current_user, get_embedder
from app.models.user import User
from app.models.resume import Resume
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
    embedder: Optional[SentenceTransformer] = Depends(get_embedder),
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

    # 2. Run consolidated Skill Gap Engine
    result = analyze_skill_gap(
        resume_skills=resume.extracted_skills or resume.parsed_data.get("skills", []),
        resume_text=resume.raw_text,
        target_company=req.company.strip(),
        target_role=req.role.strip(),
        job_description_text=req.job_description,
        embedder=embedder,
    )

    # 3. Save report to Supabase
    report_doc = SkillGapReport(
        user_id=uid,
        resume_id=str(resume.id),
        target_company=result["target_company"],
        target_role=result["target_role"],
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

    return SkillGapResponse(
        id=str(report_doc.id),
        resume_id=str(report_doc.resume_id),
        target_company=report_doc.target_company,
        target_role=report_doc.target_role,
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
            target_company=r.target_company,
            target_role=r.target_role,
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
        target_company=report.target_company,
        target_role=report.target_role,
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


@router.get("/companies", response_model=List[str])
async def get_catalog_companies():
    """List preset target companies."""
    return list_companies()


@router.get("/roles", response_model=List[str])
async def get_catalog_roles(company: Optional[str] = None):
    """List preset target roles."""
    return list_roles(company)
