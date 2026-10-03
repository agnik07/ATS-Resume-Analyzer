import logging
from typing import Any, Dict, List, Optional
from app.services.github_extractor import extract_github_username_and_repos
from app.services.claim_extractor import extract_resume_claims
from app.services.github_service import GitHubService, GitHubServiceError, GitHubUserNotFoundError, GitHubRateLimitError
from app.services.project_matcher import match_project_to_repositories, evaluate_project_evidence
from app.services.skill_verifier import verify_skill_usage
from app.services.activity_analyzer import calculate_activity_metrics
from app.services.maturity_analyzer import analyze_development_maturity
from app.services.authenticity_analyzer import evaluate_authenticity_and_ai_risk

logger = logging.getLogger(__name__)


async def run_github_evidence_analysis(
    raw_resume_text: str,
    parsed_resume: Dict[str, Any],
    original_ats_score: float,
    embedder: Optional[Any] = None,
    custom_github_username: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Unified Orchestrator for GitHub Evidence & Development Authenticity Layer.
    """
    # Step 1: Extract GitHub Username & URLs
    extracted = extract_github_username_and_repos(raw_resume_text)
    username = custom_github_username or extracted.get("github_username") or parsed_resume.get("github")

    if username and "github.com/" in str(username):
        username = username.split("github.com/")[-1].split("/")[0].strip()

    if not username:
        return {
            "is_available": False,
            "status_message": "No public GitHub username or URL found in resume.",
            "github_evidence_score": 0.0,
            "enhanced_ats_score": original_ats_score,
        }

    gh_service = GitHubService()

    try:
        # Step 2: Fetch GitHub Profile & Repositories
        profile = await gh_service.get_user_profile(username)
        repos = await gh_service.get_user_repositories(username, max_repos=15)
    except GitHubUserNotFoundError:
        return {
            "is_available": False,
            "status_message": f"GitHub profile '{username}' not found or deleted.",
            "github_evidence_score": 0.0,
            "enhanced_ats_score": original_ats_score,
        }
    except (GitHubRateLimitError, GitHubServiceError) as e:
        logger.warning(f"GitHub API rate limit or service error for '{username}': {e}")
        return {
            "is_available": False,
            "status_message": f"GitHub API rate limit or service unavailable ({str(e)}).",
            "github_evidence_score": 0.0,
            "enhanced_ats_score": original_ats_score,
        }

    if not repos:
        return {
            "is_available": True,
            "status_message": f"Profile '{username}' found but contains 0 public repositories.",
            "github_profile": profile,
            "repositories_analyzed": 0,
            "github_evidence_score": 20.0,
            "enhanced_ats_score": original_ats_score,
        }

    # Step 3: Fetch Readmes, Trees, Configs, Commits for top 5 repos safely
    readmes = {}
    trees = {}
    configs = {}
    all_commits = []

    for repo in repos[:5]:
        r_name = repo["name"]
        try:
            rm_text = await gh_service.get_repository_readme(username, r_name)
            readmes[r_name] = rm_text

            tree = await gh_service.get_repository_tree(username, r_name, repo.get("default_branch", "main"))
            trees[r_name] = tree

            # Fetch key dependency configs
            repo_cfgs = {}
            for path_cand in ["package.json", "requirements.txt", "pyproject.toml", "Dockerfile", "docker-compose.yml"]:
                matching = [f["path"] for f in tree if f["path"].lower() == path_cand or f["path"].lower().endswith(f"/{path_cand}")]
                if matching:
                    cfg_content = await gh_service.get_file_content(username, r_name, matching[0])
                    repo_cfgs[matching[0]] = cfg_content
            configs[r_name] = repo_cfgs

            commits = await gh_service.get_repository_commits(username, r_name, max_commits=15)
            all_commits.extend(commits)
        except GitHubRateLimitError:
            logger.warning("GitHub API rate limit reached during repo analysis; proceeding with retrieved data.")
            break
        except Exception as err:
            logger.warning(f"Skipping detail fetch for repo {r_name}: {err}")

    # Step 4: Match Resume Projects to Repositories
    resume_projects = [p for p in parsed_resume.get("projects", []) if isinstance(p, dict)]
    project_matches = []

    for p in resume_projects:
        ranked = match_project_to_repositories(p, repos, embedder)
        if ranked:
            top_repo, match_score, match_priority = ranked[0]
            r_name = top_repo["name"]
            try:
                langs = await gh_service.get_repository_languages(username, r_name)
            except Exception:
                langs = {}
            eval_res = evaluate_project_evidence(
                resume_project=p,
                repo=top_repo,
                readme_text=readmes.get(r_name, ""),
                tree_files=trees.get(r_name, []),
                languages=langs,
                match_type=match_priority,
                embedder=embedder,
            )
            project_matches.append(eval_res)
        else:
            p_name = (p.get("title") or p.get("name") or "Project").strip()
            project_matches.append({
                "project_name": p_name,
                "matched_repo_name": None,
                "repo_url": None,
                "overall_score": 0.0,
                "name_similarity": 0,
                "description_similarity": 0,
                "readme_similarity": 0,
                "technology_overlap": 0,
                "code_evidence": 0,
                "verified_technologies": [],
                "verification_status": "NOT_FOUND",
                "match_priority": "NONE",
            })

    # Step 5: Verify Technical Skills
    skills = parsed_resume.get("skills", [])
    skill_matches = []
    for skill in skills:
        ver_res = verify_skill_usage(
            skill=skill,
            repos=repos,
            readmes=readmes,
            file_trees=trees,
            configs=configs,
        )
        skill_matches.append(ver_res)

    # Step 6: Activity & Maturity Analytics
    activity = calculate_activity_metrics(all_commits, repos, profile)
    maturity = analyze_development_maturity(repos, all_commits, readmes, trees)
    authenticity = evaluate_authenticity_and_ai_risk(activity, maturity, repos, all_commits)

    # Step 7: Calculate Overall GitHub Evidence Score (0-100)
    verified_proj_cnt = sum(1 for pm in project_matches if pm["verification_status"] in ("VERIFIED", "PARTIALLY_VERIFIED"))
    proj_ver_score = (verified_proj_cnt / len(resume_projects) * 35.0) if resume_projects else 30.0

    verified_skill_cnt = sum(1 for sm in skill_matches if sm["verification_status"] in ("VERIFIED", "NOT_GITHUB_VERIFIABLE"))
    skill_ver_score = (verified_skill_cnt / len(skills) * 25.0) if skills else 20.0

    activity_pts = (activity["activity_score"] / 100.0) * 15.0
    maturity_pts = (maturity["maturity_score"] / 100.0) * 15.0

    github_evidence_score = round(proj_ver_score + skill_ver_score + activity_pts + maturity_pts + 10.0, 1)
    github_evidence_score = min(100.0, max(0.0, github_evidence_score))

    # Step 8: Enhanced ATS Score (100 pts)
    enhanced_ats_score = round((original_ats_score * 0.75) + (github_evidence_score * 0.25), 1)

    # Step 9: Cross-Validation Matrix & True Discrepancy Mismatches
    cross_validation_matrix = []
    mismatches = []

    for pm in project_matches:
        cross_validation_matrix.append({
            "claim": pm["project_name"],
            "github_evidence": pm["matched_repo_name"] or "No matching public repository",
            "match_score": pm["overall_score"],
            "confidence": "High" if pm["overall_score"] >= 75 else ("Moderate" if pm["overall_score"] >= 45 else "Low"),
            "status": pm["verification_status"],
        })
        if pm["verification_status"] == "NOT_FOUND":
            mismatches.append(f"Resume project '{pm['project_name']}' has no corresponding public repository on GitHub.")

    for sm in skill_matches:
        cross_validation_matrix.append({
            "claim": sm["skill"],
            "github_evidence": ", ".join(sm["evidence_sources"][:2]) if sm["evidence_sources"] else "No code/manifest evidence",
            "match_score": sm["evidence_score"],
            "confidence": "High" if sm["evidence_score"] >= 75 else ("Moderate" if sm["evidence_score"] >= 45 else "Low"),
            "status": sm["verification_status"],
        })
        # ONLY flag explicit contradictions, NEVER flag non-verifiable skills (Excel, Power BI, Agile) or unverified technical skills as false mismatches
        if sm.get("verification_status") == "CONTRADICTED":
            mismatches.append(f"Claimed skill '{sm['skill']}' is contradicted by repository code.")

    return {
        "is_available": True,
        "status_message": "GitHub Evidence analysis completed successfully.",
        "github_profile": profile,
        "github_evidence_score": github_evidence_score,
        "enhanced_ats_score": enhanced_ats_score,
        "original_ats_score": original_ats_score,
        "repositories_analyzed": len(repos),
        "relevant_repositories_count": len([r for r in repos if any(pm["matched_repo_name"] == r["name"] for pm in project_matches)]),
        "projects_verified_count": verified_proj_cnt,
        "total_projects_count": len(resume_projects),
        "skills_verified_count": verified_skill_cnt,
        "total_skills_count": len(skills),
        "project_matches": project_matches,
        "skill_matches": skill_matches,
        "activity_metrics": activity,
        "maturity_metrics": maturity,
        "authenticity_analysis": authenticity,
        "cross_validation_matrix": cross_validation_matrix,
        "mismatches": mismatches,
    }
