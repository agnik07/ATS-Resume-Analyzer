import os
import time
import logging
import base64
from typing import Any, Dict, List, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

# Simple in-memory cache to avoid redundant API hits (TTL: 3600s)
_CACHE: Dict[str, Tuple[float, Any]] = {}
CACHE_TTL = 3600


class GitHubServiceError(Exception):
    pass


class GitHubRateLimitError(GitHubServiceError):
    pass


class GitHubUserNotFoundError(GitHubServiceError):
    pass


class GitHubService:
    def __init__(self, token: Optional[str] = None):
        self.token = token or getattr(settings, "GITHUB_TOKEN", None) or os.getenv("GITHUB_TOKEN")
        self.base_url = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "SkillGap-AI-ATS-Analyzer/3.0",
        }
        if self.token and self.token.strip():
            self.headers["Authorization"] = f"token {self.token.strip()}"

    def _get_cache(self, key: str) -> Optional[Any]:
        if key in _CACHE:
            timestamp, data = _CACHE[key]
            if time.time() - timestamp < CACHE_TTL:
                return data
            else:
                del _CACHE[key]
        return None

    def _set_cache(self, key: str, data: Any):
        _CACHE[key] = (time.time(), data)

    async def _make_request(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Any:
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        cache_key = f"{url}?{params}"
        cached = self._get_cache(cache_key)
        if cached is not None:
            return cached

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.get(url, headers=self.headers, params=params)
                
                # Rate limit tracking
                remaining = response.headers.get("X-RateLimit-Remaining")
                if remaining and int(remaining) == 0:
                    reset_time = response.headers.get("X-RateLimit-Reset", "0")
                    logger.warning(f"GitHub API rate limit exhausted. Resets at epoch {reset_time}")
                    raise GitHubRateLimitError("GitHub API rate limit exceeded.")

                if response.status_code == 404:
                    raise GitHubUserNotFoundError(f"Resource not found at {endpoint}")

                if response.status_code == 403:
                    if "rate limit exceeded" in response.text.lower():
                        raise GitHubRateLimitError("GitHub API rate limit exceeded.")
                    raise GitHubServiceError(f"Access forbidden: {response.text}")

                response.raise_for_status()
                data = response.json()
                self._set_cache(cache_key, data)
                return data
            except httpx.HTTPStatusError as e:
                logger.error(f"GitHub API HTTP error {e.response.status_code} for {url}: {e}")
                raise GitHubServiceError(f"HTTP error {e.response.status_code}") from e
            except httpx.RequestError as e:
                logger.error(f"GitHub API connection error for {url}: {e}")
                raise GitHubServiceError(f"Connection error to GitHub API: {e}") from e

    async def get_user_profile(self, username: str) -> Dict[str, Any]:
        """Fetch user public profile details."""
        data = await self._make_request(f"users/{username}")
        return {
            "username": data.get("login", username),
            "name": data.get("name") or data.get("login", username),
            "profile_url": data.get("html_url", f"https://github.com/{username}"),
            "avatar_url": data.get("avatar_url"),
            "bio": data.get("bio", ""),
            "public_repos": data.get("public_repos", 0),
            "followers": data.get("followers", 0),
            "following": data.get("following", 0),
            "created_at": data.get("created_at"),
            "updated_at": data.get("updated_at"),
            "location": data.get("location"),
            "company": data.get("company"),
            "blog": data.get("blog"),
        }

    async def get_user_repositories(self, username: str, max_repos: int = 30) -> List[Dict[str, Any]]:
        """Fetch public repositories sorted by updated date."""
        params = {"sort": "updated", "direction": "desc", "per_page": min(max_repos, 100)}
        repos_raw = await self._make_request(f"users/{username}/repos", params=params)
        
        repos = []
        for r in repos_raw:
            if not isinstance(r, dict) or r.get("fork", False):  # Focus primarily on non-forked original repos
                continue
            repos.append({
                "github_repo_id": str(r.get("id")),
                "name": r.get("name"),
                "full_name": r.get("full_name"),
                "url": r.get("html_url"),
                "description": r.get("description") or "",
                "language": r.get("language") or "",
                "topics": r.get("topics", []),
                "stars": r.get("stargazers_count", 0),
                "forks": r.get("forks_count", 0),
                "watchers": r.get("watchers_count", 0),
                "open_issues": r.get("open_issues_count", 0),
                "default_branch": r.get("default_branch", "main"),
                "created_at": r.get("created_at"),
                "updated_at": r.get("updated_at"),
                "pushed_at": r.get("pushed_at"),
                "size_kb": r.get("size", 0),
                "is_fork": r.get("fork", False),
            })
        return repos

    async def get_repository_readme(self, username: str, repo_name: str) -> str:
        """Fetch decoded README text content for a repository."""
        try:
            data = await self._make_request(f"repos/{username}/{repo_name}/readme")
            content = data.get("content", "")
            encoding = data.get("encoding", "")
            if encoding == "base64" and content:
                decoded = base64.b64decode(content).decode("utf-8", errors="ignore")
                return decoded[:20000]  # Cap at 20k chars
            return content[:20000]
        except Exception as e:
            logger.debug(f"No README found for {username}/{repo_name}: {e}")
            return ""

    async def get_repository_languages(self, username: str, repo_name: str) -> Dict[str, int]:
        """Fetch language breakdown in bytes."""
        try:
            return await self._make_request(f"repos/{username}/{repo_name}/languages")
        except Exception:
            return {}

    async def get_repository_tree(self, username: str, repo_name: str, branch: str = "main") -> List[Dict[str, Any]]:
        """Fetch recursive file tree (up to 1000 items)."""
        try:
            data = await self._make_request(f"repos/{username}/{repo_name}/git/trees/{branch}", params={"recursive": "1"})
            tree = data.get("tree", [])
            return [
                {
                    "path": item.get("path"),
                    "type": item.get("type"),  # "blob" or "tree"
                    "size": item.get("size", 0),
                    "url": item.get("url"),
                }
                for item in tree
                if isinstance(item, dict)
            ][:1000]
        except Exception as e:
            logger.debug(f"Could not fetch tree for {username}/{repo_name} branch {branch}: {e}")
            return []

    async def get_file_content(self, username: str, repo_name: str, path: str) -> str:
        """Fetch decoded text content of a single file in repository."""
        try:
            data = await self._make_request(f"repos/{username}/{repo_name}/contents/{path.lstrip('/')}")
            content = data.get("content", "")
            encoding = data.get("encoding", "")
            if encoding == "base64" and content:
                return base64.b64decode(content).decode("utf-8", errors="ignore")[:30000]
            return content[:30000]
        except Exception as e:
            logger.debug(f"Could not fetch content for {username}/{repo_name}/{path}: {e}")
            return ""

    async def get_repository_commits(self, username: str, repo_name: str, max_commits: int = 100) -> List[Dict[str, Any]]:
        """Fetch commit history for a repository."""
        try:
            raw_commits = await self._make_request(
                f"repos/{username}/{repo_name}/commits",
                params={"per_page": min(max_commits, 100)}
            )
            commits = []
            for c in raw_commits:
                if not isinstance(c, dict):
                    continue
                commit_info = c.get("commit", {})
                author_info = commit_info.get("author", {})
                commits.append({
                    "sha": c.get("sha"),
                    "author_name": author_info.get("name"),
                    "author_email": author_info.get("email"),
                    "committed_at": author_info.get("date"),
                    "message": commit_info.get("message", "")[:200],
                })
            return commits
        except Exception as e:
            logger.debug(f"Could not fetch commits for {username}/{repo_name}: {e}")
            return []
