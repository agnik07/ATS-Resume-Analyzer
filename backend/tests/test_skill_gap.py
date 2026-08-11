import pytest
from app.services.skill_gap_engine import analyze_skill_gap
from app.services.learning_resources import build_rule_based_roadmap, get_learning_resources


def test_skill_gap_analysis_without_reparsing():
    resume_skills = ["python", "fastapi", "docker", "sql", "git"]
    resume_text = "Experienced backend engineer building Python FastAPI services with Docker and PostgreSQL."
    target_company = "Google"
    target_role = "Software Engineer"

    result = analyze_skill_gap(
        resume_skills=resume_skills,
        resume_text=resume_text,
        target_company=target_company,
        target_role=target_role,
        embedder=None,
    )

    assert "match_percentage" in result
    assert result["match_percentage"] > 0.0
    assert "python" in result["matched_skills"]
    assert len(result["skill_gaps"]) > 0
    assert result["learning_roadmap"] != ""
    assert isinstance(result["learning_resources"], dict)


def test_roadmap_generator():
    missing = ["kubernetes", "system design", "distributed systems"]
    roadmap = build_rule_based_roadmap(missing, "Backend Engineer")
    assert "Week 1" in roadmap
    assert "kubernetes" in roadmap.lower() or "system design" in roadmap.lower()
