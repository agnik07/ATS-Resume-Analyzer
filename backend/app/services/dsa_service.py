import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DATA_FILE_PATH = Path(__file__).resolve().parent.parent.parent / "dsa_data" / "master_dsa_bank.json"

_DSA_PROBLEMS_CACHE: List[Dict[str, Any]] = []
_COMPANY_TO_PROBLEMS: Dict[str, List[Dict[str, Any]]] = {}
_COMPANIES_META: List[Dict[str, Any]] = []


def _format_company_name(slug: str) -> str:
    """Format company slug into human readable title."""
    acronyms = {"tcs", "amd", "ibm", "sap", "kla", "optiver", "atlassian", "dsa"}
    if slug.lower() in acronyms:
        return slug.upper()
    return slug.replace("-", " ").title()


def _load_dsa_data():
    """Load and index the master DSA problem bank from JSON."""
    global _DSA_PROBLEMS_CACHE, _COMPANY_TO_PROBLEMS, _COMPANIES_META
    if _DSA_PROBLEMS_CACHE:
        return

    if not DATA_FILE_PATH.exists():
        logger.warning(f"DSA master file not found at {DATA_FILE_PATH}")
        _DSA_PROBLEMS_CACHE = []
        return

    try:
        with open(DATA_FILE_PATH, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        _DSA_PROBLEMS_CACHE = raw_data
        _COMPANY_TO_PROBLEMS = {}

        company_counts: Dict[str, int] = {}

        for p in raw_data:
            companies = p.get("companies", [])
            for c in companies:
                c_norm = c.lower().strip()
                if c_norm not in _COMPANY_TO_PROBLEMS:
                    _COMPANY_TO_PROBLEMS[c_norm] = []
                _COMPANY_TO_PROBLEMS[c_norm].append(p)
                company_counts[c_norm] = company_counts.get(c_norm, 0) + 1

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

        logger.info(f"✅ Loaded {len(_DSA_PROBLEMS_CACHE)} DSA problems across {len(_COMPANIES_META)} companies.")
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


def get_dsa_problems(
    company: Optional[str] = None,
    difficulty: Optional[str] = None,
    query: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
) -> List[Dict[str, Any]]:
    """Query problems with company, difficulty, search, and pagination."""
    _load_dsa_data()
    problems = _DSA_PROBLEMS_CACHE

    if company and company != "all":
        comp_slug = company.lower().strip().replace(" ", "-")
        problems = _COMPANY_TO_PROBLEMS.get(comp_slug, [])
        if not problems:
            # Fallback substring match
            for k, v in _COMPANY_TO_PROBLEMS.items():
                if comp_slug in k or k in comp_slug:
                    problems = v
                    break

    if difficulty and difficulty != "all":
        problems = [p for p in problems if p.get("difficulty", "").lower() == difficulty.lower()]

    if query and query.strip():
        q_lower = query.lower().strip()
        problems = [
            p for p in problems
            if q_lower in p.get("title", "").lower() or q_lower in str(p.get("id", ""))
        ]

    # Sort: Higher frequency first
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
    Matches company name against master database.
    """
    _load_dsa_data()
    if not company_name:
        return []

    comp_clean = company_name.lower().strip().replace(" ", "-")

    # Direct match
    if comp_clean in _COMPANY_TO_PROBLEMS:
        matched_problems = _COMPANY_TO_PROBLEMS[comp_clean]
    else:
        # Partial match
        matched_problems = []
        for slug, probs in _COMPANY_TO_PROBLEMS.items():
            if comp_clean in slug or slug in comp_clean:
                matched_problems = probs
                break

    if not matched_problems:
        # Fallback to general FAANG top problems
        matched_problems = _COMPANY_TO_PROBLEMS.get("google", []) or _DSA_PROBLEMS_CACHE[:limit]

    def _parse_freq(p):
        try:
            return float(p.get("frequency", "0%").replace("%", ""))
        except Exception:
            return 0.0

    sorted_probs = sorted(matched_problems, key=_parse_freq, reverse=True)

    return [
        {
            "id": p.get("id"),
            "title": p.get("title"),
            "url": p.get("url"),
            "difficulty": p.get("difficulty"),
            "acceptance": p.get("acceptance"),
            "frequency": p.get("frequency"),
        }
        for p in sorted_probs[:limit]
    ]
