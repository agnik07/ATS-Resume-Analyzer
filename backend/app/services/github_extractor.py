import re
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse


def normalize_github_url(url: str) -> Optional[str]:
    """Normalize raw GitHub URL string into standard HTTPS URL."""
    if not url:
        return None
    url = url.strip().rstrip("/").rstrip(".")
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    try:
        parsed = urlparse(url)
        hostname = parsed.netloc.lower()
        if "github.com" not in hostname:
            return None

        path_parts = [p for p in parsed.path.split("/") if p]
        if not path_parts:
            return None

        # Ignore non-user paths
        ignored_roots = {"about", "features", "pricing", "login", "signup", "explore", "topics", "trending"}
        if path_parts[0].lower() in ignored_roots:
            return None

        if len(path_parts) == 1:
            return f"https://github.com/{path_parts[0]}"
        else:
            return f"https://github.com/{path_parts[0]}/{path_parts[1]}"
    except Exception:
        return None


def extract_github_username_and_repos(text: str) -> Dict[str, any]:
    """
    Extract username, profile URL, and repository URLs from raw resume text.
    Handles formats:
    - https://github.com/username
    - http://github.com/username
    - github.com/username
    - https://www.github.com/username/repository
    """
    if not text:
        return {
            "github_username": None,
            "github_profile_url": None,
            "github_repository_urls": [],
        }

    # Match URLs & textual mentions
    github_pattern = r"(?:https?://)?(?:www\.)?github\.com/[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)?"
    matches = re.findall(github_pattern, text, re.IGNORECASE)

    profile_url = None
    username = None
    repo_urls = set()

    for raw in matches:
        normalized = normalize_github_url(raw)
        if not normalized:
            continue

        parts = normalized.replace("https://github.com/", "").split("/")
        if len(parts) >= 1 and parts[0]:
            candidate_user = parts[0]
            # Ignore generic placeholders
            if candidate_user.lower() not in {"username", "user", "yourusername", "example"}:
                if not username:
                    username = candidate_user
                    profile_url = f"https://github.com/{candidate_user}"
                elif candidate_user.lower() == username.lower() and len(parts) == 2:
                    repo_urls.add(normalized)

        if len(parts) == 2 and username and parts[0].lower() == username.lower():
            repo_urls.add(normalized)

    # Fallback pattern for username mentions like "GitHub: username" or "github @username"
    if not username:
        text_mention = re.search(r"(?:github|gh)\s*[:@-]?\s*([a-zA-Z0-9-]{1,39})", text, re.IGNORECASE)
        if text_mention:
            cand = text_mention.group(1).strip()
            if cand.lower() not in {"profile", "link", "url", "repo", "projects", "code", "account", "username"}:
                username = cand
                profile_url = f"https://github.com/{username}"

    return {
        "github_username": username,
        "github_profile_url": profile_url,
        "github_repository_urls": list(repo_urls),
    }
