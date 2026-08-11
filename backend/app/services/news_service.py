import logging
from typing import Any, Dict, List
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

FALLBACK_NEWS = [
    {
        "title": "Tech Hiring Rebounds: Big Tech & AI Startups Ramp Up Full-Stack & ML Recruitment",
        "description": "Tech industry hiring pipelines demonstrate robust growth in engineering and artificial intelligence talent.",
        "url": "https://news.ycombinator.com/",
        "source": "TechCareers",
        "publishedAt": "2026-03-01T10:00:00Z",
    },
    {
        "title": "Top In-Demand Skills for 2026: FastAPI, TypeScript, React 19, and LLM Engineering",
        "description": "Recruiters emphasize hands-on project evidence and practical system design experience.",
        "url": "https://github.com/trending",
        "source": "Developer Digest",
        "publishedAt": "2026-03-02T12:30:00Z",
    },
    {
        "title": "How ATS Systems Are Evolving: Semantic Search and Project Verification Take Center Stage",
        "description": "Modern recruitment intelligence engines favor substantiated skills over passive keyword stuffing.",
        "url": "https://news.google.com/",
        "source": "Recruiting Trends",
        "publishedAt": "2026-03-03T15:00:00Z",
    },
]


async def get_job_news(count: int = 10) -> List[Dict[str, Any]]:
    """Fetch live hiring news from GNews API, or fallback to curated tech articles."""
    if settings.GNEWS_API_KEY and settings.GNEWS_API_KEY.strip():
        try:
            url = f"https://gnews.io/api/v4/search?q=tech+hiring+OR+software+jobs&lang=en&max={count}&apikey={settings.GNEWS_API_KEY}"
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    articles = data.get("articles", [])
                    if articles:
                        return [
                            {
                                "title": a.get("title", ""),
                                "description": a.get("description", ""),
                                "url": a.get("url", ""),
                                "source": a.get("source", {}).get("name", "News"),
                                "publishedAt": a.get("publishedAt", ""),
                            }
                            for a in articles
                        ]
        except Exception as e:
            logger.warning(f"GNews API request failed: {e}")

    return FALLBACK_NEWS[:count]
