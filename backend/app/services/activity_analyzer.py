from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List


def calculate_activity_metrics(
    commits: List[Dict[str, Any]],
    repos: List[Dict[str, Any]],
    profile: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Analyze development activity history across multi-window frames.
    Windows: 30, 90, 180, 365 days.
    """
    now = datetime.now(timezone.utc)
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

    active_days_30 = len({d.date() for d in commit_dates if (now - d).days <= 30})
    active_days_90 = len({d.date() for d in commit_dates if (now - d).days <= 90})
    active_days_180 = len({d.date() for d in commit_dates if (now - d).days <= 180})
    active_days_365 = len({d.date() for d in commit_dates if (now - d).days <= 365})
    total_active_days = len({d.date() for d in commit_dates})

    commits_30 = sum(1 for d in commit_dates if (now - d).days <= 30)
    commits_90 = sum(1 for d in commit_dates if (now - d).days <= 90)
    commits_180 = sum(1 for d in commit_dates if (now - d).days <= 180)
    commits_365 = sum(1 for d in commit_dates if (now - d).days <= 365)
    total_commits = len(commit_dates)

    # Active weeks in 90 days
    weeks_90 = len({(d.isocalendar()[0], d.isocalendar()[1]) for d in commit_dates if (now - d).days <= 90})
    weeks_365 = len({(d.isocalendar()[0], d.isocalendar()[1]) for d in commit_dates if (now - d).days <= 365})

    # Scoring parameters
    recent_activity_score = min(100.0, (commits_30 / 10.0) * 100.0) if commits_30 else (20.0 if commits_90 else 0.0)
    weekly_consistency_score = min(100.0, (weeks_90 / 12.0) * 100.0)
    longterm_consistency_score = min(100.0, (weeks_365 / 40.0) * 100.0)
    repo_maintenance_score = min(100.0, (len(repos) / 5.0) * 100.0) if repos else 0.0

    # Deterministic Activity Score (0-100)
    activity_score = round(
        (longterm_consistency_score * 0.30) +
        (recent_activity_score * 0.20) +
        (min(100.0, (active_days_90 / 20.0) * 100.0) * 0.15) +
        (weekly_consistency_score * 0.10) +
        (min(100.0, (total_commits / 30.0) * 100.0) * 0.15) +
        (repo_maintenance_score * 0.10),
        1
    )

    return {
        "activity_score": activity_score,
        "total_commits": total_commits,
        "commits_30d": commits_30,
        "commits_90d": commits_90,
        "commits_180d": commits_180,
        "commits_365d": commits_365,
        "active_days_30d": active_days_30,
        "active_days_90d": active_days_90,
        "active_days_180d": active_days_180,
        "active_days_365d": active_days_365,
        "total_active_days": total_active_days,
        "active_weeks_90d": weeks_90,
        "active_weeks_365d": weeks_365,
        "recent_activity_rating": "Strong" if commits_30 >= 10 else ("Moderate" if commits_90 >= 5 else "Low"),
        "consistency_rating": "Strong" if weeks_365 >= 20 else ("Moderate" if weeks_90 >= 6 else "Low"),
    }
