from datetime import datetime, timezone
from typing import Any, Dict, List


def analyze_development_maturity(
    repos: List[Dict[str, Any]],
    commits: List[Dict[str, Any]],
    readmes: Dict[str, str],
    file_trees: Dict[str, List[Dict[str, Any]]],
) -> Dict[str, Any]:
    """
    Calculate Development Maturity Score (0-100) and Burst Development Metrics.
    """
    now = datetime.now(timezone.utc)

    # 1. Burst Pattern Detection
    commit_dates = []
    for c in commits:
        dt_str = c.get("committed_at")
        if dt_str:
            try:
                dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
                commit_dates.append(dt)
            except Exception:
                pass

    commit_dates.sort()

    # Detect single day commit concentration
    day_counts: Dict[str, int] = {}
    for dt in commit_dates:
        day_str = dt.strftime("%Y-%m-%d")
        day_counts[day_str] = day_counts.get(day_str, 0) + 1

    max_day_commits = max(day_counts.values()) if day_counts else 0
    total_commits = len(commit_dates)
    commit_burst_ratio = (max_day_commits / total_commits) if total_commits > 0 else 0.0

    # Repo creation concentration
    repo_created_days = set()
    for r in repos:
        c_at = r.get("created_at")
        if c_at:
            try:
                dt = datetime.fromisoformat(c_at.replace("Z", "+00:00"))
                repo_created_days.add(dt.strftime("%Y-%m-%d"))
            except Exception:
                pass

    repo_creation_burst = (len(repos) - len(repo_created_days)) if repos else 0

    is_burst_pattern = (commit_burst_ratio >= 0.70 and total_commits >= 5) or (repo_creation_burst >= 4)

    # 2. Maturity Dimensions
    # A. Documentation Evolution & Readme Quality
    readme_quality_scores = []
    for r in repos:
        r_name = r.get("name")
        rm_text = readmes.get(r_name, "")
        if len(rm_text) > 1000:
            readme_quality_scores.append(100.0)
        elif len(rm_text) > 300:
            readme_quality_scores.append(70.0)
        elif len(rm_text) > 50:
            readme_quality_scores.append(40.0)
        else:
            readme_quality_scores.append(10.0)
    avg_readme_score = (sum(readme_quality_scores) / len(readme_quality_scores)) if readme_quality_scores else 50.0

    # B. Project Evolution & Lifespan
    repo_lifespans = []
    for r in repos:
        c_at = r.get("created_at")
        u_at = r.get("pushed_at") or r.get("updated_at")
        if c_at and u_at:
            try:
                dt1 = datetime.fromisoformat(c_at.replace("Z", "+00:00"))
                dt2 = datetime.fromisoformat(u_at.replace("Z", "+00:00"))
                days = (dt2 - dt1).days
                repo_lifespans.append(max(0, days))
            except Exception:
                pass

    avg_lifespan_days = (sum(repo_lifespans) / len(repo_lifespans)) if repo_lifespans else 0
    lifespan_score = min(100.0, (avg_lifespan_days / 60.0) * 100.0)

    # C. Testing Evidence
    has_test_files = False
    for r_name, tree in file_trees.items():
        for item in tree:
            path = item.get("path", "").lower()
            if "test" in path or "spec" in path or "__tests__" in path:
                has_test_files = True
                break
    testing_score = 90.0 if has_test_files else 40.0

    # Overall Development Maturity Score (0-100)
    maturity_score = round(
        (avg_readme_score * 0.30) +
        (lifespan_score * 0.35) +
        (testing_score * 0.20) +
        ((1.0 - commit_burst_ratio) * 100.0 * 0.15),
        1
    )

    return {
        "maturity_score": maturity_score,
        "commit_burst_ratio": round(commit_burst_ratio, 2),
        "is_burst_pattern": is_burst_pattern,
        "development_pattern": "Burst Upload Pattern" if is_burst_pattern else "Mostly Incremental",
        "avg_readme_quality_score": round(avg_readme_score, 1),
        "avg_repo_lifespan_days": round(avg_lifespan_days, 1),
        "has_testing_evidence": has_test_files,
    }
