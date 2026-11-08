from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from app.api.deps import get_current_user
from app.models.user import User
from app.models.career_test import CareerTestResult
from app.models.progress import UserDSAProgress
from app.schemas.career import (
    CareerTestQuestion,
    CareerTestResultResponse,
    CareerTestSubmission,
)
from app.services.dsa_service import (
    get_all_dsa_data,
    get_dsa_companies,
    get_dsa_problems,
    get_company_dsa_bank,
    get_dsa_topics,
    get_recommended_dsa_problems,
)
from app.services.news_service import NEWS_CATEGORIES, get_job_news

router = APIRouter(prefix="/career", tags=["Career Intelligence & Prep"])

CAREER_QUESTIONS = [
    {"id": 1, "question": "When faced with a complex technical problem, I prefer to:", "options": ["Break it down into smaller algorithmic steps", "Brainstorm creative UI solutions", "Analyze the data patterns and statistical distributions", "Coordinate the team and define product milestones"]},
    {"id": 2, "question": "I feel most energized when:", "options": ["Building high-throughput backend APIs", "Extracting insights from messy datasets", "Crafting responsive, delightful frontend designs", "Managing stakeholder timelines and release roadmaps"]},
    {"id": 3, "question": "My ideal engineering focus is:", "options": ["System architecture, concurrency, and databases", "Machine learning algorithms and predictive models", "Design systems, CSS animations, and browser rendering", "Product vision, user discovery, and business impact"]},
    {"id": 4, "question": "I learn best by:", "options": ["Writing raw code, debugging memory, and testing edge cases", "Training models in Jupyter notebooks and evaluating loss curves", "Iterating on interactive UI prototypes and design components", "Analyzing user feedback metrics and conversion funnels"]},
    {"id": 5, "question": "When starting a greenfield project, I:", "options": ["Design the database schema and API contracts first", "Explore the data sources and train baseline heuristics", "Wireframe the user flow and design responsive components", "Draft the PRD, user stories, and acceptance criteria"]},
    {"id": 6, "question": "I'm most curious about:", "options": ["Distributed caching, microservices, and Kubernetes", "LLMs, embeddings, computer vision, and neural nets", "Next.js, modern CSS, animations, and web accessibility", "Go-to-market strategy, product metrics, and user retention"]},
    {"id": 7, "question": "My communication style is:", "options": ["Technical, precise, and architecture-focused", "Data-driven with statistical evidence and charts", "Visual, user-centric, and design-oriented", "Story-driven, persuasive, and structured for stakeholders"]},
    {"id": 8, "question": "I prefer working with:", "options": ["FastAPI, Go, PostgreSQL, Redis, Docker", "PyTorch, Scikit-learn, Pandas, Vector DBs", "React, TailwindCSS, TypeScript, Framer Motion", "Jira, Linear, Figma, Amplitude, Notion"]},
    {"id": 9, "question": "Success in a sprint means:", "options": ["Shipping high-performance, fault-tolerant backend services", "Improving model accuracy and inference latency", "Delivering pixel-perfect, accessible UI components", "Unblocking team velocity and shipping high-value features"]},
    {"id": 10, "question": "I get most frustrated when:", "options": ["APIs are poorly designed or database queries are unindexed", "Data pipelines are biased or model metrics are unvalidated", "Web apps have janky animations or poor mobile layouts", "Projects suffer from scope creep and lack clear direction"]},
]


def _evaluate_career_path(answers: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Deterministic psychometric career path mapping."""
    scores = {"backend": 0, "data": 0, "frontend": 0, "product": 0}

    for a in answers:
        ans_text = str(a.get("answer", "")).lower()
        if any(k in ans_text for k in ["api", "backend", "concurrency", "database", "distributed", "docker", "algorithmic"]):
            scores["backend"] += 2
        elif any(k in ans_text for k in ["model", "data", "ml", "learning", "statistics", "dataset", "pytorch"]):
            scores["data"] += 2
        elif any(k in ans_text for k in ["ui", "frontend", "design", "css", "react", "component", "animation"]):
            scores["frontend"] += 2
        elif any(k in ans_text for k in ["product", "timeline", "prd", "milestone", "stakeholder", "retention"]):
            scores["product"] += 2
        else:
            scores["backend"] += 1

    best_category = max(scores, key=scores.get)

    path_map = {
        "backend": {
            "path": "Backend & Cloud Systems Engineer",
            "explanation": "You exhibit exceptional logical rigor, systems thinking, and architectural intuition. You excel at building scalable distributed systems, API gateways, and robust database layers.",
            "strengths": ["System Design", "Concurrency & Caching", "API Architecture", "Database Optimization"],
            "suggested_skills": ["Go", "FastAPI", "PostgreSQL", "Redis", "Docker", "Kubernetes", "Microservices"],
        },
        "data": {
            "path": "AI / Machine Learning Engineer & Data Scientist",
            "explanation": "You possess deep curiosity for pattern discovery, statistical modeling, and predictive intelligence. You excel at taking raw unstructured datasets and developing production-grade machine learning pipelines.",
            "strengths": ["Statistical Analysis", "Predictive Modeling", "Feature Engineering", "Neural Networks"],
            "suggested_skills": ["PyTorch", "Scikit-learn", "Sentence Transformers", "FastAPI", "Vector Databases", "MLOps"],
        },
        "frontend": {
            "path": "Frontend / Full-Stack Product Engineer",
            "explanation": "You combine technical engineering discipline with an empathetic eye for user experience and visual design. You excel at crafting fast, responsive, and delightful digital experiences.",
            "strengths": ["UI/UX Architecture", "State Management", "Performance Optimization", "Design Systems"],
            "suggested_skills": ["React 19", "Next.js", "TypeScript", "TailwindCSS", "Framer Motion", "Zod"],
        },
        "product": {
            "path": "Technical Product Manager / Engineering Lead",
            "explanation": "You thrive at the intersection of business strategy, technology, and people. You excel at translating ambiguous market opportunities into high-impact software roadmaps.",
            "strengths": ["Strategic Roadmapping", "User Discovery", "Data-Driven Prioritization", "Stakeholder Communication"],
            "suggested_skills": ["Agile/Scrum", "Product Analytics", "System Architecture", "SQL", "Technical PRDs"],
        },
    }

    return path_map.get(best_category, path_map["backend"])


@router.get("/test/questions", response_model=List[CareerTestQuestion])
async def get_career_test_questions():
    """Retrieve psychometric career path assessment questions."""
    return [CareerTestQuestion(**q) for q in CAREER_QUESTIONS]


@router.post("/test/submit", response_model=CareerTestResultResponse)
async def submit_career_test(
    submission: CareerTestSubmission,
    current_user: User = Depends(get_current_user),
):
    """Submit career test answers and receive deterministic personality/path evaluation."""
    answers_dict = [a.model_dump() for a in submission.answers]
    eval_result = _evaluate_career_path(answers_dict)

    uid = str(current_user.id)
    test_result = CareerTestResult(
        user_id=uid,
        answers=answers_dict,
        career_path=eval_result["path"],
        explanation=eval_result["explanation"],
        strengths=eval_result["strengths"],
        suggested_skills=eval_result["suggested_skills"],
    )
    await test_result.insert()

    return CareerTestResultResponse(
        id=str(test_result.id),
        career_path=test_result.career_path,
        explanation=test_result.explanation,
        strengths=test_result.strengths,
        suggested_skills=test_result.suggested_skills,
        created_at=test_result.created_at,
    )


@router.get("/test/results", response_model=List[CareerTestResultResponse])
async def get_my_career_test_results(current_user: User = Depends(get_current_user)):
    """Retrieve history of user's career path assessments."""
    uid = str(current_user.id)
    results = await CareerTestResult.find(user_id=uid).sort(-CareerTestResult.created_at).to_list()
    return [
        CareerTestResultResponse(
            id=str(r.id),
            career_path=r.career_path,
            explanation=r.explanation,
            strengths=r.strengths,
            suggested_skills=r.suggested_skills,
            created_at=r.created_at,
        )
        for r in results
    ]


# --- DSA Tracker & Progress Endpoints ---
class DSAProgressUpdateRequest(BaseModel):
    problem_id: str
    is_solved: bool = True
    problem_title: Optional[str] = None
    company: Optional[str] = None
    difficulty: Optional[str] = None


@router.get("/dsa/companies")
async def list_dsa_companies():
    """List all companies available in master DSA problem bank."""
    return get_dsa_companies()


@router.get("/dsa/topics")
async def list_dsa_topics():
    """List all data structure topics with problem counts."""
    return get_dsa_topics()


@router.get("/dsa/problems")
async def list_dsa_problems(
    company: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    limit: int = Query(200, le=1000),
    skip: int = Query(0, ge=0),
):
    """Query problems with company, difficulty, topic, keyword search, and pagination."""
    return get_dsa_problems(
        company=company,
        difficulty=difficulty,
        topic=topic,
        query=query,
        limit=limit,
        skip=skip,
    )


@router.get("/dsa/company/{company_name}")
async def get_company_dsa_problems(company_name: str, limit: int = Query(15, le=50)):
    """Get top high-frequency DSA questions for a specific target company."""
    return get_company_dsa_bank(company_name=company_name, limit=limit)


@router.get("/dsa/recommended")
async def get_target_aware_dsa(
    company: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    missing_skills: Optional[str] = Query(None),
    limit: int = Query(15, le=50),
):
    """
    Target-aware DSA recommendation engine:
    Connects target company, target role, and missing technical skills to tailored problem sets.
    """
    skills_list = [s.strip() for s in missing_skills.split(",") if s.strip()] if missing_skills else None
    return get_recommended_dsa_problems(
        target_company=company,
        target_role=role,
        missing_skills=skills_list,
        limit=limit,
    )


@router.get("/dsa/progress")
async def get_dsa_progress(current_user: User = Depends(get_current_user)):
    """Retrieve user's persistent DSA solved problems and statistical metrics from Supabase."""
    uid = str(current_user.id)
    records = await UserDSAProgress.find(user_id=uid).to_list()

    solved_records = [r for r in records if r.is_solved]
    solved_ids = [r.problem_id for r in solved_records]

    easy_count = sum(1 for r in solved_records if (r.difficulty or "").lower() == "easy")
    medium_count = sum(1 for r in solved_records if (r.difficulty or "").lower() == "medium")
    hard_count = sum(1 for r in solved_records if (r.difficulty or "").lower() == "hard")

    by_company: Dict[str, int] = {}
    for r in solved_records:
        if r.company:
            comp_norm = r.company.lower().strip()
            by_company[comp_norm] = by_company.get(comp_norm, 0) + 1

    return {
        "solved_ids": solved_ids,
        "total_solved": len(solved_ids),
        "easy_solved": easy_count,
        "medium_solved": medium_count,
        "hard_solved": hard_count,
        "by_company": by_company,
    }


@router.post("/dsa/progress")
async def update_dsa_progress(
    req: DSAProgressUpdateRequest,
    current_user: User = Depends(get_current_user),
):
    """Persist student problem completion state in Supabase."""
    uid = str(current_user.id)
    existing = await UserDSAProgress.find_one(
        UserDSAProgress.user_id == uid,
        UserDSAProgress.problem_id == req.problem_id,
    )

    if existing:
        existing.is_solved = req.is_solved
        if req.problem_title:
            existing.problem_title = req.problem_title
        if req.difficulty:
            existing.difficulty = req.difficulty
        if req.company:
            existing.company = req.company
        existing.solved_at = datetime.now(timezone.utc)
        await existing.save()
        record_id = str(existing.id)
    else:
        new_record = UserDSAProgress(
            user_id=uid,
            problem_id=req.problem_id,
            problem_title=req.problem_title,
            company=req.company,
            difficulty=req.difficulty,
            is_solved=req.is_solved,
        )
        await new_record.insert()
        record_id = str(new_record.id)

    return {
        "message": f"Problem {req.problem_id} progress persisted successfully",
        "record_id": record_id,
        "is_solved": req.is_solved,
    }


@router.get("/dsa/all")
async def list_all_dsa():
    """Get all DSA problems."""
    return get_all_dsa_data()


# --- Tech Hiring News ---
@router.get("/news")
async def get_tech_news(
    count: int = Query(25, le=50),
    category: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    sort_by: str = Query("latest", pattern="^(latest|relevant)$"),
):
    """
    Get live job market and recruitment news magazine feed.
    Enriched with real images, category classification, key takeaways, and featured stories.
    """
    # Sanitize inputs in case function is called directly in Python tests
    count_val = count if isinstance(count, int) else 25
    category_val = category if isinstance(category, str) and category.strip() else None
    company_val = company if isinstance(company, str) and company.strip() else None
    query_val = query if isinstance(query, str) and query.strip() else None
    sort_by_val = sort_by if isinstance(sort_by, str) and sort_by in ("latest", "relevant") else "latest"

    articles = await get_job_news(
        count=count_val,
        category=category_val,
        company=company_val,
        query=query_val,
        sort_by=sort_by_val,
    )
    featured = [a for a in articles if a.get("is_featured")]
    return {
        "articles": articles,
        "featured": featured[:3] if featured else articles[:2],
        "categories": NEWS_CATEGORIES,
        "total": len(articles),
    }
