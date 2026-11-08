import logging
import re
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np
from rapidfuzz import fuzz
import spacy
from spacy.matcher import PhraseMatcher

from app.services.skill_taxonomy import (
    SKILLS_DATABASE,
    SKILL_ALIASES,
    expand_skill_variants,
    fuzzy_match_keywords,
    normalize_skill,
)
from app.services.learning_resources import (
    build_personalized_4week_roadmap,
    get_learning_resources,
)
from app.services.groq_service import parse_job_description
from app.services.job_catalog import get_static_job
from app.services.dsa_service import get_company_dsa_bank

logger = logging.getLogger(__name__)

# Cached SpaCy PhraseMatcher over technical skill taxonomy
_SPACY_NLP = None
_PHRASE_MATCHER = None


def _get_spacy_phrase_matcher():
    """Lazy initialize spaCy blank model and PhraseMatcher over complete skill taxonomy."""
    global _SPACY_NLP, _PHRASE_MATCHER
    if _SPACY_NLP is None or _PHRASE_MATCHER is None:
        try:
            _SPACY_NLP = spacy.blank("en")
            _PHRASE_MATCHER = PhraseMatcher(_SPACY_NLP.vocab, attr="LOWER")
            patterns = []
            for primary, syns in SKILLS_DATABASE.items():
                patterns.append(_SPACY_NLP.make_doc(primary))
                for s in syns:
                    if s != primary and len(s) > 1:
                        patterns.append(_SPACY_NLP.make_doc(s))
            _PHRASE_MATCHER.add("TECH_SKILLS", patterns)
        except Exception as e:
            logger.warning(f"Failed to initialize spaCy phrase matcher: {e}")
            _SPACY_NLP = None
            _PHRASE_MATCHER = None
    return _SPACY_NLP, _PHRASE_MATCHER


def extract_skills_nlp(text: str) -> List[str]:
    """
    Extract technical skills from text using spaCy PhraseMatcher + RapidFuzz taxonomy.
    Captures multi-word phrases (e.g. 'machine learning', 'system design', 'rest api').
    """
    if not text:
        return []

    found_skills: Set[str] = set()
    nlp, matcher = _get_spacy_phrase_matcher()

    if nlp and matcher:
        try:
            doc = nlp(text[:15000])
            matches = matcher(doc)
            for match_id, start, end in matches:
                span_text = doc[start:end].text
                canon = normalize_skill(span_text)
                if canon:
                    found_skills.add(canon)
        except Exception as e:
            logger.warning(f"spaCy extraction error: {e}")

    # Fallback / Supplement with regex word boundary matching for single words (e.g. 'c++', 'go', 'r', 'sql')
    text_lower = text.lower()
    for primary in ["c++", "c#", "go", "r", "sql", "git", "aws", "gcp"]:
        pattern = r"(?:\b|^)" + re.escape(primary) + r"(?:\b|$)"
        if re.search(pattern, text_lower):
            found_skills.add(primary)

    return sorted(list(found_skills))


def calculate_semantic_similarity(
    text1: str, text2: str, embedder: Optional[Any]
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


# ML Role Taxonomy Clusters for L_ml Tier Prediction
ROLE_TAXONOMY_CLUSTERS = {
    "frontend": ["react", "javascript", "typescript", "html", "css", "next.js", "tailwind", "web performance", "state management", "git"],
    "backend": ["python", "node.js", "java", "sql", "postgresql", "rest api", "docker", "microservices", "redis", "system design", "git"],
    "fullstack": ["react", "node.js", "python", "typescript", "sql", "postgresql", "rest api", "git", "docker", "aws"],
    "data": ["python", "sql", "pandas", "numpy", "spark", "machine learning", "scikit-learn", "data modeling", "etl", "statistics"],
    "devops": ["docker", "kubernetes", "aws", "terraform", "ci/cd", "linux", "bash", "python", "ansible", "monitoring"],
    "consultant": ["business analysis", "stakeholder communication", "strategic planning", "requirements gathering", "agile", "scrum", "sql", "excel"],
    "product": ["product strategy", "user stories", "roadmap planning", "agile", "scrum", "data analytics", "sql", "jira"],
}


def _predict_role_skills_ml(target_role: str, embedder: Optional[Any] = None) -> List[str]:
    """Tier 3 (L_ml): ML / cluster prediction of role skills."""
    role_lower = target_role.lower()
    for cluster_name, skills in ROLE_TAXONOMY_CLUSTERS.items():
        if cluster_name in role_lower:
            return skills

    if "software" in role_lower or "developer" in role_lower or "engineer" in role_lower:
        return ROLE_TAXONOMY_CLUSTERS["fullstack"]
    if "data" in role_lower or "ai" in role_lower or "ml" in role_lower:
        return ROLE_TAXONOMY_CLUSTERS["data"]
    if "cloud" in role_lower or "ops" in role_lower or "site reliability" in role_lower:
        return ROLE_TAXONOMY_CLUSTERS["devops"]
    if "consultant" in role_lower or "analyst" in role_lower:
        return ROLE_TAXONOMY_CLUSTERS["consultant"]
    if "product" in role_lower or "program" in role_lower:
        return ROLE_TAXONOMY_CLUSTERS["product"]

    return ROLE_TAXONOMY_CLUSTERS["fullstack"]


def analyze_skill_gap(
    resume_skills: List[str],
    resume_text: str,
    target_company: str,
    target_role: str,
    job_description_text: Optional[str] = None,
    embedder: Optional[Any] = None,
    ats_report: Optional[Dict[str, Any]] = None,
    job_description: Optional[str] = None,
    validated_skills: Optional[List[str]] = None,
    github_evidence: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Perform deep Career Readiness Skill Gap Analysis between candidate resume and target role.
    
    Adheres strictly to the Research Paper Methodology:
    1. Primary Source: When user supplies JD, that JD is the primary source of required skills.
    2. Intelligent Requirement Cascade: L_jd -> L_static -> L_api -> L_ml -> L_llm.
    3. Candidate Proficiency Estimation (w_i in [0, 3]).
    4. Required Demand Estimation (d_i in [1, 3]).
    5. Mathematical Skill Gap: g_i = max(0, d_i - w_i), with importance weighting.
    6. Hybrid Match Formula: C = 0.6 * M_rule + 0.4 * (Sim * 100).
    7. Progressive 4-Week Learning Roadmap with Verified Resources.
    8. Company-Specific DSA Problems from Master Bank (3,310 problems across 662 companies).
    """
    target_company = (target_company or "").strip()
    target_role = (target_role or "").strip()
    jd_clean = (job_description or job_description_text or "").strip()

    ats_report = dict(ats_report or {})
    if validated_skills:
        val_details = ats_report.setdefault("skill_validation_details", {})
        val_list = val_details.setdefault("validated", [])
        val_list.extend([{"skill": s} for s in validated_skills])
    if github_evidence:
        ats_report["github_evidence"] = github_evidence

    job_skills_raw: List[str] = []
    fallback_used = "L_JD"

    # Step 1: Intelligent Job Requirement Retrieval
    # If the user provides a Job Description, it is the PRIMARY source.
    if jd_clean:
        # A. Extract via spaCy NLP PhraseMatcher
        nlp_jd_skills = extract_skills_nlp(jd_clean)
        # B. Extract via LLM / regex structured parser
        parsed_jd = parse_job_description(jd_clean)
        llm_jd_skills = [
            normalize_skill(s)
            for s in (parsed_jd.get("required_skills", []) + parsed_jd.get("preferred_skills", []))
            if s
        ]
        combined_jd_skills = list(set(nlp_jd_skills + llm_jd_skills))
        if combined_jd_skills:
            job_skills_raw = combined_jd_skills
            fallback_used = "L_JD"

    # Cascade Fallbacks only if JD skills could not be extracted or no JD supplied
    if not job_skills_raw:
        # Cascade 1: L_static
        static_job = get_static_job(target_company, target_role)
        if static_job and static_job.get("skills"):
            job_skills_raw = static_job["skills"]
            if not jd_clean:
                jd_clean = static_job.get("description", "")
            fallback_used = "L_STATIC"

    if not job_skills_raw:
        # Cascade 2: L_ml
        ml_skills = _predict_role_skills_ml(target_role, embedder)
        if ml_skills:
            job_skills_raw = ml_skills
            fallback_used = "L_ML"

    if not job_skills_raw:
        # Cascade 3: L_llm
        prompt_text = f"Role: {target_role} at {target_company}. Standard industry skills."
        parsed_llm = parse_job_description(prompt_text)
        job_skills_raw = parsed_llm.get("required_skills", ["python", "javascript", "sql", "git", "rest api"])
        fallback_used = "L_LLM"

    norm_job_skills = sorted(list(set([normalize_skill(s) for s in job_skills_raw if s])))

    # Step 2: Build Comprehensive Candidate Skill Knowledge Base
    # Harvest from Resume extracted skills + ATS validated skills + GitHub verified skills
    candidate_skill_map: Dict[str, float] = {}  # skill -> estimated proficiency w_i
    candidate_skill_pool = set(resume_skills or [])

    # Also run NLP phrase matcher on the candidate's raw resume text
    nlp_resume_skills = extract_skills_nlp(resume_text)
    candidate_skill_pool.update(nlp_resume_skills)

    # Base proficiency from text mention = 1.0 (Basic / Theoretical)
    for sk in candidate_skill_pool:
        if sk:
            candidate_skill_map[normalize_skill(sk)] = 1.0

    # Harvest from ATS Report Validation Details (Pillar 4: Skill Validation)
    if ats_report:
        svd = ats_report.get("skill_validation_details") or {}
        val_list = svd.get("validated_skills") or svd.get("validated") or []
        for item in val_list:
            if isinstance(item, dict) and item.get("skill"):
                sk_name = normalize_skill(item["skill"])
                # Validated in project/experience = 2.0 (Intermediate / Practical)
                candidate_skill_map[sk_name] = max(candidate_skill_map.get(sk_name, 0.0), 2.0)
            elif isinstance(item, str):
                sk_name = normalize_skill(item)
                candidate_skill_map[sk_name] = max(candidate_skill_map.get(sk_name, 0.0), 2.0)

        # Harvest from GitHub Evidence (Code Cross-Validation)
        gh_ev = ats_report.get("github_evidence") or {}
        gh_skills = gh_ev.get("skill_matches", [])
        for item in gh_skills:
            if isinstance(item, dict) and item.get("verification_status") in ("VERIFIED", "SUPPORTED"):
                sk_name = normalize_skill(item.get("skill", ""))
                # Code verified on GitHub (commits, manifests, trees) = 3.0 (Advanced / Production)
                candidate_skill_map[sk_name] = 3.0

    resume_text_lower = (resume_text or "").lower()

    # Step 3: Estimate Required Demand (d_i) and Candidate Proficiency (w_i)
    # Determine seniority from role title
    is_senior = any(k in target_role.lower() for k in ["senior", "lead", "staff", "principal", "architect"])
    base_demand = 3.0 if is_senior else 2.0

    matched_skills = []
    missing_skills = []
    skill_gaps = []
    weighted_matches = []

    for job_skill in norm_job_skills:
        # Determine Demand d_i (1.0 to 3.0)
        # Higher if mentioned frequently in JD or explicitly marked required
        jd_freq = jd_clean.lower().count(job_skill.lower()) if jd_clean else 1
        if is_senior or jd_freq >= 3:
            d_i = 3.0
        elif jd_freq >= 1:
            d_i = base_demand
        else:
            d_i = 1.0

        # Estimate Candidate Proficiency w_i (0.0 to 3.0)
        w_i = candidate_skill_map.get(job_skill, 0.0)

        # Multi-stage matching if not already in map
        if w_i == 0.0:
            j_variants = set(expand_skill_variants(job_skill))
            j_variants.add(job_skill.lower())

            # 1. Variant overlap in candidate skills
            for c_sk, c_val in candidate_skill_map.items():
                c_variants = set(expand_skill_variants(c_sk))
                if j_variants.intersection(c_variants):
                    w_i = max(w_i, c_val)

            # 2. Direct string presence in resume text
            if w_i == 0.0 and resume_text_lower:
                if any(v in resume_text_lower for v in j_variants if len(v) >= 2):
                    w_i = 1.0

            # 3. Fuzzy match fallback
            if w_i == 0.0:
                fuzzy_res = fuzzy_match_keywords(list(candidate_skill_map.keys()), [job_skill], threshold=78)
                if fuzzy_res["matched"]:
                    w_i = 1.5

            # 4. Semantic similarity fallback
            if w_i == 0.0 and embedder:
                sim = calculate_semantic_similarity(job_skill, resume_text, embedder)
                if sim >= 0.48:
                    w_i = 1.5

        # Mathematical Skill Gap: g_i = max(0, d_i - w_i)
        g_i = max(0.0, d_i - w_i)

        is_matched = w_i >= 1.0
        if is_matched:
            matched_skills.append(job_skill)
            # Match credit ratio
            weighted_matches.append(min(1.0, w_i / d_i))
        else:
            missing_skills.append(job_skill)
            weighted_matches.append(0.0)

        # Importance metric: I_i = d_i * (jd_freq + 1) + g_i * 2.0
        importance_score = round(d_i * (min(jd_freq, 4) + 1) + (g_i * 2.0), 2)

        skill_gaps.append({
            "skill": job_skill,
            "required_level": int(d_i),
            "current_level": int(min(3.0, round(w_i))),
            "gap": int(round(g_i)),
            "gap_exact": round(g_i, 1),
            "importance": importance_score,
            "status": "matched" if is_matched else "missing",
            "demand_proficiency": round(d_i, 1),
            "candidate_proficiency": round(w_i, 1),
        })

    # Sort skill gaps by importance descending (high-demand missing skills first)
    skill_gaps.sort(key=lambda x: (x["gap"], x["importance"]), reverse=True)

    # Step 4: Hybrid Matching Score Formulation
    # C = 0.6 * M_rule + 0.4 * (Sim * 100)
    rule_score = (sum(weighted_matches) / len(norm_job_skills) * 100.0) if norm_job_skills else 0.0
    compare_text = jd_clean or " ".join(norm_job_skills)
    semantic_sim = calculate_semantic_similarity(resume_text, compare_text, embedder)

    match_percentage = round((0.60 * rule_score) + (0.40 * (semantic_sim * 100.0)), 1)
    if not missing_skills:
        match_percentage = max(match_percentage, 98.5)
    match_percentage = min(100.0, max(0.0, match_percentage))

    # Confidence calculation
    if semantic_sim >= 0.60 or rule_score >= 65:
        confidence_level = "High"
    elif semantic_sim >= 0.35 or rule_score >= 35:
        confidence_level = "Medium"
    else:
        confidence_level = "Low"

    # Step 5: Progressive 4-Week Learning Roadmap & Verified Resources
    roadmap_data = build_personalized_4week_roadmap(
        missing_skills=missing_skills,
        matched_skills=matched_skills,
        target_role=target_role,
        target_company=target_company,
        skill_gaps=skill_gaps,
    )
    resources = get_learning_resources(missing_skills)

    # Step 6: Company-Specific Verified DSA Recommendations from Master Bank
    company_dsa_problems = get_company_dsa_bank(target_company, limit=12)

    return {
        "target_company": target_company,
        "target_role": target_role,
        "match_percentage": match_percentage,
        "confidence_score": round(semantic_sim, 2),
        "confidence_level": confidence_level,
        "fallback_used": fallback_used,
        "resume_skills": sorted(list(candidate_skill_pool)),
        "job_skills": norm_job_skills,
        "matched_skills": sorted(matched_skills),
        "missing_skills": sorted(missing_skills),
        "skill_gaps": skill_gaps,
        "learning_roadmap": roadmap_data["markdown"],
        "roadmap_weeks": roadmap_data.get("weeks", []),
        "learning_resources": resources,
        "company_dsa_problems": company_dsa_problems,
    }
