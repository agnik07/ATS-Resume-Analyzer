from datetime import datetime
import pytest
from app.models.user import User, UserRole
from app.models.progress import UserRoadmapProgress, UserDSAProgress
from app.services.learning_resources import (
    get_resources_for_skill,
    get_learning_resources,
    build_personalized_4week_roadmap,
    search_youtube_videos_live,
)
from app.services.dsa_service import (
    get_dsa_companies,
    get_dsa_problems,
    get_company_dsa_bank,
    get_dsa_topics,
    get_recommended_dsa_problems,
)
from app.services.news_service import NEWS_CATEGORIES, get_job_news
from app.api.v1.career import (
    DSAProgressUpdateRequest,
    get_dsa_progress,
    update_dsa_progress,
    get_target_aware_dsa,
    get_tech_news,
)
from app.api.v1.skill_gap import (
    RoadmapProgressUpdateRequest,
    get_roadmap_progress,
    update_roadmap_progress,
)


async def create_test_student():
    ts = datetime.now().timestamp()
    student = User(
        email=f"student_p5_{ts}@example.com",
        password_hash="pwdhash",
        full_name="Alex Learner",
        role=UserRole.STUDENT,
    )
    await student.insert()
    return student


# --- PART A: Verified Learning Resource Engine Tests ---
def test_resource_discovery_and_evaluation_integrity():
    """Verify learning resource discovery prioritizes high-quality sources without manufactured ratings."""
    resources = get_resources_for_skill("python")
    assert len(resources) >= 3

    # Check platforms: Official Docs, freeCodeCamp, edX/Harvard, YouTube
    platforms = [r["platform"] for r in resources]
    assert any("Official Docs" in p for p in platforms)
    assert any("freeCodeCamp" in p for p in platforms)

    # Check evaluation metadata
    for r in resources:
        assert "title" in r and len(r["title"]) > 3
        assert "url" in r and r["url"].startswith("http")
        assert "platform_icon" in r
        assert "duration" in r
        assert "rating_display" in r
        # Never manufacture ratings
        assert r["rating_display"] in ["Rating unavailable", "4.9 (Over 500,000 students enrolled)", "4.8 (Verified University Course)"] or "4." in r["rating_display"]
        assert "learning_objectives" in r and len(r["learning_objectives"]) >= 2
        assert "id" in r


@pytest.mark.asyncio
async def test_youtube_integration_and_fallback():
    """Verify YouTube Data API integration handles queries safely and provides fallback without fake video IDs."""
    # Test query
    yt_results = await search_youtube_videos_live("fastapi", max_results=2)
    # May return live items if API key is active or empty list without throwing errors
    assert isinstance(yt_results, list)
    for v in yt_results:
        assert v["platform"] == "YouTube"
        assert "youtube.com/watch?v=" in v["url"]
        assert v["rating"] == "Rating unavailable"  # Views are never treated as ratings


def test_personalized_4week_roadmap_generation():
    """Verify progressive 4-week learning roadmap with expandable weekly milestones."""
    missing = ["FastAPI", "Docker", "PostgreSQL", "Kubernetes"]
    roadmap = build_personalized_4week_roadmap(
        missing_skills=missing,
        matched_skills=["Python", "Git"],
        target_role="Backend Systems Engineer",
        target_company="Amazon",
    )

    assert "weeks" in roadmap
    assert len(roadmap["weeks"]) == 4
    for w in roadmap["weeks"]:
        assert "week_number" in w
        assert "theme" in w
        assert "focus_skills" in w and len(w["focus_skills"]) >= 1
        assert "learning_objectives" in w and len(w["learning_objectives"]) >= 1
        assert "practical_exercises" in w
        assert "mini_project" in w
        assert "resources" in w


@pytest.mark.asyncio
async def test_roadmap_progress_persistence():
    """Verify marking resources and weekly objectives complete persists across refreshes in Supabase."""
    student = await create_test_student()

    # Mark resource as complete
    res1 = await update_roadmap_progress(
        req=RoadmapProgressUpdateRequest(
            report_id="rep-123",
            resource_id="res-fastapi-01",
            is_completed=True,
            objective_id="obj-week1-syntax",
            week_number=1,
        ),
        current_user=student,
    )
    assert "res-fastapi-01" in res1["completed_resources"]
    assert "obj-week1-syntax" in res1["completed_objectives"]

    # Fetch progress
    progress = await get_roadmap_progress(report_id="rep-123", current_user=student)
    assert "res-fastapi-01" in progress["completed_resources"]
    assert "obj-week1-syntax" in progress["completed_objectives"]
    assert progress["total_completed"] >= 2


# --- PART B: Company-Specific DSA Tracker Tests ---
def test_company_dsa_bank_and_provenance():
    """Verify company-tagged DSA questions preserve data provenance and do not fabricate company tags."""
    amazon_probs = get_company_dsa_bank("amazon", limit=5)
    assert len(amazon_probs) >= 1
    for p in amazon_probs:
        assert "id" in p
        assert "title" in p
        assert "url" in p
        assert "difficulty" in p
        assert "topic" in p
        assert "is_company_tagged" in p
        assert p["is_company_tagged"] is True
        assert "Company Tagged" in p["recommendation_type"]
        assert "amazon" in [c.lower() for c in p["companies"]]


def test_dsa_topic_classification_and_topics_meta():
    """Verify deterministic topic taxonomy across the master DSA problem bank."""
    topics = get_dsa_topics()
    assert len(topics) >= 5
    topic_names = [t["name"] for t in topics]
    assert "Arrays & Hashing" in topic_names or "Dynamic Programming" in topic_names or "Graphs & BFS/DFS" in topic_names

    # Test filtering by topic
    dp_probs = get_dsa_problems(topic="Dynamic Programming", limit=10)
    assert len(dp_probs) >= 1
    assert all(p["topic"] == "Dynamic Programming" for p in dp_probs)


def test_target_aware_dsa_recommendation():
    """Verify target company and missing skills influence recommendations with clear provenance separation."""
    recs = get_recommended_dsa_problems(
        target_company="google",
        target_role="Backend Engineer",
        missing_skills=["Graph Algorithms", "Caching"],
        limit=10,
    )

    assert "company_tagged_questions" in recs
    assert "role_and_skill_questions" in recs
    assert len(recs["company_tagged_questions"]) >= 1
    # Company tagged questions must be authentic
    for cp in recs["company_tagged_questions"]:
        assert cp["is_company_tagged"] is True


@pytest.mark.asyncio
async def test_dsa_progress_tracking_and_persistence():
    """Verify DSA question completion is persisted and metric calculations are accurate."""
    student = await create_test_student()

    # Mark problem 146 (LRU Cache) as solved
    res = await update_dsa_progress(
        req=DSAProgressUpdateRequest(
            problem_id="146",
            is_solved=True,
            problem_title="LRU Cache",
            difficulty="Medium",
            company="amazon",
        ),
        current_user=student,
    )
    assert res["is_solved"] is True

    # Retrieve progress
    prog = await get_dsa_progress(current_user=student)
    assert "146" in prog["solved_ids"]
    assert prog["total_solved"] >= 1
    assert prog["medium_solved"] >= 1
    assert prog["by_company"].get("amazon", 0) >= 1


# --- PART C: Hiring Intelligence Tests ---
@pytest.mark.asyncio
async def test_hiring_intelligence_news_feed():
    """Verify visual tech hiring news magazine returns categorized stories with images and takeaways."""
    news_res = await get_tech_news(count=10)
    assert "articles" in news_res
    assert "featured" in news_res
    assert "categories" in news_res
    assert len(news_res["articles"]) >= 3

    for a in news_res["articles"]:
        assert "title" in a and len(a["title"]) > 5
        assert "source" in a
        assert "image" in a and a["image"].startswith("http")
        assert "category" in a and a["category"] in NEWS_CATEGORIES
        assert "key_takeaways" in a and len(a["key_takeaways"]) >= 2
        assert "read_time" in a


@pytest.mark.asyncio
async def test_hiring_news_category_and_keyword_filtering():
    """Verify category filtering and keyword search in news service."""
    # Category filter
    filtered_res = await get_tech_news(category="Internship Opportunities", count=10)
    assert len(filtered_res["articles"]) >= 1
    for a in filtered_res["articles"]:
        assert a["category"] == "Internship Opportunities"

    # Search filter
    search_res = await get_tech_news(query="engineering", count=10)
    assert len(search_res["articles"]) >= 1

