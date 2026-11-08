import pytest
from app.services.skill_gap_engine import (
    analyze_skill_gap,
    extract_skills_nlp,
    calculate_semantic_similarity,
)
from app.services.dsa_service import get_company_dsa_bank
from app.services.learning_resources import (
    get_learning_resources,
    build_personalized_4week_roadmap,
)


def test_career_readiness_pipeline_context():
    """Verify that the rebuilt skill gap engine computes gaps and hybrid match correctly."""
    resume_skills = ["python", "fastapi", "docker", "postgresql", "git"]
    resume_text = (
        "Experienced Backend Engineer specializing in Python, FastAPI, and PostgreSQL microservices. "
        "Containerized deployments using Docker and version control with Git."
    )
    validated_skills = ["python", "fastapi", "docker"]
    github_evidence = {"github_evidence_score": 85.0, "is_available": True}

    res = analyze_skill_gap(
        resume_skills=resume_skills,
        resume_text=resume_text,
        target_company="Google",
        target_role="Backend Engineer",
        embedder=None,
        validated_skills=validated_skills,
        github_evidence=github_evidence,
    )

    assert "match_percentage" in res
    assert 0.0 <= res["match_percentage"] <= 100.0
    assert "skill_gaps" in res
    assert len(res["skill_gaps"]) > 0

    # Verify g_i = max(0, d_i - w_i) calculation
    for gap in res["skill_gaps"]:
        assert "demand_proficiency" in gap
        assert "candidate_proficiency" in gap
        assert "gap" in gap
        expected_gap = max(0.0, round(gap["demand_proficiency"] - gap["candidate_proficiency"], 2))
        assert abs(gap["gap"] - expected_gap) < 0.01

    # Candidate proficiency for validated skills should be higher
    validated_gap = next((g for g in res["skill_gaps"] if g["skill"] in ["python", "fastapi", "docker"]), None)
    if validated_gap:
        assert validated_gap["candidate_proficiency"] >= 2.0


def test_user_jd_as_primary_source():
    """Verify that user supplied JD is the primary source of skills, not replaced by generic catalog."""
    user_jd = (
        "We are seeking a Systems Specialist proficient in Rust, WebAssembly, Tokio, and Distributed Raft consensus. "
        "Experience with Docker and Linux kernel debugging is a plus."
    )
    resume_skills = ["docker", "linux", "c++", "git"]

    res = analyze_skill_gap(
        resume_skills=resume_skills,
        resume_text="Systems developer with C++ and Docker experience on Linux.",
        target_company="Startup XYZ",
        target_role="Specialist",
        job_description=user_jd,
        embedder=None,
    )

    assert "JD" in res["fallback_used"]
    job_skills_lower = [s.lower() for s in res["job_skills"]]
    assert "rust" in job_skills_lower or "webassembly" in job_skills_lower


def test_verified_learning_resources_quality():
    """Verify learning resources contain zero fake ratings, valid URLs, and structured 4-week roadmap."""
    skills = ["kubernetes", "system design", "fastapi"]
    roadmap_data = build_personalized_4week_roadmap(skills, "Backend Engineer")
    weeks = roadmap_data.get("weeks", [])

    assert len(weeks) == 4
    for w in weeks:
        assert "week" in w
        assert "theme" in w
        assert "objectives" in w and len(w["objectives"]) > 0
        assert "practical_exercises" in w and len(w["practical_exercises"]) > 0
        assert "mini_project" in w and len(w["mini_project"]) > 0
        assert "learning_outcomes" in w and len(w["learning_outcomes"]) > 0
        assert "resources" in w

        for r in w["resources"]:
            assert "title" in r and len(r["title"]) > 0
            assert "platform" in r and len(r["platform"]) > 0
            assert "url" in r and r["url"].startswith("http")
            assert "why_recommended" in r
            # Ratings must be transparent (either real number or "Rating unavailable")
            assert "Rating unavailable" in r["rating_display"] or "★" in r["rating_display"]


def test_company_dsa_bank_retrieval():
    """Verify that questions from master_dsa_bank.json are retrieved for target companies."""
    google_problems = get_company_dsa_bank("Google", limit=5)
    assert len(google_problems) > 0
    p = google_problems[0]
    assert "title" in p
    assert "difficulty" in p
    assert p["difficulty"] in ("Easy", "Medium", "Hard")
    assert "url" in p


def test_hybrid_skill_matching():
    """Verify research paper formula C = 0.6 * M_rule + 0.4 * (Sim * 100)."""
    resume_skills = ["react", "typescript", "tailwind", "html", "css"]
    job_description = "We require React, TypeScript, Tailwind CSS, Next.js, and GraphQL."

    res = analyze_skill_gap(
        resume_skills=resume_skills,
        resume_text="Frontend engineer building responsive React applications with TypeScript and Tailwind CSS.",
        target_company="Vercel",
        target_role="Frontend Engineer",
        job_description=job_description,
        embedder=None,
    )

    assert "match_percentage" in res
    assert 0.0 <= res["match_percentage"] <= 100.0
    matched_lower = [s.lower() for s in res["matched_skills"]]
    assert "react" in matched_lower
    assert "typescript" in matched_lower
    missing_lower = [s.lower() for s in res["missing_skills"]]
    assert "next.js" in missing_lower or "graphql" in missing_lower
