import logging
from typing import Any, Dict, List, Optional
import numpy as np
from sentence_transformers import SentenceTransformer
from app.services.skill_taxonomy import fuzzy_match_keywords, normalize_skill
from app.services.learning_resources import build_rule_based_roadmap, get_learning_resources
from app.services.groq_service import parse_job_description
from app.services.job_catalog import get_static_job
from app.services.dsa_service import get_company_dsa_bank

logger = logging.getLogger(__name__)


def calculate_semantic_similarity(
    text1: str, text2: str, embedder: Optional[SentenceTransformer]
) -> float:
    """Compute cosine similarity between two text snippets using sentence embeddings."""
    if not text1 or not text2:
        return 0.0
    if not embedder:
        return 0.5

    try:
        emb1 = embedder.encode(text1[:4000], convert_to_tensor=False)
        emb2 = embedder.encode(text2[:4000], convert_to_tensor=False)
        similarity = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2) + 1e-9)
        return float(np.clip(similarity, 0.0, 1.0))
    except Exception as e:
        logger.warning(f"Semantic similarity error: {e}")
        return 0.0


def analyze_skill_gap(
    resume_skills: List[str],
    resume_text: str,
    target_company: str,
    target_role: str,
    job_description_text: Optional[str] = None,
    embedder: Optional[SentenceTransformer] = None,
) -> Dict[str, Any]:
    """
    Perform deep skill gap analysis between pre-parsed candidate resume and target role.
    Directly consumes parsed resume data without reparsing.
    Includes target company LeetCode / DSA preparation problems from master dataset.
    """
    job_skills_raw: List[str] = []
    fallback_used = "NONE"

    # Step 1: Check static job catalog
    static_job = get_static_job(target_company, target_role)
    if static_job and static_job.get("skills"):
        job_skills_raw = static_job["skills"]
        if not job_description_text:
            job_description_text = static_job.get("description", "")
        fallback_used = "STATIC_CATALOG"

    # Step 2: If JD text is provided, parse requirements with Groq/rules
    if job_description_text and job_description_text.strip():
        parsed_jd = parse_job_description(job_description_text)
        extracted_skills = parsed_jd.get("required_skills", []) + parsed_jd.get("preferred_skills", [])
        if extracted_skills:
            job_skills_raw = list(set(job_skills_raw + extracted_skills))
            fallback_used = "JD_PARSER"

    # Step 3: Generic fallback if skills are still empty
    if not job_skills_raw:
        job_skills_raw = ["python", "javascript", "sql", "git", "rest api", "data structures", "algorithms"]
        fallback_used = "GENERIC_DEFAULTS"

    # Normalize skills
    norm_resume_skills = list(set([normalize_skill(s) for s in resume_skills if s]))
    norm_job_skills = list(set([normalize_skill(s) for s in job_skills_raw if s]))

    # Keyword match using RapidFuzz
    fuzzy_res = fuzzy_match_keywords(norm_resume_skills, norm_job_skills, threshold=80)
    matched_skills = fuzzy_res["matched"]
    missing_skills = fuzzy_res["missing"]

    # Semantic similarity
    compare_text = job_description_text or " ".join(norm_job_skills)
    semantic_sim = calculate_semantic_similarity(resume_text, compare_text, embedder)

    # Compute deterministic match percentage
    rule_score = (len(matched_skills) / len(norm_job_skills)) * 100.0 if norm_job_skills else 0.0
    match_percentage = round((rule_score * 0.6) + (semantic_sim * 100.0 * 0.4), 1)

    if not missing_skills:
        match_percentage = 99.5

    match_percentage = min(100.0, max(0.0, match_percentage))

    # Determine confidence level
    if semantic_sim > 0.7:
        confidence_level = "High"
    elif semantic_sim > 0.45:
        confidence_level = "Medium"
    else:
        confidence_level = "Low"

    # Compute detailed skill gaps hierarchy
    is_senior = any(k in target_role.lower() for k in ["senior", "lead", "staff", "principal", "architect"])
    required_level = 3 if is_senior else 2  # 1: Beginner, 2: Intermediate, 3: Advanced

    skill_gaps = []
    for s in norm_job_skills:
        is_matched = s in matched_skills
        current_lvl = 2 if is_matched else 0
        gap = max(0, required_level - current_lvl)
        skill_gaps.append({
            "skill": s,
            "required_level": required_level,
            "current_level": current_lvl,
            "gap": gap,
            "status": "matched" if is_matched else "missing",
        })

    skill_gaps.sort(key=lambda x: (x["gap"], x["skill"]), reverse=True)

    # Generate personalized learning roadmap and resources
    roadmap = build_rule_based_roadmap(missing_skills, target_role)
    resources = get_learning_resources(missing_skills)

    # Fetch top high-frequency DSA questions for this specific target company from master dataset
    company_dsa_problems = get_company_dsa_bank(target_company, limit=12)

    return {
        "target_company": target_company,
        "target_role": target_role,
        "match_percentage": match_percentage,
        "confidence_score": round(semantic_sim, 2),
        "confidence_level": confidence_level,
        "fallback_used": fallback_used,
        "resume_skills": norm_resume_skills,
        "job_skills": norm_job_skills,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "skill_gaps": skill_gaps,
        "learning_roadmap": roadmap,
        "learning_resources": resources,
        "company_dsa_problems": company_dsa_problems,
    }
