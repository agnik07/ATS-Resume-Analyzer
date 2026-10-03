from typing import Any, Dict, List


def evaluate_authenticity_and_ai_risk(
    activity_metrics: Dict[str, Any],
    maturity_metrics: Dict[str, Any],
    repos: List[Dict[str, Any]],
    commits: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Produce an objective AI-Assistance Risk report (LOW/MODERATE/HIGH) with confidence level.
    Evaluates evidence without false accusations or sole LLM output.
    """
    signals = []
    counter_signals = []
    risk_points = 0

    # Signal 1: Burst upload pattern
    commit_burst_ratio = maturity_metrics.get("commit_burst_ratio", 0.0)
    if commit_burst_ratio > 0.75 and len(commits) >= 5:
        risk_points += 35
        signals.append("High single-day commit concentration (large initial upload).")
    elif commit_burst_ratio > 0.50:
        risk_points += 15
        signals.append("Moderate commit concentration on initial repository upload.")
    else:
        counter_signals.append("Incremental commit history across multiple active sessions.")

    # Signal 2: Repository creation clustering
    if maturity_metrics.get("is_burst_pattern"):
        risk_points += 25
        signals.append("Multiple repositories created/uploaded within 24 hours.")
    else:
        counter_signals.append("Gradual repository creation and maintenance over time.")

    # Signal 3: Repo Lifespan & Post-Upload Maintenance
    avg_lifespan = maturity_metrics.get("avg_repo_lifespan_days", 0)
    if avg_lifespan < 2:
        risk_points += 20
        signals.append("Limited post-upload repository maintenance history.")
    else:
        counter_signals.append(f"Demonstrated repository maintenance (avg lifespan: {avg_lifespan:.0f} days).")

    # Signal 4: Total Commits vs Repository Count
    if len(repos) > 0 and (len(commits) / len(repos)) < 2:
        risk_points += 15
        signals.append("Low commit density per repository.")
    elif len(commits) >= 15:
        counter_signals.append("Substantial commit history supporting repository codebase.")

    # Counter-Signal: Testing Evidence
    if maturity_metrics.get("has_testing_evidence"):
        risk_points -= 10
        counter_signals.append("Contains automated test files and testing structures.")

    # Classify Risk Level & Confidence
    risk_score = max(0, min(100, risk_points))
    if risk_score >= 60:
        risk_level = "HIGH"
        confidence = min(85, 50 + int(risk_score * 0.35))
    elif risk_score >= 30:
        risk_level = "MODERATE"
        confidence = min(75, 40 + int(risk_score * 0.35))
    else:
        risk_level = "LOW"
        confidence = max(65, 90 - int(risk_score * 0.5))

    explanation = (
        "Development patterns show consistent incremental history with long-term maintenance."
        if risk_level == "LOW"
        else (
            "Detected initial bulk code uploads with moderate incremental history. Common for offline or college projects."
            if risk_level == "MODERATE"
            else "Concentrated single-day code uploads detected. Indicates bulk upload or AI-assisted scaffolding."
        )
    )

    return {
        "ai_assistance_risk": risk_level,
        "confidence": confidence,
        "authenticity_risk_score": risk_score,
        "signals": signals,
        "counter_signals": counter_signals,
        "explanation": explanation,
        "disclaimer": "This is an evidence report evaluating development history patterns, not a direct accusation of code generation.",
    }
