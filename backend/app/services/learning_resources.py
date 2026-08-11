import logging
from typing import Any, Dict, List
from app.services.skill_taxonomy import normalize_skill

logger = logging.getLogger(__name__)

SKILL_RESOURCES: Dict[str, List[Dict[str, Any]]] = {
    "python": [
        {"platform": "FreeCodeCamp", "title": "Scientific Computing with Python", "url": "https://www.freecodecamp.org/learn/scientific-computing-with-python/", "type": "course"},
        {"platform": "Official Docs", "title": "Python 3 Official Tutorial", "url": "https://docs.python.org/3/tutorial/", "type": "docs"},
        {"platform": "YouTube", "title": "Python for Beginners (Full Course)", "url": "https://www.youtube.com/results?search_query=python+for+beginners+full+course", "type": "video"},
    ],
    "javascript": [
        {"platform": "FreeCodeCamp", "title": "JavaScript Algorithms & Data Structures", "url": "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/", "type": "course"},
        {"platform": "MDN Web Docs", "title": "JavaScript Guide", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", "type": "docs"},
    ],
    "typescript": [
        {"platform": "Official Docs", "title": "TypeScript Handbook", "url": "https://www.typescriptlang.org/docs/handbook/intro.html", "type": "docs"},
        {"platform": "FreeCodeCamp", "title": "TypeScript Course for Beginners", "url": "https://www.freecodecamp.org/news/learn-typescript-beginners-guide/", "type": "course"},
    ],
    "react": [
        {"platform": "Official Docs", "title": "React 19 Interactive Tutorial", "url": "https://react.dev/learn", "type": "docs"},
        {"platform": "FreeCodeCamp", "title": "Front End Development Libraries (React)", "url": "https://www.freecodecamp.org/learn/front-end-development-libraries/", "type": "course"},
    ],
    "fastapi": [
        {"platform": "Official Docs", "title": "FastAPI Complete Tutorial & Guide", "url": "https://fastapi.tiangolo.com/tutorial/", "type": "docs"},
        {"platform": "YouTube", "title": "FastAPI Full Course - Building Modern APIs", "url": "https://www.youtube.com/results?search_query=fastapi+full+course", "type": "video"},
    ],
    "docker": [
        {"platform": "Docker Docs", "title": "Docker Getting Started Guide", "url": "https://docs.docker.com/get-started/", "type": "docs"},
        {"platform": "FreeCodeCamp", "title": "Docker for Beginners", "url": "https://www.freecodecamp.org/news/what-is-docker-used-for-a-docker-container-tutorial-for-beginners/", "type": "course"},
    ],
    "kubernetes": [
        {"platform": "Kubernetes.io", "title": "Kubernetes Basics Tutorial", "url": "https://kubernetes.io/docs/tutorials/kubernetes-basics/", "type": "docs"},
        {"platform": "YouTube", "title": "Kubernetes in 1 Hour", "url": "https://www.youtube.com/results?search_query=kubernetes+tutorial+for+beginners", "type": "video"},
    ],
    "aws": [
        {"platform": "AWS Skill Builder", "title": "AWS Cloud Practitioner Essentials (Free)", "url": "https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/", "type": "course"},
        {"platform": "FreeCodeCamp", "title": "AWS Certified Cloud Practitioner Training", "url": "https://www.freecodecamp.org/news/aws-certified-cloud-practitioner-study-course/", "type": "course"},
    ],
    "mongodb": [
        {"platform": "MongoDB University", "title": "MongoDB Basics & Node/Python Integration", "url": "https://learn.mongodb.com/", "type": "course"},
    ],
    "postgresql": [
        {"platform": "PostgreSQL Tutorial", "title": "PostgreSQL from Beginner to Advanced", "url": "https://www.postgresqltutorial.com/", "type": "docs"},
    ],
    "machine learning": [
        {"platform": "Coursera", "title": "Machine Learning Specialization by Andrew Ng", "url": "https://www.coursera.org/specializations/machine-learning-introduction", "type": "course"},
        {"platform": "Kaggle", "title": "Intro to Machine Learning", "url": "https://www.kaggle.com/learn/intro-to-machine-learning", "type": "course"},
    ],
    "data structures": [
        {"platform": "FreeCodeCamp", "title": "Data Structures & Algorithms Course", "url": "https://www.freecodecamp.org/learn/coding-interview-prep/data-structures/", "type": "course"},
        {"platform": "NeetCode", "title": "DSA Roadmap & Practice Problems", "url": "https://neetcode.io/roadmap", "type": "course"},
    ],
    "system design": [
        {"platform": "GitHub", "title": "The System Design Primer", "url": "https://github.com/donnemartin/system-design-primer", "type": "docs"},
        {"platform": "YouTube", "title": "System Design Interview Concepts", "url": "https://www.youtube.com/results?search_query=system+design+interview+concepts", "type": "video"},
    ],
}

DEFAULT_RESOURCES = [
    {"platform": "FreeCodeCamp", "title": "Free Full-Stack Coding Curriculum", "url": "https://www.freecodecamp.org/learn/", "type": "course"},
    {"platform": "Coursera", "title": "Top Tech & Computer Science Courses", "url": "https://www.coursera.org/courses?query=computer%20science", "type": "course"},
    {"platform": "MDN / Official Docs", "title": "Developer Documentation & Guides", "url": "https://developer.mozilla.org/", "type": "docs"},
]


def get_resources_for_skill(skill: str) -> List[Dict[str, Any]]:
    """Get vetted learning links for a given technical skill."""
    canon = normalize_skill(skill)
    if canon in SKILL_RESOURCES:
        return SKILL_RESOURCES[canon].copy()
    return DEFAULT_RESOURCES.copy()


def get_learning_resources(missing_skills: List[str]) -> Dict[str, List[Dict[str, Any]]]:
    """Retrieve learning resources organized by missing skill."""
    result: Dict[str, List[Dict[str, Any]]] = {}
    for s in missing_skills:
        result[s] = get_resources_for_skill(s)
    return result


def build_rule_based_roadmap(missing_skills: List[str], target_role: str) -> str:
    """Construct an actionable 4-week learning roadmap for missing skills."""
    if not missing_skills:
        return (
            f"🎉 **Outstanding Match for {target_role}!**\n\n"
            "You have demonstrated coverage of all core required competencies for this position.\n\n"
            "**Recommended Next Steps:**\n"
            "1. Focus on Mock Interviews and System Design communication.\n"
            "2. Review DSA fundamentals on the DSA Tracker.\n"
            "3. Polish your portfolio with measurable impact metrics."
        )

    weeks = []
    chunk_size = max(1, (len(missing_skills) + 3) // 4)
    skill_chunks = [missing_skills[i : i + chunk_size] for i in range(0, len(missing_skills), chunk_size)]

    for idx, chunk in enumerate(skill_chunks[:4], start=1):
        skills_str = ", ".join(chunk)
        if idx == 1:
            weeks.append(
                f"### Week 1: Core Fundamentals & Theory\n"
                f"**Focus Skills:** {skills_str}\n"
                f"- Deep-dive into core syntax, foundational architectures, and official documentation.\n"
                f"- Build simple sandbox scripts and understand primary API conventions."
            )
        elif idx == 2:
            weeks.append(
                f"### Week 2: Practical Implementation & Framework Integration\n"
                f"**Focus Skills:** {skills_str}\n"
                f"- Integrate these tools into standard boilerplate applications.\n"
                f"- Practice connecting databases, managing state, or setting up deployment pipelines."
            )
        elif idx == 3:
            weeks.append(
                f"### Week 3: Project Building & Optimization\n"
                f"**Focus Skills:** {skills_str}\n"
                f"- Build a full-featured portfolio mini-project demonstrating end-to-end integration.\n"
                f"- Implement unit tests, caching, and error handling."
            )
        else:
            weeks.append(
                f"### Week 4: Interview Prep & Real-World Case Studies\n"
                f"**Focus Skills:** {skills_str}\n"
                f"- Review common technical interview questions and architectural trade-offs for these skills.\n"
                f"- Update resume bullet points with concrete metrics from your newly built projects."
            )

    return f"## 4-Week Career Accelerated Roadmap for {target_role}\n\n" + "\n\n".join(weeks)
