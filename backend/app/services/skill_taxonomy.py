from typing import Dict, List, Set
from rapidfuzz import fuzz

SKILLS_DATABASE: Dict[str, List[str]] = {
    # Programming Languages
    "python": ["python", "python3", "py", "python programming", "django", "flask", "fastapi"],
    "javascript": ["javascript", "js", "es6", "ecmascript", "node.js", "nodejs", "node"],
    "typescript": ["typescript", "ts"],
    "java": ["java", "java programming", "j2ee", "java ee", "spring", "spring boot", "springboot"],
    "c++": ["c++", "cpp", "c plus plus"],
    "c#": ["c#", "csharp", "c sharp", ".net", "dotnet", "asp.net"],
    "go": ["go", "golang"],
    "rust": ["rust"],
    "ruby": ["ruby", "ruby on rails", "rails", "ror"],
    "php": ["php", "laravel", "symfony"],
    "swift": ["swift", "swiftui"],
    "kotlin": ["kotlin"],
    "scala": ["scala"],
    "r": ["r", "r programming"],
    "sql": ["sql", "structured query language", "pl/sql", "t-sql"],

    # Frontend Technologies
    "react": ["react", "reactjs", "react.js", "react native"],
    "angular": ["angular", "angularjs"],
    "vue": ["vue", "vuejs", "vue.js"],
    "next.js": ["next.js", "nextjs", "next"],
    "svelte": ["svelte"],
    "html": ["html", "html5"],
    "css": ["css", "css3"],
    "tailwind": ["tailwind", "tailwindcss"],
    "bootstrap": ["bootstrap"],
    "sass": ["sass", "scss"],
    "redux": ["redux", "redux toolkit"],
    "webpack": ["webpack", "vite"],

    # Backend Frameworks
    "fastapi": ["fastapi"],
    "django": ["django", "django rest framework", "drf"],
    "flask": ["flask"],
    "express": ["express", "express.js", "expressjs"],
    "spring boot": ["spring boot", "springboot", "spring"],
    "nest.js": ["nest.js", "nestjs"],
    "graphql": ["graphql", "apollo"],
    "rest api": ["rest api", "restful api", "restful", "rest"],
    "microservices": ["microservices", "micro services"],

    # Databases
    "postgresql": ["postgresql", "postgres", "psql"],
    "mongodb": ["mongodb", "mongo"],
    "mysql": ["mysql"],
    "redis": ["redis"],
    "sqlite": ["sqlite"],
    "elasticsearch": ["elasticsearch", "elastic search"],
    "dynamodb": ["dynamodb"],
    "cassandra": ["cassandra"],
    "oracle": ["oracle", "oracle database"],
    "nosql": ["nosql", "no sql"],

    # Cloud & DevOps
    "aws": ["aws", "amazon web services", "ec2", "s3", "lambda"],
    "azure": ["azure", "microsoft azure"],
    "gcp": ["gcp", "google cloud", "google cloud platform"],
    "docker": ["docker", "containerization"],
    "kubernetes": ["kubernetes", "k8s"],
    "ci/cd": ["ci/cd", "continuous integration", "continuous deployment", "github actions", "gitlab ci"],
    "jenkins": ["jenkins"],
    "terraform": ["terraform"],
    "ansible": ["ansible"],
    "linux": ["linux", "unix", "bash", "shell scripting"],

    # Data Science & AI / ML
    "machine learning": ["machine learning", "ml", "scikit-learn", "sklearn"],
    "deep learning": ["deep learning", "dl", "neural networks", "cnn", "rnn", "lstm", "transformers"],
    "tensorflow": ["tensorflow", "tf"],
    "pytorch": ["pytorch", "torch"],
    "keras": ["keras"],
    "pandas": ["pandas"],
    "numpy": ["numpy"],
    "natural language processing": ["nlp", "natural language processing", "spacy", "nltk", "hugging face", "huggingface"],
    "computer vision": ["computer vision", "cv", "opencv"],
    "data science": ["data science", "data analysis"],
    "artificial intelligence": ["artificial intelligence", "ai", "genai", "llm", "large language models"],
    "statistics": ["statistics", "statistical modeling"],

    # Data Engineering & BI
    "spark": ["spark", "apache spark", "pyspark"],
    "kafka": ["kafka", "apache kafka"],
    "hadoop": ["hadoop"],
    "etl": ["etl", "data pipeline", "airflow"],
    "power bi": ["power bi", "powerbi"],
    "tableau": ["tableau"],
    "excel": ["excel", "microsoft excel"],

    # Architecture & Core CS
    "algorithms": ["algorithms", "algorithmic problem solving"],
    "data structures": ["data structures", "dsa"],
    "system design": ["system design", "software architecture", "distributed systems"],
    "object-oriented programming": ["oop", "object-oriented programming"],

    # Testing & Tools
    "testing": ["testing", "unit testing", "integration testing", "test automation", "qa"],
    "pytest": ["pytest"],
    "jest": ["jest"],
    "selenium": ["selenium"],
    "cypress": ["cypress"],
    "git": ["git", "github", "gitlab", "version control"],
    "jira": ["jira"],
    "agile": ["agile", "scrum", "kanban"],
}

# Precompute alias map
SKILL_ALIASES: Dict[str, str] = {}
for primary, synonyms in SKILLS_DATABASE.items():
    SKILL_ALIASES[primary.lower()] = primary
    for syn in synonyms:
        SKILL_ALIASES[syn.lower()] = primary


def normalize_skill(skill: str) -> str:
    """Normalize a raw skill text to its canonical name."""
    cleaned = skill.strip().lower()
    return SKILL_ALIASES.get(cleaned, cleaned)


def get_all_skills() -> List[str]:
    """Get all unique primary canonical skills."""
    return list(SKILLS_DATABASE.keys())


def fuzzy_match_keywords(
    resume_keywords: List[str],
    jd_keywords: List[str],
    threshold: int = 80,
) -> Dict[str, List[str]]:
    """
    Match candidate keywords against job description keywords using exact & RapidFuzz matching.
    """
    resume_normalized = {normalize_skill(kw): kw for kw in resume_keywords if kw}
    jd_normalized = {normalize_skill(kw): kw for kw in jd_keywords if kw}

    matched_jd_originals = []
    missing_jd_originals = []

    for jd_canon, jd_original in jd_normalized.items():
        # 1. Exact canonical match
        if jd_canon in resume_normalized:
            matched_jd_originals.append(jd_original)
            continue

        # 2. RapidFuzz token sort match
        best_score = 0
        for resume_canon in resume_normalized:
            score = fuzz.token_sort_ratio(jd_canon, resume_canon)
            if score > best_score:
                best_score = score

        if best_score >= threshold:
            matched_jd_originals.append(jd_original)
        else:
            missing_jd_originals.append(jd_original)

    return {
        "matched": sorted(list(set(matched_jd_originals))),
        "missing": sorted(list(set(missing_jd_originals))),
    }
