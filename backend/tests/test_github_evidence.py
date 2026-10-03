import pytest
from app.services.resume_parser import extract_text_from_pdf
from app.services.groq_service import parse_resume_structure
from app.services.ats_scorer import calculate_overall_score, detect_location_info, validate_skills_with_projects
from app.services.feedback_engine import analyze_issues
from app.services.github_extractor import extract_github_username_and_repos
from app.services.claim_extractor import extract_resume_claims
from app.services.project_matcher import match_project_to_repositories, evaluate_project_evidence
from app.services.skill_verifier import verify_skill_usage
from app.services.activity_analyzer import calculate_activity_metrics
from app.services.maturity_analyzer import analyze_development_maturity
from app.services.authenticity_analyzer import evaluate_authenticity_and_ai_risk


def test_github_url_extraction():
    text = """
    John Doe
    Email: john@example.com
    GitHub: https://github.com/torvalds/linux
    Portfolio: github.com/johndoe
    """
    res = extract_github_username_and_repos(text)
    assert res["github_username"] in ("torvalds", "johndoe")
    assert res["github_profile_url"] is not None


def test_claim_extraction():
    parsed_resume = {
        "projects": [
            {"title": "SkillGap AI", "description": "ATS Resume Analyzer", "technologies": ["React", "FastAPI"]}
        ],
        "skills": ["Python", "React", "PostgreSQL"],
        "experience": [
            {"job_title": "Software Engineer", "company": "Tech Corp", "description": "Built scalable APIs"}
        ],
    }
    claims = extract_resume_claims(parsed_resume)
    assert len(claims) >= 4
    project_claim = next((c for c in claims if c["category"] == "PROJECT"), None)
    assert project_claim is not None
    assert project_claim["claim_text"] == "SkillGap AI"


def test_project_matching():
    resume_project = {
        "title": "SkillGap AI",
        "description": "AI recruitment platform with FastAPI and React",
        "technologies": ["React", "FastAPI", "Python"],
    }
    candidate_repos = [
        {"name": "skillgap-ai", "url": "https://github.com/johndoe/skillgap-ai", "description": "SkillGap AI platform backend", "language": "Python", "topics": ["react", "fastapi"]},
        {"name": "calculator", "url": "https://github.com/johndoe/calculator", "description": "Simple CLI calculator", "language": "C++", "topics": []},
    ]

    ranked = match_project_to_repositories(resume_project, candidate_repos)
    assert len(ranked) >= 1
    assert ranked[0][0]["name"] == "skillgap-ai"

    eval_res = evaluate_project_evidence(
        resume_project=resume_project,
        repo=candidate_repos[0],
        readme_text="SkillGap AI platform using React and FastAPI.",
        tree_files=[{"path": "backend/app/main.py"}, {"path": "package.json"}],
        languages={"Python": 1000, "JavaScript": 500},
        match_type=ranked[0][2],
    )
    assert eval_res["verification_status"] in ("VERIFIED", "PARTIALLY_VERIFIED")
    assert eval_res["overall_score"] >= 60.0


def test_skill_verification():
    repos = [
        {"name": "my-app", "language": "Python"},
        {"name": "frontend-ui", "language": "JavaScript"},
    ]
    readmes = {"my-app": "Built with FastAPI and Python."}
    file_trees = {"my-app": [{"path": "main.py"}, {"path": "requirements.txt"}]}
    configs = {"my-app": {"requirements.txt": "fastapi>=0.110.0\nuvicorn>=0.28.0"}}

    res = verify_skill_usage("FastAPI", repos, readmes, file_trees, configs)
    assert res["verification_status"] in ("VERIFIED", "SUPPORTED")
    assert res["evidence_score"] >= 70.0


def test_non_verifiable_skill():
    res = verify_skill_usage("Excel", [], {}, {}, {})
    assert res["verification_status"] == "NOT_GITHUB_VERIFIABLE"
    assert res["evidence_score"] == 100.0


def test_activity_and_maturity_analysis():
    commits = [
        {"committed_at": "2026-08-20T10:00:00Z"},
        {"committed_at": "2026-08-21T10:00:00Z"},
        {"committed_at": "2026-08-22T10:00:00Z"},
    ]
    repos = [{"name": "repo1", "created_at": "2026-08-01T00:00:00Z", "updated_at": "2026-08-22T00:00:00Z"}]
    profile = {"public_repos": 1}

    act = calculate_activity_metrics(commits, repos, profile)
    mat = analyze_development_maturity(repos, commits, {"repo1": "Detailed README for repo1"}, {"repo1": []})
    auth = evaluate_authenticity_and_ai_risk(act, mat, repos, commits)

    assert "activity_score" in act
    assert "maturity_score" in mat
    assert auth["ai_assistance_risk"] in ("LOW", "MODERATE", "HIGH")


def test_agnik_dutta_resume_parsing_regression():
    raw_text = """
    AGNIK DUTTA
    +91 8927004933 | agnikdutta465@gmail.com | linkedin.com/in/agnik-dutta | github.com/agnik07 | Portfolio
    Education
    S.R.M. Institute of Science and Technology Kattankulathur, Chennai
    B.Tech in Computer Science and Engineering | CGPA: 8.57 Aug. 2023 – Aug. 2027
    Technical Skills
    Programming: Python, Java, JavaScript, SQL
    Databases & SQL: MySQL, RDBMS, MongoDB, NoSQL
    Experience
    Data Science Intern Jan 2025 – Mar 2025
    Zidio | Certificate
    • Built and automated batch-oriented ETL pipelines using Python, Pandas, and NumPy.
    Business Associate Jan 2025 – Dec 2025
    WellWith / Ayuzera (Shark Tank Startup) | Link
    • Worked directly with customers and cross-functional teams.
    Projects
    AI-Powered Resume Skill Gap Analyzer | GitHub
    • Built and implemented a globally scalable AI-powered SaaS platform using React, FastAPI, Supabase.
    DigitalLocalShop – Full-Stack E-Commerce Platform | GitHub
    • Owned backend and database architecture using Node.js, Express.js, MySQL.
    AI Real-Time GYM Coach | GitHub
    • Built a real-time AI coaching app using MediaPipe, Groq, WebRTC, SQLite.
    Achievements
    • Published research paper on IEEE CLICK 2026 conference.
    """

    parsed = parse_resume_structure(raw_text)
    assert len(parsed["projects"]) == 3
    assert parsed["projects"][0]["title"] == "AI-Powered Resume Skill Gap Analyzer"
    assert parsed["projects"][1]["title"].startswith("DigitalLocalShop")
    assert parsed["projects"][2]["title"] == "AI Real-Time GYM Coach"

    # Verify skill validation pillar score > 0 / 15
    skill_val = validate_skills_with_projects(
        skills=parsed["skills"],
        projects=parsed["projects"],
        experience_entries=parsed["experience"],
        embedder=None,
    )
    assert skill_val["validation_score"] > 0.0
    assert len(skill_val["validated_skills"]) > 0

    # Verify issues analysis does NOT report "Missing Projects Section"
    location_res = detect_location_info(raw_text)
    scores = calculate_overall_score(
        text=raw_text,
        parsed_resume=parsed,
        skills=parsed["skills"],
        keywords=parsed["keywords"],
        action_verbs=parsed["action_verbs"],
        skill_validation_results=skill_val,
        location_results=location_res,
    )
    issues = analyze_issues(
        resume_text=raw_text,
        parsed_resume=parsed,
        skills=parsed["skills"],
        projects=parsed["projects"],
        action_verbs=parsed["action_verbs"],
        skill_validation=skill_val,
        scores=scores,
        location_results=location_res,
    )
    issue_titles = [i["issue_title"] for i in issues]
    assert "Missing Projects Section" not in issue_titles
