import re
import logging
from typing import Any, Dict, List, Optional, Tuple
from rapidfuzz import fuzz
import numpy as np

logger = logging.getLogger(__name__)


def _extract_core_title(title: str) -> str:
    """Extract primary project title before delimiters like –, —, -, :, |."""
    if not title:
        return ""
    for sep in ["–", "—", "-", ":", "|"]:
        if sep in title:
            return title.split(sep)[0].strip()
    return title.strip()


def _clean_alphanumeric(text: str) -> str:
    """Strip all non-alphanumeric characters and lowercase."""
    if not text:
        return ""
    return re.sub(r"[^\w]", "", text.lower())


def _normalize_name(name: str) -> str:
    """Normalize string by lowercasing, stripping punctuation, hyphens, underscores, and extra spaces."""
    if not name:
        return ""
    clean = re.sub(r"[^\w\s]", " ", name.lower())
    clean = re.sub(r"\b(app|platform|saas|project|full|stack|system|ai|real|time)\b", " ", clean)
    return " ".join(clean.split())


def _calculate_cosine_sim(text1: str, text2: str, embedder: Optional[Any]) -> float:
    if not text1 or not text2:
        return 0.0
    if not embedder:
        return fuzz.token_set_ratio(text1[:500], text2[:500]) / 100.0

    try:
        vec1 = embedder.encode(text1[:1000], convert_to_tensor=False)
        vec2 = embedder.encode(text2[:1000], convert_to_tensor=False)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        sim = float(np.dot(vec1, vec2) / (norm1 * norm2))
        return max(0.0, min(1.0, sim))
    except Exception as e:
        logger.warning(f"Cosine similarity error: {e}")
        return fuzz.token_set_ratio(text1[:500], text2[:500]) / 100.0


def match_project_to_repositories(
    resume_project: Dict[str, Any],
    candidate_repos: List[Dict[str, Any]],
    embedder: Optional[Any] = None,
) -> List[Tuple[Dict[str, Any], float, str]]:
    """
    Match candidate repositories with strict priority enforcement:
    Priority 1: Explicit GitHub URL match
    Priority 2: Exact or Core Name match (normalized alphanumeric)
    Priority 3: Fuzzy name & token set match
    Priority 4: Semantic description / README match
    Priority 5: Technology overlap match
    """
    p_name = (resume_project.get("title") or resume_project.get("name") or "").strip()
    p_desc = (resume_project.get("description") or "").strip()
    p_url = resume_project.get("github_url") or ""
    p_techs = [t.lower() for t in resume_project.get("technologies", []) if t]

    core_title = _extract_core_title(p_name)
    core_alpha = _clean_alphanumeric(core_title)
    full_alpha = _clean_alphanumeric(p_name)
    norm_p_name = _normalize_name(p_name)

    ranked = []
    for repo in candidate_repos:
        r_name = repo.get("name", "")
        r_url = repo.get("url", "")
        r_desc = (repo.get("description") or "").strip()
        r_lang = (repo.get("language") or "").lower()
        r_topics = [t.lower() for t in repo.get("topics", [])]

        r_alpha = _clean_alphanumeric(r_name)
        norm_r_name = _normalize_name(r_name)

        # Priority 1: Explicit URL Match
        if p_url and r_url and (p_url.lower().rstrip("/") == r_url.lower().rstrip("/") or r_name.lower() in p_url.lower()):
            ranked.append((repo, 100.0, "EXPLICIT_URL"))
            continue

        # Priority 2: Exact Name or Core Name Alphanumeric Match
        if (
            p_name.lower() == r_name.lower()
            or core_title.lower() == r_name.lower()
            or (core_alpha and core_alpha == r_alpha)
            or (full_alpha and full_alpha == r_alpha)
        ):
            ranked.append((repo, 98.0, "EXACT_NAME"))
            continue

        if core_alpha and r_alpha and (core_alpha in r_alpha or r_alpha in core_alpha) and len(r_alpha) >= 4:
            ranked.append((repo, 95.0, "EXACT_NAME"))
            continue

        # Priority 3: Fuzzy Name Match
        name_sim = max(
            fuzz.ratio(p_name.lower(), r_name.lower()),
            fuzz.partial_ratio(p_name.lower(), r_name.lower()),
            fuzz.token_set_ratio(p_name.lower(), r_name.lower()),
            fuzz.token_set_ratio(core_title.lower(), r_name.lower()),
            fuzz.token_set_ratio(norm_p_name, norm_r_name),
        )

        # Priority 4: Description Similarity
        desc_sim = _calculate_cosine_sim(p_desc, r_desc, embedder) * 100.0 if p_desc and r_desc else 0.0

        # Priority 5: Tech Overlap
        matched_techs = sum(1 for t in p_techs if t in r_name.lower() or t in r_desc.lower() or t == r_lang or t in r_topics)
        tech_score = (matched_techs / len(p_techs) * 100.0) if p_techs else 0.0

        composite_score = (name_sim * 0.45) + (desc_sim * 0.30) + (tech_score * 0.25)

        if name_sim >= 60:
            ranked.append((repo, composite_score, "FUZZY_NAME"))
        elif composite_score >= 35:
            ranked.append((repo, composite_score, "SEMANTIC_OR_TECH"))

    ranked.sort(key=lambda x: x[1], reverse=True)
    return ranked


def evaluate_project_evidence(
    resume_project: Dict[str, Any],
    repo: Dict[str, Any],
    readme_text: str,
    tree_files: List[Dict[str, Any]],
    languages: Dict[str, int],
    match_type: str = "SEARCH",
    embedder: Optional[Any] = None,
) -> Dict[str, Any]:
    """Calculate deterministic 5-factor project evidence score."""
    p_name = (resume_project.get("title") or resume_project.get("name") or "").strip()
    p_desc = (resume_project.get("description") or "").strip()
    p_techs = [t.lower() for t in resume_project.get("technologies", []) if t]

    r_name = repo.get("name", "")
    r_desc = repo.get("description", "")

    # Priority 1 or 2 matches start with high baseline score
    if match_type in ("EXPLICIT_URL", "EXACT_NAME"):
        name_similarity = 100.0
    else:
        name_similarity = max(
            fuzz.ratio(p_name.lower(), r_name.lower()),
            fuzz.token_set_ratio(p_name.lower(), r_name.lower()),
        )

    desc_similarity = round(_calculate_cosine_sim(p_desc, r_desc, embedder) * 100.0, 1)
    readme_similarity = round(_calculate_cosine_sim(p_desc or p_name, readme_text[:2000], embedder) * 100.0, 1) if readme_text else 50.0

    file_paths = [f.get("path", "").lower() for f in tree_files]
    file_names = [f.split("/")[-1] for f in file_paths]
    lang_keys = [k.lower() for k in languages.keys()]

    verified_techs = []
    for tech in p_techs:
        in_lang = tech in lang_keys or tech == (repo.get("language") or "").lower()
        in_readme = readme_text and (tech in readme_text.lower())
        in_files = any(tech in fp for fp in file_paths)
        if in_lang or in_files or in_readme:
            verified_techs.append(tech)

    tech_overlap = round((len(verified_techs) / len(p_techs) * 100.0), 1) if p_techs else 85.0

    has_source = any(fp.endswith((".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".cpp", ".cs", ".go", ".rs")) for fp in file_paths)
    has_config = any(fn in {"package.json", "requirements.txt", "pyproject.toml", "pom.xml", "dockerfile", "docker-compose.yml"} for fn in file_names)
    code_evidence = 95.0 if (has_source or has_config) else 70.0

    overall_score = round(
        (name_similarity * 0.35) +
        (desc_similarity * 0.15) +
        (readme_similarity * 0.15) +
        (tech_overlap * 0.20) +
        (code_evidence * 0.15),
        1
    )

    if match_type in ("EXPLICIT_URL", "EXACT_NAME"):
        overall_score = max(85.0, overall_score)

    if overall_score >= 80:
        status = "VERIFIED"
    elif overall_score >= 55:
        status = "PARTIALLY_VERIFIED"
    elif overall_score >= 35:
        status = "WEAK_EVIDENCE"
    else:
        status = "NOT_FOUND"

    return {
        "project_name": p_name,
        "matched_repo_name": r_name,
        "repo_url": repo.get("url"),
        "overall_score": overall_score,
        "name_similarity": name_similarity,
        "description_similarity": desc_similarity,
        "readme_similarity": readme_similarity,
        "technology_overlap": tech_overlap,
        "code_evidence": code_evidence,
        "verified_technologies": verified_techs,
        "verification_status": status,
        "match_priority": match_type,
    }
