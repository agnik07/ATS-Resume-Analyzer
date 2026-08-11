from typing import Any, Dict, List, Optional

JOB_CATALOG: Dict[str, Dict[str, Any]] = {
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
    "amazon_sde": {
        "company": "Amazon",
        "role": "SDE (Software Development Engineer)",
        "description": "Amazon backend engineering position for highly scalable retail and AWS services.",
        "skills": ["java", "python", "aws", "algorithms", "data structures", "system design", "microservices", "rest api", "docker", "linux", "dynamodb", "nosql"],
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
    "apple_ios_engineer": {
        "company": "Apple",
        "role": "iOS Software Engineer",
        "description": "Create high-performance iOS applications and frameworks.",
        "skills": ["swift", "ios", "objective-c", "xcode", "rest api", "git", "system design", "algorithms", "data structures"],
    },
}


def get_static_job(company: str, role: str) -> Optional[Dict[str, Any]]:
    """Find pre-configured company + role definition."""
    comp_clean = company.strip().lower()
    role_clean = role.strip().lower()

    for key, data in JOB_CATALOG.items():
        if data["company"].lower() == comp_clean and role_clean in data["role"].lower():
            return data
    return None


def list_companies() -> List[str]:
    """List unique company names in catalog."""
    return sorted(list(set(d["company"] for d in JOB_CATALOG.values())))


def list_roles(company: Optional[str] = None) -> List[str]:
    """List roles in catalog, optionally filtered by company."""
    if company:
        comp_clean = company.strip().lower()
        return [d["role"] for d in JOB_CATALOG.values() if d["company"].lower() == comp_clean]
    return [d["role"] for d in JOB_CATALOG.values()]
