from typing import Any, Dict, List


def generate_recommendations(
    score_results: Dict[str, Any],
    skill_validation_results: Dict[str, Any],
    detailed_issues: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Generate prioritized, actionable recommendations sorted by impact score.
    """
    recommendations: List[Dict[str, Any]] = []

    # 1. Formatting recommendation
    if score_results.get("formatting_score", 20.0) < 16.0:
        recommendations.append({
            "title": "Enhance Structure with Standard Sections & Bullet Points",
            "priority": "HIGH",
            "impact_score": 6.0,
            "category": "formatting",
            "description": "Ensure clear section headings (Experience, Projects, Education, Skills) and consistent bullet points.",
            "action_items": [
                "Format sections clearly with uppercase headings",
                "Ensure every role has 3-5 structured bullet points",
            ],
        })

    # 2. Skill Validation recommendation
    unvalidated = skill_validation_results.get("unvalidated_skills", [])
    if unvalidated:
        recommendations.append({
            "title": "Substantiate Claimed Skills with Project Evidence",
            "priority": "CRITICAL" if len(unvalidated) > 4 else "HIGH",
            "impact_score": min(8.0, len(unvalidated) * 1.5),
            "category": "skill_validation",
            "description": f"{len(unvalidated)} skills lack project evidence in your resume.",
            "action_items": [
                f"Add bullet points showcasing: {', '.join(unvalidated[:4])}",
                "Demonstrate practical outcomes achieved with these tools",
            ],
        })

    # 3. Content & Metrics recommendation
    if score_results.get("content_score", 25.0) < 18.0:
        recommendations.append({
            "title": "Incorporate Quantifiable Metrics & Strong Action Verbs",
            "priority": "HIGH",
            "impact_score": 7.5,
            "category": "content",
            "description": "Boost bullet point impact with percentages, scale indicators, and strong action verbs.",
            "action_items": [
                "Quantify project achievements (% faster, users handled, latency reduced)",
                "Start each bullet point with an impactful action verb",
            ],
        })

    # 4. Keyword density recommendation
    if score_results.get("keywords_score", 25.0) < 18.0:
        recommendations.append({
            "title": "Expand Core Industry Keywords and Technology Terms",
            "priority": "MEDIUM",
            "impact_score": 5.0,
            "category": "keywords",
            "description": "Include standard industry technologies, architectural patterns, and domain terminologies.",
            "action_items": [
                "Add relevant database, cloud, and framework keywords",
                "Align terminology with standard job description requirements",
            ],
        })

    # Sort by impact score descending
    recommendations.sort(key=lambda x: x["impact_score"], reverse=True)
    return recommendations
