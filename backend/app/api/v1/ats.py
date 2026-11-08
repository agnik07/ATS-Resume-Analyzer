import logging
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from app.api.deps import get_current_user, get_embedder
from app.models.user import User
from app.models.resume import Resume
from app.models.ats_report import ATSReport
from app.schemas.ats import ATSAnalysisResponse, ATSReportListItem, ComponentScores, SkillValidationDetails
from app.services.resume_parser import parse_resume_file
from app.services.groq_service import parse_resume_structure, parse_job_description
from app.services.ats_scorer import (
    calculate_overall_score,
    detect_location_info,
    validate_skills_with_projects,
)
from app.services.feedback_engine import analyze_issues, generate_issues_summary
from app.services.recommendation_engine import generate_recommendations
from app.services.storage_service import upload_resume_file
from app.services.report_service import generate_pdf_report
from app.services.evidence_engine import run_github_evidence_analysis

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ats", tags=["ATS Intelligence"])


@router.post("/upload-and-analyze", response_model=ATSAnalysisResponse)
async def upload_and_analyze_resume(
    file: Optional[UploadFile] = File(None),
    resume_id: Optional[str] = Form(None),
    company: Optional[str] = Form(None),
    company_name: Optional[str] = Form(None),
    role: Optional[str] = Form(None),
    target_role: Optional[str] = Form(None),
    job_description: Optional[str] = Form(None),
    jd_file: Optional[UploadFile] = File(None),
    job_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    embedder: Optional[Any] = Depends(get_embedder),
):
    """
    Career Readiness Unified ATS Evaluation Pipeline:
    1. Parse PDF/DOCX/TXT/MD resume text and annotations or retrieve existing resume document.
    2. Retain target company, role, and job description throughout evaluation.
    3. Extract structural sections (Groq LLM with deterministic rule-based fallback).
    4. Run 100% deterministic 5-pillar ATS scoring algorithm (Formatting 20, Keywords 25,
       Content Quality 25, Skill Validation 15, ATS Parseability 15) + Bonuses & Penalties.
    5. Cross-validate skills using SentenceTransformer embeddings & public GitHub repositories.
    6. Generate diagnostic feedback and prioritized recommendations.
    7. Persist parsed resume structure and ATS report in Supabase for seamless Skill Gap reuse.
    """
    resume_doc = None
    raw_text = ""
    filename = "resume.pdf"
    metadata = {"file_size_bytes": 0, "file_type": "application/pdf"}
    file_bytes = None

    if file is not None and getattr(file, "filename", None):
        try:
            file_bytes = await file.read()
            filename = file.filename or "resume.pdf"
            # 1. File parsing & text extraction
            raw_text, metadata = parse_resume_file(file_bytes, filename)
        except Exception as e:
            logger.error(f"Resume text extraction error: {e}")
            raise HTTPException(status_code=400, detail=f"File parsing error: {str(e)}")
    elif resume_id and resume_id.strip():
        rid = resume_id.strip()
        resume_doc = await Resume.get(rid)
        if not resume_doc:
            raise HTTPException(status_code=404, detail="Selected resume not found.")
        raw_text = resume_doc.raw_text or ""
        filename = resume_doc.filename or "resume.pdf"
        metadata = {
            "file_size_bytes": resume_doc.file_size_bytes or len(raw_text),
            "file_type": resume_doc.file_type or "application/pdf",
        }
    else:
        raise HTTPException(
            status_code=400,
            detail="Either a resume file or an existing resume_id must be provided.",
        )

    # 1b. Process Job Description and Target Context
    target_comp = (company or company_name or "").strip()
    target_r = (role or target_role or "").strip()

    jd_text = ""
    if jd_file and jd_file.filename:
        try:
            jd_bytes = await jd_file.read()
            jd_parsed_text, _ = parse_resume_file(jd_bytes, jd_file.filename)
            if jd_parsed_text.strip():
                jd_text += jd_parsed_text.strip() + "\n"
        except Exception as e:
            logger.warning(f"JD file upload extraction failed: {e}")

    if job_description and job_description.strip():
        jd_text += job_description.strip()

    # If job_id is provided, look up job from catalog / database to fill missing fields
    if job_id and (not target_comp or not target_r or not jd_text):
        try:
            from app.models.job import Job
            from app.models.company import Company
            job_obj = await Job.get(job_id)
            if job_obj:
                if not target_r:
                    target_r = job_obj.title
                if not jd_text:
                    jd_text = job_obj.description
                if not target_comp and job_obj.company_id:
                    comp_obj = await Company.get(job_obj.company_id)
                    if comp_obj:
                        target_comp = comp_obj.name
        except Exception as err:
            logger.warning(f"Job ID lookup warning: {err}")

    jd_text = jd_text.strip()

    # 2. Structural Parsing
    parsed_data = parse_resume_structure(raw_text)
    skills = parsed_data.get("skills", [])
    projects = parsed_data.get("projects", [])
    experience = parsed_data.get("experience", [])
    keywords = parsed_data.get("keywords", [])
    action_verbs = parsed_data.get("action_verbs", [])

    # 3. Location privacy check
    location_results = detect_location_info(raw_text)

    # 4. Project-to-skill validation (Sentence Transformer embeddings)
    skill_val_results = validate_skills_with_projects(
        skills=skills,
        projects=projects,
        experience_entries=experience,
        embedder=embedder,
        raw_resume_text=raw_text,
    )

    # 5. Optional JD keywords & structure parsing
    jd_keywords = None
    parsed_jd = None
    if jd_text:
        parsed_jd = parse_job_description(jd_text)
        jd_keywords = list(set(parsed_jd.get("required_skills", []) + parsed_jd.get("keywords", [])))

    # 6. Multi-dimensional Score Calculation
    score_results = calculate_overall_score(
        text=raw_text,
        parsed_resume=parsed_data,
        skills=skills,
        keywords=keywords,
        action_verbs=action_verbs,
        skill_validation_results=skill_val_results,
        location_results=location_results,
        jd_keywords=jd_keywords,
        parsed_jd=parsed_jd,
    )

    # 7. Diagnostic feedback & recommendations
    detailed_issues = analyze_issues(
        resume_text=raw_text,
        parsed_resume=parsed_data,
        skills=skills,
        projects=projects,
        action_verbs=action_verbs,
        skill_validation=skill_val_results,
        scores=score_results,
        location_results=location_results,
    )
    issues_summary = generate_issues_summary(detailed_issues)
    recommendations = generate_recommendations(score_results, skill_val_results, detailed_issues)

    # Identify strengths
    strengths = []
    if score_results["formatting_score"] >= 16:
        strengths.append("Clear structural section layout and bullet points.")
    if score_results["keywords_score"] >= 20:
        strengths.append("Strong technical keyword and skill coverage.")
    if score_results["content_score"] >= 20:
        strengths.append("High content quality with measurable impact metrics.")
    if score_results["skill_validation_score"] >= 12:
        strengths.append(f"{skill_val_results.get('validation_percentage', 0)*100:.0f}% of listed skills are substantiated by project experience.")
    if not strengths:
        strengths.append("Solid baseline structure ready for targeted metric optimization.")

    # 7b. GitHub Evidence & Development Authenticity Analysis
    github_res = await run_github_evidence_analysis(
        raw_resume_text=raw_text,
        parsed_resume=parsed_data,
        original_ats_score=score_results["overall_score"],
        embedder=embedder,
    )
    gh_evidence_score = github_res.get("github_evidence_score", 0.0) if github_res.get("is_available") else 0.0
    enhanced_ats_score = github_res.get("enhanced_ats_score", score_results["overall_score"]) if github_res.get("is_available") else score_results["overall_score"]

    # 8. Upload file to Cloudinary / storage & persist Resume (if newly uploaded)
    if resume_doc is None:
        file_url = upload_resume_file(file_bytes or b"", filename, str(current_user.id))
        resume_doc = Resume(
            user_id=str(current_user.id),
            filename=filename,
            file_url=file_url,
            file_size_bytes=metadata["file_size_bytes"],
            file_type=metadata["file_type"],
            raw_text=raw_text,
            parsed_data=parsed_data,
            extracted_skills=skills,
            action_verbs=action_verbs,
            keywords=keywords,
        )
        await resume_doc.insert()

    # 10. Save ATS Report Document
    report_doc = ATSReport(
        user_id=str(current_user.id),
        resume_id=str(resume_doc.id),
        filename=filename,
        overall_score=score_results["overall_score"],
        formatting_score=score_results["formatting_score"],
        keywords_score=score_results["keywords_score"],
        content_score=score_results["content_score"],
        skill_validation_score=score_results["skill_validation_score"],
        ats_compatibility_score=score_results["ats_compatibility_score"],
        interpretation=score_results["interpretation"],
        strengths=strengths,
        critical_issues=[i["issue_title"] for i in detailed_issues if i.get("severity_level") == "High"],
        suggestions=[i["how_to_fix"] for i in detailed_issues],
        issues_summary=issues_summary,
        detailed_feedback=detailed_issues,
        recommendations=recommendations,
        skill_validation_details=skill_val_results,
        penalties=score_results["penalties"],
        bonuses=score_results["bonuses"],
        github_evidence_score=gh_evidence_score,
        enhanced_ats_score=enhanced_ats_score,
        github_evidence=github_res,
        target_company=target_comp,
        target_role=target_r,
        job_description=jd_text,
        job_id=job_id,
    )
    await report_doc.insert()

    # Calculate initial JD keyword match percentage if JD keywords provided
    initial_match_pct = None
    if jd_keywords and len(jd_keywords) > 0:
        norm_resume_skills = set(s.lower() for s in skills)
        norm_jd_kws = set(k.lower() for k in jd_keywords)
        matched_cnt = len(norm_resume_skills.intersection(norm_jd_kws))
        initial_match_pct = round((matched_cnt / max(1, len(norm_jd_kws))) * 100.0, 1)

    res_obj = ATSAnalysisResponse(
        id=str(report_doc.id),
        resume_id=str(resume_doc.id),
        filename=filename,
        overall_score=report_doc.overall_score,
        component_scores=ComponentScores(
            formatting=report_doc.formatting_score,
            keywords=report_doc.keywords_score,
            content=report_doc.content_score,
            skill_validation=report_doc.skill_validation_score,
            ats_compatibility=report_doc.ats_compatibility_score,
        ),
        interpretation=report_doc.interpretation,
        strengths=report_doc.strengths,
        critical_issues=report_doc.critical_issues,
        suggestions=report_doc.suggestions,
        issues_summary=report_doc.issues_summary,
        detailed_feedback=report_doc.detailed_feedback,
        recommendations=report_doc.recommendations,
        skill_validation_details=SkillValidationDetails(
            validated=skill_val_results.get("validated_skills", []),
            unvalidated=skill_val_results.get("unvalidated_skills", []),
            total=len(skills),
            validated_count=len(skill_val_results.get("validated_skills", [])),
            validation_pct=skill_val_results.get("validation_percentage", 0.0) * 100.0,
        ),
        extracted_skills=skills,
        github_evidence_score=report_doc.github_evidence_score,
        enhanced_ats_score=report_doc.enhanced_ats_score,
        github_evidence=report_doc.github_evidence,
        target_company=report_doc.target_company,
        target_role=report_doc.target_role,
        job_description=report_doc.job_description,
        job_id=report_doc.job_id,
        skill_gap_report_id=report_doc.skill_gap_report_id,
        match_percentage=initial_match_pct,
        created_at=report_doc.created_at,
    )
    import gc
    gc.collect()
    return res_obj


@router.get("/reports", response_model=List[ATSReportListItem])
async def get_my_ats_reports(current_user: User = Depends(get_current_user)):
    """Retrieve history of user's past ATS evaluations."""
    uid = str(current_user.id)
    reports = await ATSReport.find(user_id=uid).sort(-ATSReport.created_at).to_list()
    return [
        ATSReportListItem(
            id=str(r.id),
            resume_id=str(r.resume_id),
            filename=r.filename,
            overall_score=r.overall_score,
            enhanced_ats_score=r.enhanced_ats_score or r.overall_score,
            target_company=r.target_company,
            target_role=r.target_role,
            interpretation=r.interpretation,
            created_at=r.created_at,
        )
        for r in reports
    ]


@router.get("/reports/{report_id}", response_model=ATSAnalysisResponse)
async def get_ats_report_by_id(report_id: str, current_user: User = Depends(get_current_user)):
    """Get single ATS report details."""
    report = await ATSReport.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="ATS Report not found")

    # Authorize owner or recruiter/admin
    if str(report.user_id) != str(current_user.id) and current_user.role.value not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized to view this report")

    resume_id_str = str(report.resume_id)

    svd = report.skill_validation_details or {}
    val_list = svd.get("validated_skills", [])
    unval_list = svd.get("unvalidated_skills", [])
    total_val = len(val_list) + len(unval_list)

    return ATSAnalysisResponse(
        id=str(report.id),
        resume_id=resume_id_str,
        filename=report.filename,
        overall_score=report.overall_score,
        component_scores=ComponentScores(
            formatting=report.formatting_score,
            keywords=report.keywords_score,
            content=report.content_score,
            skill_validation=report.skill_validation_score,
            ats_compatibility=report.ats_compatibility_score,
        ),
        interpretation=report.interpretation,
        strengths=report.strengths,
        critical_issues=report.critical_issues,
        suggestions=report.suggestions,
        issues_summary=report.issues_summary,
        detailed_feedback=report.detailed_feedback,
        recommendations=report.recommendations,
        skill_validation_details=SkillValidationDetails(
            validated=val_list,
            unvalidated=unval_list,
            total=total_val,
            validated_count=len(val_list),
            validation_pct=svd.get("validation_percentage", 0.0) * 100.0,
        ),
        extracted_skills=[],
        github_evidence_score=report.github_evidence_score or 0.0,
        enhanced_ats_score=report.enhanced_ats_score or report.overall_score,
        github_evidence=report.github_evidence,
        target_company=report.target_company,
        target_role=report.target_role,
        job_description=report.job_description,
        job_id=report.job_id,
        skill_gap_report_id=report.skill_gap_report_id,
        created_at=report.created_at,
    )


@router.get("/reports/{report_id}/export-pdf")
async def export_report_pdf(report_id: str, current_user: User = Depends(get_current_user)):
    """Generate and download a branded PDF report."""
    report = await ATSReport.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    pdf_bytes = generate_pdf_report({
        "candidate_name": current_user.full_name,
        "filename": report.filename,
        "overall_score": report.overall_score,
        "formatting_score": report.formatting_score,
        "keywords_score": report.keywords_score,
        "content_score": report.content_score,
        "skill_validation_score": report.skill_validation_score,
        "ats_compatibility_score": report.ats_compatibility_score,
        "interpretation": report.interpretation,
        "strengths": report.strengths,
        "detailed_feedback": report.detailed_feedback,
    })

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=ATS_Report_{report.filename}.pdf"},
    )
