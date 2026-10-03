import re
import logging
from typing import Any, Dict, List, Tuple
from app.services.skill_taxonomy import normalize_skill

logger = logging.getLogger(__name__)

# Category A: Direct GitHub Verifiable Technical Skills
GITHUB_VERIFIABLE_SKILLS = {
    "python", "java", "javascript", "js", "typescript", "ts", "react", "react.js", "reactjs",
    "node.js", "nodejs", "express", "express.js", "fastapi", "flask", "django", "mysql",
    "mongodb", "postgresql", "postgres", "sqlite", "nosql", "redis", "docker", "kubernetes",
    "aws", "git", "pandas", "numpy", "tensorflow", "pytorch", "webrtc", "socket.io", "html", "css"
}

# Category B: Conceptual CS/AI Skills (Contextual Evidence via code structure/description)
CONCEPTUAL_SKILLS = {
    "data structures", "algorithms", "data structures & algorithms", "dsa", "oop",
    "object-oriented programming", "dbms", "database management", "machine learning",
    "deep learning", "nlp", "natural language processing", "etl", "data science",
    "operating systems", "computer networks", "restful apis", "rest api"
}

# Category C: Non-GitHub Verifiable Professional/Tool Skills
NON_GITHUB_VERIFIABLE_SKILLS = {
    "excel", "ms excel", "power bi", "stakeholder reporting", "requirement gathering",
    "cross-functional collaboration", "agile", "agile methodology", "communication",
    "troubleshooting", "root cause analysis", "change tracking"
}

# Technology-specific file extension and code pattern signatures
TECH_SIGNATURES = {
    "python": {"extensions": [".py"], "configs": ["requirements.txt", "pyproject.toml", "pipfile"], "imports": [r"import\s+", r"from\s+\w+"]},
    "javascript": {"extensions": [".js", ".mjs"], "configs": ["package.json"], "imports": [r"import\s+", r"require\s*\("]},
    "typescript": {"extensions": [".ts", ".tsx"], "configs": ["tsconfig.json", "package.json"], "imports": [r"import\s+"]},
    "react": {"extensions": [".jsx", ".tsx"], "configs": ["package.json"], "keywords": ["react", "react-dom", "useState", "useEffect"]},
    "fastapi": {"extensions": [".py"], "configs": ["requirements.txt"], "keywords": ["fastapi", "APIRouter", "BaseModel"]},
    "express": {"extensions": [".js", ".ts"], "configs": ["package.json"], "keywords": ["express", "app.get", "app.post"]},
    "mongodb": {"extensions": [".py", ".js", ".ts"], "configs": ["package.json", "requirements.txt"], "keywords": ["mongodb", "mongoose", "pymongo", "MongoClient"]},
    "mysql": {"extensions": [".py", ".js", ".ts", ".sql"], "configs": ["package.json", "requirements.txt"], "keywords": ["mysql", "mysql2", "CREATE TABLE", "SELECT", "JOIN"]},
    "sqlite": {"extensions": [".py", ".js", ".ts", ".sqlite", ".db"], "configs": ["requirements.txt"], "keywords": ["sqlite", "sqlite3"]},
    "docker": {"extensions": [], "configs": ["dockerfile", "docker-compose.yml"], "keywords": ["FROM ", "WORKDIR", "RUN ", "CMD "]},
    "pandas": {"extensions": [".py", ".ipynb"], "configs": ["requirements.txt"], "keywords": ["pandas", "import pandas", "pd.DataFrame"]},
    "numpy": {"extensions": [".py", ".ipynb"], "configs": ["requirements.txt"], "keywords": ["numpy", "import numpy", "np.array"]},
    "webrtc": {"extensions": [".js", ".ts", ".py"], "configs": ["package.json"], "keywords": ["webrtc", "RTCPeerConnection", "getUserMedia"]},
}


def classify_skill_type(skill: str) -> str:
    """Classify skill into Category A, B, or C."""
    skill_lower = skill.lower().strip()
    if skill_lower in NON_GITHUB_VERIFIABLE_SKILLS or any(ng in skill_lower for ng in ["excel", "power bi", "reporting", "agile", "collaboration"]):
        return "NON_GITHUB_VERIFIABLE"
    elif skill_lower in CONCEPTUAL_SKILLS or any(c in skill_lower for c in ["structures", "algorithms", "learning", "processing", "science", "architecture"]):
        return "CONCEPTUAL"
    return "TECHNICAL"


def verify_skill_usage(
    skill: str,
    repos: List[Dict[str, Any]],
    readmes: Dict[str, str],
    file_trees: Dict[str, List[Dict[str, Any]]],
    configs: Dict[str, Dict[str, str]],
) -> Dict[str, Any]:
    """
    Determine technical evidence strength for a claimed skill across public repositories.
    """
    norm_skill = normalize_skill(skill)
    skill_lower = norm_skill.lower()
    skill_type = classify_skill_type(norm_skill)

    # Category C: Non-GitHub Verifiable Skills should NEVER be marked MISMATCH or UNVERIFIED
    if skill_type == "NON_GITHUB_VERIFIABLE":
        return {
            "skill": norm_skill,
            "skill_type": "NON_GITHUB_VERIFIABLE",
            "usage_level": "EXTERNAL EVIDENCE NOT APPLICABLE",
            "evidence_strength": "Not Applicable",
            "confidence": 1.0,
            "evidence_score": 100.0,
            "verification_status": "NOT_GITHUB_VERIFIABLE",
            "evidence_sources": ["Professional / Business Tool — Evaluated via Resume & Interview"],
            "repositories_count": 0,
        }

    evidence_sources = []
    repo_count_using_skill = 0
    config_found = False
    source_file_count = 0
    readme_mentions = 0

    sig = TECH_SIGNATURES.get(skill_lower, {})
    sig_exts = sig.get("extensions", [])
    sig_cfgs = sig.get("configs", [])
    sig_kw = sig.get("keywords", [])

    for repo in repos:
        r_name = repo.get("name")
        r_lang = (repo.get("language") or "").lower()
        readme = readmes.get(r_name, "").lower()
        tree = file_trees.get(r_name, [])
        repo_configs = configs.get(r_name, {})

        matched_in_repo = False

        # 1. Check Primary Language Match
        if skill_lower == r_lang or (skill_lower == "js" and r_lang == "javascript") or (skill_lower == "ts" and r_lang == "typescript"):
            evidence_sources.append(f"Primary language in {r_name}")
            matched_in_repo = True
            source_file_count += 3

        # 2. Check Extension Signatures (.py, .jsx, .tsx, .sql)
        if sig_exts:
            matching_ext_files = [f["path"] for f in tree if any(f["path"].lower().endswith(ext) for ext in sig_exts)]
            if matching_ext_files:
                source_file_count += len(matching_ext_files)
                evidence_sources.append(f"{len(matching_ext_files)} source file(s) in {r_name}")
                matched_in_repo = True

        # 3. Check Dependency Configurations (package.json, requirements.txt, Dockerfile)
        for cfg_file, cfg_text in repo_configs.items():
            cfg_file_lower = cfg_file.lower()
            if sig_cfgs and any(sc in cfg_file_lower for sc in sig_cfgs):
                config_found = True
                evidence_sources.append(f"Config/Manifest in {r_name}/{cfg_file}")
                matched_in_repo = True
            elif cfg_text and (skill_lower in cfg_text.lower() or any(kw.lower() in cfg_text.lower() for kw in sig_kw)):
                config_found = True
                evidence_sources.append(f"Dependency declared in {r_name}/{cfg_file}")
                matched_in_repo = True

        # 4. Check File Paths
        matching_paths = [f["path"] for f in tree if skill_lower in f["path"].lower()]
        if matching_paths:
            source_file_count += len(matching_paths)
            evidence_sources.append(f"Path match in {r_name}")
            matched_in_repo = True

        # 5. Check README & Code Keywords
        if readme and (skill_lower in readme or any(kw.lower() in readme for kw in sig_kw)):
            readme_mentions += 1
            if not matched_in_repo:
                evidence_sources.append(f"Mentioned in README of {r_name}")
                matched_in_repo = True

        if matched_in_repo:
            repo_count_using_skill += 1

    # Conceptual Skills (Category B) receive high evidence score if repos exist with related technologies
    if skill_type == "CONCEPTUAL" and repo_count_using_skill > 0:
        usage_level = "CONTEXTUALLY VERIFIED"
        evidence_strength = "Strong"
        confidence = 0.85
        score = 85.0
        status = "VERIFIED"
    elif repo_count_using_skill >= 2 and (config_found or source_file_count >= 3):
        usage_level = "USED EXTENSIVELY"
        evidence_strength = "Very Strong"
        confidence = 0.95
        score = 95.0
        status = "VERIFIED"
    elif config_found or source_file_count >= 2:
        usage_level = "USED"
        evidence_strength = "Very Strong"
        confidence = 0.90
        score = 90.0
        status = "VERIFIED"
    elif source_file_count >= 1 or config_found:
        usage_level = "IMPORTED / CONFIGURED"
        evidence_strength = "Strong"
        confidence = 0.80
        score = 80.0
        status = "VERIFIED"
    elif readme_mentions > 0:
        usage_level = "MENTIONED IN README"
        evidence_strength = "Moderate"
        confidence = 0.50
        score = 50.0
        status = "SUPPORTED"
    else:
        usage_level = "NOT VERIFIED THROUGH GITHUB"
        evidence_strength = "None"
        confidence = 0.20
        score = 20.0
        status = "UNVERIFIED"

    return {
        "skill": norm_skill,
        "skill_type": skill_type,
        "usage_level": usage_level,
        "evidence_strength": evidence_strength,
        "confidence": confidence,
        "evidence_score": score,
        "verification_status": status,
        "evidence_sources": list(set(evidence_sources)),
        "repositories_count": repo_count_using_skill,
    }
