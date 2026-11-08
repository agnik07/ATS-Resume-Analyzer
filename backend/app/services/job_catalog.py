from typing import Any, Dict, List, Optional
from rapidfuzz import fuzz

JOB_CATALOG: Dict[str, Dict[str, Any]] = {
    "amazon_sde": {
        "company": "Amazon",
        "role": "SDE (Software Development Engineer)",
        "description": "Amazon backend engineering position for highly scalable retail and AWS services.",
        "skills": ["java", "python", "aws", "algorithms", "data structures", "system design", "microservices", "rest api", "docker", "linux", "dynamodb", "nosql", "git"],
    },
    "amazon_data_scientist": {
        "company": "Amazon",
        "role": "Data Scientist",
        "description": "Amazon data science role focusing on predictive modeling and machine learning.",
        "skills": ["python", "sql", "machine learning", "statistics", "pandas", "numpy", "aws", "sagemaker", "tableau", "deep learning", "etl"],
    },
    "amazon_aiml_engineer": {
        "company": "Amazon",
        "role": "AI/ML Engineer",
        "description": "Build large-scale machine learning and AI inference systems at Amazon.",
        "skills": ["python", "pytorch", "tensorflow", "aws", "sagemaker", "llm", "natural language processing", "computer vision", "docker", "algorithms"],
    },
    "google_software_engineer": {
        "company": "Google",
        "role": "Software Engineer",
        "description": "Google is seeking experienced software engineers to build scalable distributed systems.",
        "skills": ["python", "java", "c++", "javascript", "algorithms", "data structures", "system design", "distributed systems", "rest api", "testing", "git", "linux", "sql", "docker", "kubernetes", "microservices"],
    },
    "google_data_scientist": {
        "company": "Google",
        "role": "Data Scientist",
        "description": "Join Google as a Data Scientist to extract insights from massive datasets.",
        "skills": ["python", "sql", "machine learning", "statistics", "pandas", "numpy", "tensorflow", "data science", "tableau", "deep learning", "natural language processing"],
    },
    "microsoft_software_engineer": {
        "company": "Microsoft",
        "role": "Software Engineer",
        "description": "Microsoft seeks talented engineers to build cloud-native applications on Azure.",
        "skills": ["c#", "azure", "javascript", "typescript", "react", "sql", "git", "rest api", "microservices", "docker", "kubernetes", ".net"],
    },
    "microsoft_data_scientist": {
        "company": "Microsoft",
        "role": "Data Scientist",
        "description": "Microsoft Azure AI & Data Science team position.",
        "skills": ["python", "sql", "azure", "machine learning", "pandas", "numpy", "scikit-learn", "statistics", "power bi"],
    },
    "meta_software_engineer": {
        "company": "Meta",
        "role": "Software Engineer",
        "description": "Meta core engineering position for distributed social platforms and infrastructure.",
        "skills": ["python", "c++", "java", "system design", "algorithms", "data structures", "distributed systems", "graphql", "sql", "git"],
    },
    "meta_frontend_engineer": {
        "company": "Meta",
        "role": "Frontend Engineer",
        "description": "Build next-generation responsive web and mobile interfaces at Meta.",
        "skills": ["javascript", "typescript", "react", "graphql", "html", "css", "tailwind", "redux", "jest", "web performance"],
    },
    "netflix_backend_engineer": {
        "company": "Netflix",
        "role": "Backend Engineer",
        "description": "Scale video streaming architectures and microservices globally.",
        "skills": ["java", "python", "aws", "microservices", "kafka", "distributed systems", "docker", "kubernetes", "redis", "postgresql"],
    },
    "apple_software_engineer": {
        "company": "Apple",
        "role": "Software Engineer",
        "description": "Create high-performance software frameworks and operating system services for Apple platforms.",
        "skills": ["c++", "swift", "python", "system design", "algorithms", "data structures", "operating systems", "git", "rest api"],
    },
    "apple_ios_engineer": {
        "company": "Apple",
        "role": "iOS Software Engineer",
        "description": "Create high-performance iOS applications and frameworks.",
        "skills": ["swift", "ios", "objective-c", "xcode", "rest api", "git", "system design", "algorithms", "data structures"],
    },
}


def get_static_job(company: str, role: str) -> Optional[Dict[str, Any]]:
    """Find pre-configured company + role definition with flexible fuzzy matching."""
    if not company or not role:
        return None
    comp_clean = company.strip().lower()
    role_clean = role.strip().lower()

    # 1. Exact company + role match or containment
    for key, data in JOB_CATALOG.items():
        if data["company"].lower() == comp_clean:
            cat_role = data["role"].lower()
            if role_clean in cat_role or cat_role in role_clean:
                return data

    # 2. Fuzzy role match for the same company
    best_match = None
    best_score = 0
    for key, data in JOB_CATALOG.items():
        if data["company"].lower() == comp_clean:
            cat_role = data["role"].lower()
            score = max(
                fuzz.ratio(role_clean, cat_role),
                fuzz.token_set_ratio(role_clean, cat_role),
                fuzz.partial_ratio(role_clean, cat_role)
            )
            if score > best_score:
                best_score = score
                best_match = data

    if best_score >= 50:
        return best_match

    # 3. Generic role match across any company if company has no specific entry
    for key, data in JOB_CATALOG.items():
        cat_role = data["role"].lower()
        if role_clean in cat_role or cat_role in role_clean:
            return {
                "company": company.strip(),
                "role": data["role"],
                "description": data["description"],
                "skills": data["skills"],
            }

    return None


def list_companies() -> List[str]:
    """List unique company names in catalog."""
    return sorted(list(set(d["company"] for d in JOB_CATALOG.values())))


def list_roles(company: Optional[str] = None) -> List[str]:
    """List roles in catalog, optionally filtered by company."""
    if company:
        comp_clean = company.strip().lower()
        roles = [d["role"] for d in JOB_CATALOG.values() if d["company"].lower() == comp_clean]
        if roles:
            return sorted(list(set(roles)))
    return sorted(list(set(d["role"] for d in JOB_CATALOG.values())))
