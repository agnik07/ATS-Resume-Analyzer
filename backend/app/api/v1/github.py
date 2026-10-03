import logging
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.api.deps import get_current_user, get_embedder
from app.models.user import User
from app.models.resume import Resume
from app.models.ats_report import ATSReport
from app.schemas.github import GitHubAnalysisRequest, GitHubEvidenceResponse
from app.services.evidence_engine import run_github_evidence_analysis

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/github", tags=["GitHub Evidence & Authenticity"])


@router.post("/analyze", response_model=GitHubEvidenceResponse)
async def analyze_github_evidence(
    req: GitHubAnalysisRequest,
    current_user: User = Depends(get_current_user),
    embedder: Optional[Any] = Depends(get_embedder),
):
    """
    Trigger standalone GitHub Evidence & Development Authenticity Analysis
    for a given GitHub username or resume ID.
    """
    resume_doc = None
    original_score = 75.0
    parsed_data = {}
    raw_text = ""

    if req.resume_id:
        resume_doc = await Resume.get(req.resume_id)
        if resume_doc:
            parsed_data = resume_doc.parsed_data or {}
            raw_text = resume_doc.raw_text or ""
            latest_report = await ATSReport.find(ATSReport.resume_id == str(resume_doc.id)).sort(-ATSReport.created_at).first_or_none()
            if latest_report:
                original_score = latest_report.overall_score

    analysis_res = await run_github_evidence_analysis(
        raw_resume_text=raw_text,
        parsed_resume=parsed_data,
        original_ats_score=original_score,
        embedder=embedder,
        custom_github_username=req.username,
    )

    if not analysis_res.get("is_available"):
        return GitHubEvidenceResponse(
            is_available=False,
            status_message=analysis_res.get("status_message", "GitHub Evidence unavailable."),
        )

    return GitHubEvidenceResponse(**analysis_res)


@router.get("/evidence/{report_id}", response_model=GitHubEvidenceResponse)
async def get_github_report_evidence(
    report_id: str,
    current_user: User = Depends(get_current_user),
):
    """Retrieve GitHub evidence & authenticity details for a specific ATS report."""
    report = await ATSReport.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="ATS Report not found")

    if str(report.user_id) != str(current_user.id) and current_user.role.value not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized to view this report")

    gh_data = report.github_evidence or {}
    if not gh_data or not gh_data.get("is_available"):
        return GitHubEvidenceResponse(
            is_available=False,
            status_message="No GitHub evidence associated with this ATS report.",
        )

    return GitHubEvidenceResponse(**gh_data)
