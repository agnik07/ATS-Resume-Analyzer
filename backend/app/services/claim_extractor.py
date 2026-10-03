import re
from typing import Any, Dict, List
from app.services.skill_taxonomy import normalize_skill, SKILLS_DATABASE

KNOWN_FRAMEWORKS = {
    "react", "react.js", "next.js", "nextjs", "vue", "vue.js", "angular", "fastapi", "flask",
    "django", "express", "express.js", "spring", "spring boot", "rails", "ruby on rails",
    "laravel", "asp.net", ".net core", "tailwind", "tailwindcss", "bootstrap", "flutter", "react native"
}

KNOWN_DATABASES = {
    "postgresql", "postgres", "mongodb", "mysql", "redis", "sqlite", "supabase", "firebase",
    "dynamodb", "elasticsearch", "cassandra", "neo4j", "oracle", "sql server"
}

KNOWN_DEVOPS = {
    "docker", "kubernetes", "k8s", "aws", "gcp", "azure", "terraform", "ansible", "jenkins",
    "github actions", "gitlab ci", "nginx", "linux", "bash"
}


def extract_resume_claims(parsed_resume: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract and structure verifiable claims from parsed resume structure.
    Categories:
    - PROJECT
    - SKILL
    - TECHNOLOGY
    - FRAMEWORK
    - DATABASE
    - EXPERIENCE
    """
    claims = []

    # 1. Project Claims
    projects = parsed_resume.get("projects", [])
    for proj in projects:
        if isinstance(proj, dict):
            p_name = proj.get("title") or proj.get("name")
            if p_name and len(p_name.strip()) > 2:
                techs = [normalize_skill(t) for t in proj.get("technologies", []) if t]
                claims.append({
                    "claim_id": f"proj_{len(claims)+1}",
                    "category": "PROJECT",
                    "claim_text": p_name.strip(),
                    "description": proj.get("description", ""),
                    "technologies": techs,
                    "verifiable_via_github": True,
                })

    # 2. Skill & Tech Claims
    raw_skills = parsed_resume.get("skills", [])
    for raw in raw_skills:
        skill = normalize_skill(raw)
        if not skill:
            continue
        skill_lower = skill.lower()

        cat = "SKILL"
        if skill_lower in KNOWN_FRAMEWORKS:
            cat = "FRAMEWORK"
        elif skill_lower in KNOWN_DATABASES:
            cat = "DATABASE"
        elif skill_lower in KNOWN_DEVOPS:
            cat = "TECHNOLOGY"

        claims.append({
            "claim_id": f"skill_{len(claims)+1}",
            "category": cat,
            "claim_text": skill,
            "description": f"Claimed proficiency in {skill}",
            "technologies": [skill],
            "verifiable_via_github": True,
        })

    # 3. Experience Claims (Company work, partially verifiable via tech stack)
    experience = parsed_resume.get("experience", [])
    for exp in experience:
        if isinstance(exp, dict):
            title = exp.get("job_title", "")
            company = exp.get("company", "")
            desc = exp.get("description", "")
            if title or company:
                claims.append({
                    "claim_id": f"exp_{len(claims)+1}",
                    "category": "EXPERIENCE",
                    "claim_text": f"{title} at {company}".strip(" at "),
                    "description": desc,
                    "technologies": [],
                    "verifiable_via_github": False,  # Private work cannot be directly verified on GitHub
                })

    return claims
