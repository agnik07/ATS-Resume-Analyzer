import pytest
from app.services.ats_scorer import (
    calculate_overall_score,
    detect_location_info,
    validate_skills_with_projects,
)
from app.services.skill_taxonomy import normalize_skill, fuzzy_match_keywords


def test_normalize_skill():
    assert normalize_skill("reactjs") == "react"
    assert normalize_skill("fastapi") == "fastapi"
    assert normalize_skill("python3") == "python"
    assert normalize_skill("k8s") == "kubernetes"
    assert normalize_skill("nodejs") == "javascript" or normalize_skill("nodejs") == "node.js" or normalize_skill("nodejs") == "javascript"


def test_fuzzy_match_keywords():
    resume_kw = ["React", "FastAPI", "PostgreSQL", "Docker", "Git"]
    jd_kw = ["React.js", "FastAPI", "Postgres", "Kubernetes", "AWS"]

    result = fuzzy_match_keywords(resume_kw, jd_kw, threshold=80)
    assert "FastAPI" in result["matched"]
    assert "React.js" in result["matched"]
    assert "Postgres" in result["matched"]
    assert "Kubernetes" in result["missing"]
    assert "AWS" in result["missing"]


def test_location_privacy_detection():
    clean_text = "Software Engineer based in Bengaluru, India. Experienced in FastAPI."
    leak_text = "John Doe, 123 Elm Street, Springfield, 90210. Phone: 555-1234."

    clean_res = detect_location_info(clean_text)
    assert clean_res["privacy_risk"] == "none"
    assert clean_res["penalty_applied"] == 0.0

    leak_res = detect_location_info(leak_text)
    assert leak_res["privacy_risk"] in ("medium", "high")
    assert leak_res["penalty_applied"] > 0.0


def test_deterministic_ats_scoring():
    sample_resume = {
        "name": "Jane Developer",
        "professional_summary": "Senior Full-Stack Engineer with 5 years building scalable web architectures.",
        "skills": ["python", "fastapi", "react", "postgresql", "docker", "redis"],
        "experience": [
            {
                "job_title": "Senior Backend Engineer",
                "company": "Tech Corp",
                "duration_months": 24,
                "description": "Architected microservices using FastAPI and PostgreSQL. Scaled system to handle 50,000 req/s and reduced latency by 45%.",
            }
        ],
        "education": [{"degree": "B.S. Computer Science", "institution": "State University", "year": "2021"}],
        "projects": [
            {
                "title": "Cloud Dashboard",
                "description": "Built full-stack React and Python dashboard with Docker deployment.",
                "technologies": ["React", "Python", "Docker"],
            }
        ],
        "action_verbs": ["architected", "scaled", "reduced", "built", "deployed"],
        "keywords": ["FastAPI", "PostgreSQL", "React", "Docker", "Redis", "Microservices", "REST API"],
    }

    resume_text = (
        "Jane Developer\n"
        "Senior Full-Stack Engineer\n\n"
        "SUMMARY\n"
        "Senior Full-Stack Engineer with 5 years building scalable web architectures.\n\n"
        "EXPERIENCE\n"
        "Senior Backend Engineer — Tech Corp\n"
        "• Architected microservices using FastAPI and PostgreSQL.\n"
        "• Scaled system to handle 50,000 req/s and reduced latency by 45%.\n"
        "• Deployed containerized applications with Docker.\n\n"
        "PROJECTS\n"
        "Cloud Dashboard\n"
        "• Built full-stack React and Python dashboard with Docker deployment.\n\n"
        "EDUCATION\n"
        "B.S. Computer Science — State University (2021)\n\n"
        "SKILLS\n"
        "Python, FastAPI, React, PostgreSQL, Docker, Redis\n"
    )

    skill_val = validate_skills_with_projects(
        skills=sample_resume["skills"],
        projects=sample_resume["projects"],
        experience_entries=sample_resume["experience"],
        embedder=None,
    )
    assert skill_val["validation_percentage"] > 0.5

    location_res = detect_location_info(resume_text)

    score_result_1 = calculate_overall_score(
        text=resume_text,
        parsed_resume=sample_resume,
        skills=sample_resume["skills"],
        keywords=sample_resume["keywords"],
        action_verbs=sample_resume["action_verbs"],
        skill_validation_results=skill_val,
        location_results=location_res,
    )

    score_result_2 = calculate_overall_score(
        text=resume_text,
        parsed_resume=sample_resume,
        skills=sample_resume["skills"],
        keywords=sample_resume["keywords"],
        action_verbs=sample_resume["action_verbs"],
        skill_validation_results=skill_val,
        location_results=location_res,
    )

    # Verify complete determinism
    assert score_result_1["overall_score"] == score_result_2["overall_score"]
    assert score_result_1["formatting_score"] == score_result_2["formatting_score"]
    assert score_result_1["keywords_score"] == score_result_2["keywords_score"]
    assert score_result_1["content_score"] == score_result_2["content_score"]
    assert score_result_1["skill_validation_score"] == score_result_2["skill_validation_score"]
    assert score_result_1["overall_score"] >= 65.0
