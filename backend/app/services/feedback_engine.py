import re
from typing import Any, Dict, List, Optional


def analyze_issues(
    resume_text: str,
    parsed_resume: Dict[str, Any],
    skills: List[str],
    projects: List[Dict[str, Any]],
    action_verbs: List[str],
    skill_validation: Dict[str, Any],
    scores: Dict[str, Any],
    location_results: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Analyze and generate structured diagnostic issues from the resume."""
    issues: List[Dict[str, Any]] = []

    exp_entries = [e for e in parsed_resume.get("experience", []) if isinstance(e, dict)]
    edu_entries = [e for e in parsed_resume.get("education", []) if isinstance(e, dict)]
    proj_entries = [p for p in parsed_resume.get("projects", []) if isinstance(p, dict)]
    summary = (parsed_resume.get("professional_summary") or "").strip()

    # 1. Missing Projects Section
    if not proj_entries and len(projects) == 0:
        issues.append({
            "issue_title": "Missing Projects Section",
            "severity_level": "High",
            "ats_impact": "High",
            "explanation": (
                "Your resume does not feature a dedicated Projects section. "
                "Recruiters and modern ATS screening algorithms prioritize concrete project demonstrations "
                "to verify that claimed technical skills have been applied in real-world scenarios."
            ),
            "where_it_appears": "Resume structure — no 'Projects' header detected",
            "how_to_fix": "Add a 'PROJECTS' section showcasing 2–3 notable technical projects with tech stack and quantifiable metrics.",
            "action_items": [
                "Create a 'PROJECTS' header following your Experience section",
                "List 2–3 full-stack, ML, or domain-relevant projects",
                "Detail the architecture, frameworks used, and measurable results (e.g., 'Handled 10k requests/day')",
                "Provide clickable GitHub / Live demo links",
            ],
            "example_improvement": (
                "PROJECTS\n"
                "• AI Recruitment Platform — Built a full-stack SaaS with Next.js, FastAPI, and MongoDB. "
                "Implemented vector similarity matching and JWT authentication, reducing screening time by 50%."
            ),
        })

    # 2. Low Action Verbs
    if len(action_verbs) < 5:
        issues.append({
            "issue_title": "Weak Action Verbs & Passive Phrasing",
            "severity_level": "Moderate",
            "ats_impact": "Medium",
            "explanation": (
                f"Detected only {len(action_verbs)} strong action verbs. Strong action verbs "
                "(e.g., Architected, Optimized, Implemented, Deployed) create an authoritative impression of your ownership and contributions."
            ),
            "where_it_appears": "Bullet points in Experience and Projects sections",
            "how_to_fix": "Begin every bullet point with a powerful past-tense action verb instead of passive phrases like 'Responsible for'.",
            "action_items": [
                "Replace 'Worked on' or 'Helped with' with 'Engineered', 'Spearheaded', or 'Refactored'",
                "Ensure every bullet point follows the Action + Context + Result formula",
            ],
            "example_improvement": (
                "Before: 'Worked on database queries and helped speed up the backend.'\n"
                "After: 'Optimized PostgreSQL query indexes, reducing API latency by 35% across 500k daily records.'"
            ),
        })

    # 3. Unvalidated Skills
    unvalidated = skill_validation.get("unvalidated_skills", [])
    if len(unvalidated) >= 3:
        issues.append({
            "issue_title": f"Unsubstantiated Skills Detected ({len(unvalidated)} skills)",
            "severity_level": "Medium",
            "ats_impact": "Medium",
            "explanation": (
                f"The following skills were listed in your skills section but lack supporting mentions in your experience or projects: "
                f"{', '.join(unvalidated[:6])}. ATS and recruiters look for proof of practical application."
            ),
            "where_it_appears": "Skills section vs. Experience / Projects sections",
            "how_to_fix": "Weave these technologies into bullet points describing what you built or achieved with them.",
            "action_items": [
                f"Add bullet points referencing: {', '.join(unvalidated[:4])}",
                "If a skill is only theoretical, build a small project or complete a certification to validate it",
            ],
            "example_improvement": (
                f"Demonstrate '{unvalidated[0] if unvalidated else 'Redis'}': "
                f"'Integrated {unvalidated[0] if unvalidated else 'Redis'} caching layer to cache session tokens, cutting DB load by 40%.'"
            ),
        })

    # 4. Location Privacy Risk
    if location_results.get("privacy_risk") in ("medium", "high"):
        issues.append({
            "issue_title": "Excessive Location Information",
            "severity_level": "Low",
            "ats_impact": "Low",
            "explanation": "Your contact header contains detailed street addresses or zip codes which are unnecessary and present privacy concerns.",
            "where_it_appears": "Header / Contact Info",
            "how_to_fix": "Simplify location to 'City, State, Country'.",
            "action_items": [
                "Remove street address and apartment numbers",
                "Remove postal zip code",
            ],
            "example_improvement": "Header: 'San Francisco, CA' or 'Bengaluru, India'",
        })

    # 5. Missing Metrics & Quantifiable Achievements
    number_patterns = [r"\d+%", r"\$\d+", r"\d+[kKmMbB]"]
    achievement_count = sum(len(re.findall(p, resume_text, re.IGNORECASE)) for p in number_patterns)
    if achievement_count < 2:
        issues.append({
            "issue_title": "Lack of Quantifiable Impact & Metrics",
            "severity_level": "High",
            "ats_impact": "High",
            "explanation": (
                "Your bullet points describe tasks rather than measurable outcomes. "
                "Recruiters look for numbers (% improvements, users served, latency reduced, revenue generated) to evaluate seniority."
            ),
            "where_it_appears": "Experience bullet points",
            "how_to_fix": "Add numerical metrics to at least 3 bullet points.",
            "action_items": [
                "Quantify scale (e.g., 'Serving 50,000+ monthly active users')",
                "Quantify efficiency (e.g., 'Reduced load times by 45%')",
                "Quantify business value (e.g., 'Saved $15,000/month in cloud infrastructure costs')",
            ],
            "example_improvement": "Instead of 'Improved test coverage', write 'Increased unit test coverage from 55% to 92% using Pytest.'",
        })

    return issues


def generate_issues_summary(issues: List[Dict[str, Any]]) -> List[str]:
    """Generate concise one-line summaries for display in dashboards."""
    return [f"[{issue['severity_level']}] {issue['issue_title']}: {issue['how_to_fix']}" for issue in issues]
