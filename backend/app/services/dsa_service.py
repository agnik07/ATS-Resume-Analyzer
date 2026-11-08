import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DATA_FILE_PATH = Path(__file__).resolve().parent.parent.parent / "dsa_data" / "master_dsa_bank.json"

_DSA_PROBLEMS_CACHE: List[Dict[str, Any]] = []
_COMPANY_TO_PROBLEMS: Dict[str, List[Dict[str, Any]]] = {}
_COMPANIES_META: List[Dict[str, Any]] = []
_TOPICS_META: List[Dict[str, Any]] = []


def _format_company_name(slug: str) -> str:
    """Format company slug into human readable title."""
    acronyms = {"tcs", "amd", "ibm", "sap", "kla", "optiver", "atlassian", "dsa", "gs"}
    if slug.lower() in acronyms:
        return slug.upper()
    return slug.replace("-", " ").title()


def _classify_topic(title: str) -> str:
    """Deterministic algorithmic topic classification based on problem title & data structure taxonomy."""
    t = title.lower()

    if any(k in t for k in ["dynamic programming", "climb", "robber", "coin change", "increasing subsequence", "edit distance", "knapsack", "partition", "decode ways", "jump game", "stock", "subsequence", "longest common"]):
        return "Dynamic Programming"
    if any(k in t for k in ["graph", "connected components", "island", "clone graph", "course schedule", "network", "dijkstra", "bipartite", "dag", "topological", "alien dictionary"]):
        return "Graphs & BFS/DFS"
    if any(k in t for k in ["tree", "bst", "traversal", "level order", "diameter", "invert", "serialize", "ancestor", "path sum", "trie", "binary search tree", "leaf", "subtree"]):
        return "Trees & BST"
    if any(k in t for k in ["linked list", "list node", "reverse list", "merge lists", "cycle", "reorder list", "lru cache", "lfu cache", "intersection of two linked"]):
        return "Linked Lists"
    if any(k in t for k in ["binary search", "search in rotated", "find minimum in rotated", "sqrt", "median of two sorted", "kth missing", "first bad version"]):
        return "Binary Search"
    if any(k in t for k in ["two pointer", "sliding window", "container with most water", "3sum", "triplet", "trapping rain water", "longest substring without repeating", "minimum window substring"]):
        return "Two Pointers & Sliding Window"
    if any(k in t for k in ["heap", "priority queue", "kth largest", "median from data stream", "top k frequent", "merge k sorted"]):
        return "Heaps & Priority Queue"
    if any(k in t for k in ["backtrack", "permutation", "combination sum", "n-queens", "word search", "subset", "generate parentheses", "sudoku"]):
        return "Backtracking"
    if any(k in t for k in ["stack", "queue", "valid parentheses", "daily temperatures", "evaluate reverse polish", "min stack", "largest rectangle in histogram"]):
        return "Stack & Queue"
    if any(k in t for k in ["bit", "bitwise", "single number", "counting bits", "reverse bits", "number of 1 bits"]):
        return "Bit Manipulation"
    if any(k in t for k in ["greedy", "gas station", "interval", "meeting rooms", "merge intervals", "insert interval", "non-overlapping"]):
        return "Greedy Algorithms"
    if any(k in t for k in ["palindrome", "anagram", "string", "substring", "roman", "valid word", "longest common prefix", "encode and decode"]):
        return "Strings"
    if any(k in t for k in ["array", "matrix", "subarray", "two sum", "product of array", "duplicate", "rotate image", "spiral matrix", "set matrix zeroes"]):
        return "Arrays & Hashing"

    return "Arrays & Hashing"


def _load_dsa_data():
    """Load, index, and enrich the master DSA problem bank from JSON."""
    global _DSA_PROBLEMS_CACHE, _COMPANY_TO_PROBLEMS, _COMPANIES_META, _TOPICS_META
    if _DSA_PROBLEMS_CACHE:
        return

    if not DATA_FILE_PATH.exists():
        logger.warning(f"DSA master file not found at {DATA_FILE_PATH}")
        _DSA_PROBLEMS_CACHE = []
        return

    try:
        with open(DATA_FILE_PATH, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        company_counts: Dict[str, int] = {}
        topic_counts: Dict[str, int] = {}

        enriched_problems = []
        for p in raw_data:
            title = p.get("title", "")
            topic = _classify_topic(title)
            topic_counts[topic] = topic_counts.get(topic, 0) + 1

            p_enriched = dict(p)
            p_enriched["topic"] = topic
            p_enriched["platform"] = "LeetCode" if "leetcode.com" in p.get("url", "") else "Platform"

            enriched_problems.append(p_enriched)

            companies = p.get("companies", [])
            for c in companies:
                c_norm = c.lower().strip()
                if c_norm not in _COMPANY_TO_PROBLEMS:
                    _COMPANY_TO_PROBLEMS[c_norm] = []
                _COMPANY_TO_PROBLEMS[c_norm].append(p_enriched)
                company_counts[c_norm] = company_counts.get(c_norm, 0) + 1

        _DSA_PROBLEMS_CACHE = enriched_problems

        # Sort companies by problem count descending
        sorted_comps = sorted(company_counts.items(), key=lambda x: x[1], reverse=True)
        _COMPANIES_META = [
            {
                "slug": slug,
                "name": _format_company_name(slug),
                "count": count,
            }
            for slug, count in sorted_comps
        ]

        sorted_topics = sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)
        _TOPICS_META = [
            {"name": topic, "count": count}
            for topic, count in sorted_topics
        ]

        logger.info(f"✅ Loaded {len(_DSA_PROBLEMS_CACHE)} DSA problems across {len(_COMPANIES_META)} companies and {len(_TOPICS_META)} topics.")
    except Exception as e:
        logger.error(f"❌ Failed to load DSA master data: {e}")
        _DSA_PROBLEMS_CACHE = []


# Initial load
_load_dsa_data()


def get_all_dsa_data() -> List[Dict[str, Any]]:
    """Return all DSA problems from the master bank."""
    _load_dsa_data()
    return _DSA_PROBLEMS_CACHE


def get_dsa_companies() -> List[Dict[str, Any]]:
    """Return list of all companies with problem counts."""
    _load_dsa_data()
    return _COMPANIES_META


def get_dsa_topics() -> List[Dict[str, Any]]:
    """Return list of algorithmic topics with problem counts."""
    _load_dsa_data()
    return _TOPICS_META


def get_dsa_problems(
    company: Optional[str] = None,
    difficulty: Optional[str] = None,
    topic: Optional[str] = None,
    query: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
) -> List[Dict[str, Any]]:
    """Query problems with company, difficulty, topic, search, and pagination."""
    _load_dsa_data()
    problems = _DSA_PROBLEMS_CACHE

    if company and company != "all":
        comp_slug = company.lower().strip().replace(" ", "-")
        matched = _COMPANY_TO_PROBLEMS.get(comp_slug, [])
        if not matched:
            for k, v in _COMPANY_TO_PROBLEMS.items():
                if comp_slug in k or k in comp_slug:
                    matched = v
                    break
        problems = matched if matched else []

    if difficulty and difficulty != "all":
        problems = [p for p in problems if p.get("difficulty", "").lower() == difficulty.lower()]

    if topic and topic != "all":
        problems = [p for p in problems if p.get("topic", "").lower() == topic.lower()]

    if query and query.strip():
        q_lower = query.lower().strip()
        problems = [
            p for p in problems
            if q_lower in p.get("title", "").lower() or q_lower in str(p.get("id", ""))
        ]

    def _parse_freq(p):
        try:
            return float(p.get("frequency", "0%").replace("%", ""))
        except Exception:
            return 0.0

    problems_sorted = sorted(problems, key=_parse_freq, reverse=True)
    return problems_sorted[skip : skip + limit]


def get_company_dsa_bank(company_name: str, limit: int = 12) -> List[Dict[str, Any]]:
    """
    Get top company-specific DSA questions for ATS / Skill Gap recommendation engine.
    Matches company name against master database with preserved data provenance.
    """
    _load_dsa_data()
    if not company_name:
        return []

    comp_clean = company_name.lower().strip().replace(" ", "-")

    if comp_clean in _COMPANY_TO_PROBLEMS:
        matched_problems = _COMPANY_TO_PROBLEMS[comp_clean]
        is_exact = True
    else:
        matched_problems = []
        is_exact = False
        for slug, probs in _COMPANY_TO_PROBLEMS.items():
            if comp_clean in slug or slug in comp_clean:
                matched_problems = probs
                is_exact = True
                break

    if not matched_problems:
        matched_problems = _COMPANY_TO_PROBLEMS.get("google", []) or _DSA_PROBLEMS_CACHE[:limit]
        is_exact = False

    def _parse_freq(p):
        try:
            return float(p.get("frequency", "0%").replace("%", ""))
        except Exception:
            return 0.0

    sorted_probs = sorted(matched_problems, key=_parse_freq, reverse=True)

    formatted_name = _format_company_name(comp_clean)
    results = []
    for p in sorted_probs[:limit]:
        provenance = (
            f"Official LeetCode Tagged Problem ({formatted_name})"
            if is_exact
            else "General High-Frequency Interview Practice"
        )
        rec_type = f"Company Tagged ({formatted_name})" if is_exact else "General Practice"

        results.append({
            "id": p.get("id"),
            "title": p.get("title"),
            "url": p.get("url"),
            "difficulty": p.get("difficulty"),
            "acceptance": p.get("acceptance"),
            "frequency": p.get("frequency"),
            "companies": p.get("companies", []),
            "topic": p.get("topic", _classify_topic(p.get("title", ""))),
            "platform": p.get("platform", "LeetCode"),
            "recommendation_type": rec_type,
            "data_provenance": provenance,
            "is_company_tagged": is_exact,
        })

    return results


def get_recommended_dsa_problems(
    target_company: Optional[str] = None,
    target_role: Optional[str] = None,
    missing_skills: Optional[List[str]] = None,
    limit: int = 15,
) -> Dict[str, Any]:
    """
    Target-aware DSA recommendation engine:
    1. Retrieves authentic company-tagged questions if target_company is specified.
    2. Identifies data structure topics matching missing technical skills (e.g. Graphs, Trees, DP).
    3. Clearly separates company-tagged questions from general recommended practice.
    """
    _load_dsa_data()

    company_questions: List[Dict[str, Any]] = []
    role_skill_questions: List[Dict[str, Any]] = []

    # 1. Company Tagged Questions
    if target_company and target_company.strip():
        comp_bank = get_company_dsa_bank(target_company.strip(), limit=limit)
        company_questions = [p for p in comp_bank if p.get("is_company_tagged")]

    # 2. Skill/Role Focused Questions
    skill_topics = set()
    if missing_skills:
        for sk in missing_skills:
            sk_l = sk.lower()
            if any(k in sk_l for k in ["graph", "neo4j"]):
                skill_topics.add("Graphs & BFS/DFS")
            if any(k in sk_l for k in ["tree", "database index"]):
                skill_topics.add("Trees & BST")
            if any(k in sk_l for k in ["cache", "redis", "concurrency"]):
                skill_topics.add("Linked Lists")
            if any(k in sk_l for k in ["algorithm", "optimization"]):
                skill_topics.add("Dynamic Programming")

    # If role specifies backend or data science
    if target_role:
        r_l = target_role.lower()
        if "backend" in r_l:
            skill_topics.add("Linked Lists")
            skill_topics.add("Arrays & Hashing")
        elif "ml" in r_l or "ai" in r_l or "data" in r_l:
            skill_topics.add("Arrays & Hashing")
            skill_topics.add("Dynamic Programming")

    seen_ids = {p["id"] for p in company_questions}

    for p in _DSA_PROBLEMS_CACHE:
        if len(role_skill_questions) >= limit:
            break
        if p["id"] in seen_ids:
            continue
        if skill_topics and p.get("topic") in skill_topics:
            role_skill_questions.append({
                "id": p.get("id"),
                "title": p.get("title"),
                "url": p.get("url"),
                "difficulty": p.get("difficulty"),
                "acceptance": p.get("acceptance"),
                "frequency": p.get("frequency"),
                "companies": p.get("companies", []),
                "topic": p.get("topic"),
                "platform": p.get("platform", "LeetCode"),
                "recommendation_type": "Skill & Role Focused",
                "data_provenance": f"Curated for {target_role or 'Technical Role'} Foundations",
                "is_company_tagged": False,
            })
            seen_ids.add(p["id"])

    # Fallback if few skill questions found
    if len(role_skill_questions) < 5:
        for p in _DSA_PROBLEMS_CACHE:
            if len(role_skill_questions) >= 8:
                break
            if p["id"] not in seen_ids:
                role_skill_questions.append({
                    "id": p.get("id"),
                    "title": p.get("title"),
                    "url": p.get("url"),
                    "difficulty": p.get("difficulty"),
                    "acceptance": p.get("acceptance"),
                    "frequency": p.get("frequency"),
                    "companies": p.get("companies", []),
                    "topic": p.get("topic"),
                    "platform": p.get("platform", "LeetCode"),
                    "recommendation_type": "General Interview Practice",
                    "data_provenance": "High-Frequency Industry Master Problem",
                    "is_company_tagged": False,
                })
                seen_ids.add(p["id"])

    return {
        "target_company": target_company,
        "target_role": target_role,
        "company_tagged_questions": company_questions,
        "role_and_skill_questions": role_skill_questions,
        "total_recommendations": len(company_questions) + len(role_skill_questions),
    }
