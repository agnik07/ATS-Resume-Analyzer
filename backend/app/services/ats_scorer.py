import re
import logging
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from app.services.skill_taxonomy import fuzzy_match_keywords, normalize_skill

logger = logging.getLogger(__name__)

ZIP_CODE_PATTERN = r"\b\d{5}(?:-\d{4})?\b"
STREET_ADDRESS_PATTERN = (
    r"\b\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+"
    r"(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way|Place|Pl)\b"
)


def _tier_score(n: float, tiers: List[Tuple[float, float]]) -> float:
    """Return points based on decreasing threshold tiers."""
    for threshold, pts in tiers:
        if n >= threshold:
            return pts
    return 0.0


def detect_location_info(text: str) -> Dict[str, Any]:
    """Detect potential privacy risks such as street addresses and zip codes."""
    locations = []

    for match in re.finditer(STREET_ADDRESS_PATTERN, text, re.IGNORECASE):
        locations.append({"text": match.group(), "type": "address", "start": match.start()})

    for match in re.finditer(ZIP_CODE_PATTERN, text):
        locations.append({"text": match.group(), "type": "zip", "start": match.start()})

    has_address = any(loc["type"] == "address" for loc in locations)
    has_zip = any(loc["type"] == "zip" for loc in locations)

    if has_address and has_zip:
        privacy_risk, penalty = "high", 4.0
    elif has_address or has_zip:
        privacy_risk, penalty = "medium", 2.0
    else:
        privacy_risk, penalty = "none", 0.0

    recommendations = []
    if has_address:
        recommendations.append("Remove full street addresses — 'City, State' is sufficient and protects your privacy.")
    if has_zip:
        recommendations.append("Remove zip codes to streamline your contact header.")

    return {
        "location_found": len(locations) > 0,
        "detected_locations": locations,
        "privacy_risk": privacy_risk,
        "recommendations": recommendations,
        "penalty_applied": penalty,
    }


def _calculate_semantic_similarity(skill: str, text: str, embedder: Optional[Any]) -> float:
    """Compute cosine similarity between skill and project/experience text."""
    if not skill or not text:
        return 0.0
    if not embedder:
        return 1.0 if skill.lower() in text.lower() else 0.0

    try:
        skill_vec = embedder.encode(skill, convert_to_tensor=False)
        text_vec = embedder.encode(text[:1500], convert_to_tensor=False)
        sim = np.dot(skill_vec, text_vec) / (
            np.linalg.norm(skill_vec) * np.linalg.norm(text_vec) + 1e-9
        )
        return float(max(0.0, min(1.0, sim)))
    except Exception as e:
        logger.warning(f"Similarity error for '{skill}': {e}")
        return 0.0


def validate_skills_with_projects(
    skills: List[str],
    projects: List[Dict],
    experience_entries: List[Dict],
    embedder: Optional[Any],
    threshold: float = 0.55,
) -> Dict[str, Any]:
    """
    Deterministically validate claimed skills against project descriptions and work history.
    """
    if not skills:
        return {
            "validated_skills": [],
            "unvalidated_skills": [],
            "validation_percentage": 0.0,
            "skill_project_mapping": {},
            "validation_score": 0.0,
        }

    exp_text = " ".join(
        f"{e.get('job_title', '')} {e.get('company', '')} {e.get('description', '')}"
        for e in experience_entries
        if isinstance(e, dict)
    ).strip()

    validated_skills = []
    unvalidated_skills = []
    skill_project_mapping = {}

    for raw_skill in skills:
        skill = normalize_skill(raw_skill)
        matching_projects = []
        max_similarity = 0.0

        skill_lower = skill.lower()

        # Build list of search variants for skill (e.g., node.js -> node, js -> javascript, etl -> etl pipeline)
        search_variants = {skill_lower, raw_skill.lower()}
        if skill_lower in {"node.js", "nodejs"}:
            search_variants.update({"node.js", "node", "express"})
        elif skill_lower in {"react", "react.js"}:
            search_variants.update({"react", "react.js", "reactjs"})
        elif skill_lower in {"fastapi"}:
            search_variants.update({"fastapi", "fast api"})
        elif skill_lower in {"oop", "object-oriented programming"}:
            search_variants.update({"oop", "object-oriented", "object oriented"})
        elif skill_lower in {"nlp", "natural language processing"}:
            search_variants.update({"nlp", "natural language", "llm", "llms"})
        elif skill_lower in {"etl"}:
            search_variants.update({"etl", "data migration", "pipeline", "pipelines"})
        elif skill_lower in {"dsa", "data structures", "algorithms"}:
            search_variants.update({"data structures", "algorithms", "dsa", "leetcode"})

        # Check projects
        for proj in projects:
            if not isinstance(proj, dict):
                continue
            proj_title = proj.get("title", "Project")
            proj_desc = f"{proj.get('title', '')} {proj.get('description', '')} {' '.join(proj.get('technologies', []))}".lower()

            if any(v in proj_desc for v in search_variants):
                matching_projects.append(proj_title)
                max_similarity = 1.0
            elif embedder:
                sim = _calculate_semantic_similarity(skill, proj_desc, embedder)
                if sim >= threshold:
                    matching_projects.append(proj_title)
                    max_similarity = max(max_similarity, sim)

        # Check experience
        if exp_text:
            exp_text_lower = exp_text.lower()
            if any(v in exp_text_lower for v in search_variants):
                if "Work Experience" not in matching_projects:
                    matching_projects.append("Work Experience")
                max_similarity = max(max_similarity, 1.0)
            elif embedder:
                sim = _calculate_semantic_similarity(skill, exp_text, embedder)
                if sim >= threshold:
                    if "Work Experience" not in matching_projects:
                        matching_projects.append("Work Experience")
                    max_similarity = max(max_similarity, sim)

        if matching_projects:
            validated_skills.append({
                "skill": skill,
                "projects": matching_projects,
                "similarity": round(max_similarity, 2),
            })
            skill_project_mapping[skill] = matching_projects
        else:
            unvalidated_skills.append(skill)
            skill_project_mapping[skill] = []

    validation_percentage = len(validated_skills) / len(skills) if skills else 0.0
    validation_score = validation_percentage * 15.0

    return {
        "validated_skills": validated_skills,
        "unvalidated_skills": unvalidated_skills,
        "validation_percentage": round(validation_percentage, 2),
        "skill_project_mapping": skill_project_mapping,
        "validation_score": round(validation_score, 1),
    }


def _calc_formatting_score(parsed_resume: Dict, text: str) -> float:
    """Calculate formatting score (max 20 pts)."""
    score = 0.0
    exp = [e for e in parsed_resume.get("experience", []) if isinstance(e, dict)]
    edu = [e for e in parsed_resume.get("education", []) if isinstance(e, dict)]
    skills = parsed_resume.get("skills", [])
    summary = parsed_resume.get("professional_summary", "")
    projects = [p for p in parsed_resume.get("projects", []) if isinstance(p, dict)]

    if exp and any(e.get("job_title") or e.get("description") for e in exp):
        score += 3.5
    if edu:
        score += 2.5
    if len(skills) >= 3:
        score += 2.5
    if len(summary) > 20:
        score += 2.0
    if projects:
        score += 2.5

    # Bullet point structure
    bullet_count = sum(
        1 for line in text.split("\n")
        if re.match(r"^\s*[•\-\*\◦\u2022\u25cf]", line) or re.match(r"^\s*\d+\.", line)
    )
    score += _tier_score(bullet_count, [(12, 4.0), (8, 3.0), (4, 2.0), (1, 1.0)])

    # Section completeness
    filled_sections = sum(1 for has in [bool(exp), bool(edu), bool(skills), bool(summary.strip()), bool(projects)] if has)
    score += _tier_score(filled_sections, [(4, 3.0), (3, 2.0), (2, 1.0)])

    return min(20.0, max(0.0, score))


def _calc_keywords_score(
    resume_keywords: List[str],
    skills: List[str],
    jd_keywords: Optional[List[str]] = None,
) -> float:
    """Calculate keyword density and relevance score (max 25 pts)."""
    score = 0.0
    score += _tier_score(len(resume_keywords), [(20, 10.0), (15, 8.0), (10, 6.0), (5, 4.0), (2, 2.0)])
    score += _tier_score(len(skills), [(15, 10.0), (10, 8.0), (6, 6.0), (4, 4.0), (2, 2.0)])

    if jd_keywords and len(jd_keywords) > 0:
        all_terms = list(set(resume_keywords + skills))
        res = fuzzy_match_keywords(all_terms, jd_keywords, threshold=80)
        match_ratio = len(res["matched"]) / len(jd_keywords)
        score += _tier_score(match_ratio, [(0.7, 5.0), (0.5, 4.0), (0.3, 3.0), (0.1, 1.5)])
    elif len(resume_keywords) >= 8:
        score += 5.0

    return min(25.0, max(0.0, score))


def _calc_content_score(text: str, action_verbs: List[str]) -> float:
    """Calculate content quality score based on action verbs and quantifiable metrics (max 25 pts)."""
    score = 0.0

    # Action verbs score (max 12 pts)
    score += _tier_score(len(action_verbs), [(12, 12.0), (8, 10.0), (5, 7.0), (3, 4.0), (1, 2.0)])

    # Metric & number indicators (max 13 pts)
    number_patterns = [
        r"\d+%",
        r"\$\d+",
        r"\d+[kKmMbB]",
        r"\d+\s*(?:users|customers|clients|projects|hours|days|months|years|req/s|rps|tps)",
        r"(?:increased|decreased|improved|reduced|grew|saved|scaled|optimized)\s+(?:by\s+)?\d+",
    ]
    achievement_count = sum(len(re.findall(p, text, re.IGNORECASE)) for p in number_patterns)
    score += _tier_score(achievement_count, [(8, 13.0), (5, 10.0), (3, 7.0), (1, 4.0)])

    return min(25.0, max(0.0, score))


def _calc_ats_compatibility_score(
    text: str,
    location_results: Dict[str, Any],
    parsed_resume: Dict[str, Any],
) -> float:
    """Calculate ATS system parseability score (max 15 pts)."""
    score = 15.0

    # Penalty for location privacy leaks
    score -= location_results.get("penalty_applied", 0.0)

    # Penalty for complex table box-drawing characters
    special_chars = len(re.findall(r"[│┤├┼┴┬╔╗╚╝═║╠╣╦╩╬]", text))
    if special_chars > 20:
        score -= 2.0
    elif special_chars > 10:
        score -= 1.0

    exp = [e for e in parsed_resume.get("experience", []) if isinstance(e, dict)]
    edu = [e for e in parsed_resume.get("education", []) if isinstance(e, dict)]
    skills_count = len(parsed_resume.get("skills", []))

    exp_desc_len = sum(len(e.get("description", "")) for e in exp)
    if exp and exp_desc_len < 30:
        score -= 1.5
    if skills_count < 2:
        score -= 1.5

    return min(15.0, max(0.0, score))


def calculate_overall_score(
    text: str,
    parsed_resume: Dict[str, Any],
    skills: List[str],
    keywords: List[str],
    action_verbs: List[str],
    skill_validation_results: Dict[str, Any],
    location_results: Dict[str, Any],
    jd_keywords: Optional[List[str]] = None,
    parsed_jd: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Multi-dimensional Deterministic ATS Score Calculation with skill evidence points,
    negative unverified skill penalties, publication/certification bonuses, experience matching,
    and non-tech/consultant role sensitivity.
    """
    role_type = (parsed_jd.get("role_type") if parsed_jd else "tech") or "tech"
    is_non_tech = role_type in ("consultant", "non-tech")

    formatting_score = _calc_formatting_score(parsed_resume, text)
    keywords_score = _calc_keywords_score(keywords, skills, jd_keywords)
    content_score = _calc_content_score(text, action_verbs)
    skill_validation_score = skill_validation_results.get("validation_score", 0.0)
    ats_compatibility_score = _calc_ats_compatibility_score(text, location_results, parsed_resume)

    # Base score sum
    raw_sum = (
        formatting_score
        + keywords_score
        + content_score
        + skill_validation_score
        + ats_compatibility_score
    )

    bonuses: Dict[str, float] = {}
    penalties: Dict[str, float] = {}

    # 1. Verified Skills Points (+) & Unverified Skills Penalties (-)
    validated_skills = skill_validation_results.get("validated_skills", [])
    unvalidated_skills = skill_validation_results.get("unvalidated_skills", [])

    if len(validated_skills) > 0:
        v_pts = min(8.0, len(validated_skills) * 1.2)
        bonuses["verified_skills_evidence"] = round(v_pts, 1)
        raw_sum += v_pts

    if len(unvalidated_skills) > 0 and not is_non_tech:
        u_pen = min(6.0, len(unvalidated_skills) * 1.0)
        penalties["unverified_skills_penalty"] = round(u_pen, 1)
        raw_sum -= u_pen

    # 2. Genuine Experience & Internship JD Match
    experience_entries = [e for e in parsed_resume.get("experience", []) if isinstance(e, dict)]
    exp_text = " ".join(f"{e.get('job_title', '')} {e.get('description', '')}" for e in experience_entries).lower()

    if jd_keywords and len(jd_keywords) > 0 and exp_text:
        matched_exp_keywords = [k for k in jd_keywords if k.lower() in exp_text]
        exp_match_ratio = len(matched_exp_keywords) / len(jd_keywords)
        if exp_match_ratio >= 0.35:
            e_pts = 5.0 if is_non_tech else 3.5
            bonuses["genuine_jd_experience_match"] = round(e_pts, 1)
            raw_sum += e_pts
        elif exp_match_ratio < 0.15:
            penalties["low_experience_jd_relevance"] = 2.5
            raw_sum -= 2.5
    elif not experience_entries and is_non_tech:
        penalties["missing_relevant_work_experience"] = 5.0
        raw_sum -= 5.0

    # 3. Publications & Certifications Bonus
    publications = parsed_resume.get("publications", [])
    certifications = parsed_resume.get("certifications", [])

    if len(publications) > 0:
        pub_pts = min(5.0, len(publications) * 2.5)
        bonuses["publications_and_research"] = round(pub_pts, 1)
        raw_sum += pub_pts

    if len(certifications) > 0:
        req_certs = [c.lower() for c in parsed_jd.get("required_certifications", [])] if parsed_jd else []
        matched_certs = [c for c in certifications if any(rc in str(c).lower() for rc in req_certs)] if req_certs else certifications
        cert_pts = min(5.0, len(matched_certs) * 2.5 if req_certs else len(certifications) * 1.5)
        bonuses["relevant_certifications"] = round(cert_pts, 1)
        raw_sum += cert_pts

    # 4. JD Keywords Missing Penalty
    if jd_keywords and len(jd_keywords) > 0:
        all_terms = list(set((keywords or []) + (skills or [])))
        res = fuzzy_match_keywords(all_terms, jd_keywords, threshold=80)
        missing_ratio = len(res["missing"]) / len(jd_keywords)
        if missing_ratio > 0.6:
            penalties["high_missing_jd_keywords"] = 4.0
            raw_sum -= 4.0

    overall_score = min(100.0, max(0.0, raw_sum))
    interpretation = _generate_interpretation(overall_score, role_type)

    return {
        "overall_score": round(overall_score, 1),
        "formatting_score": round(formatting_score, 1),
        "keywords_score": round(keywords_score, 1),
        "content_score": round(content_score, 1),
        "skill_validation_score": round(skill_validation_score, 1),
        "ats_compatibility_score": round(ats_compatibility_score, 1),
        "role_type": role_type,
        "interpretation": interpretation,
        "penalties": penalties,
        "bonuses": bonuses,
        "validated_skills_count": len(validated_skills),
        "unvalidated_skills_count": len(unvalidated_skills),
        "publications_count": len(publications),
        "certifications_count": len(certifications),
    }


def _generate_interpretation(score: float, role_type: str = "tech") -> str:
    role_suffix = " (Consultant / Management Profile)" if role_type in ("consultant", "non-tech") else ""
    if score >= 88:
        return f"Excellent! Your resume is highly optimized to pass through top-tier enterprise ATS filters{role_suffix}."
    elif score >= 75:
        return f"Great! Your resume demonstrates strong ATS compatibility with minor room for optimization{role_suffix}."
    elif score >= 60:
        return f"Good. Your resume has solid foundations but needs keyword and project evidence improvements{role_suffix}."
    elif score >= 45:
        return f"Fair. Moderate ATS risk detected. Incorporate measurable achievements and validate claimed skills{role_suffix}."
    else:
        return f"Needs Work. Critical formatting and content issues may cause automatic ATS rejection{role_suffix}."
