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
    "computer vision": ["computer vision", "cv", "opencv", "mediapipe", "yolo"],
    "data science": ["data science", "data analysis", "eda", "exploratory data analysis"],
    "artificial intelligence": ["artificial intelligence", "ai", "genai", "llm", "large language models", "groq", "openai", "agentic", "agentic workflows", "rag", "langchain"],
    "prompt engineering": ["prompt engineering", "prompting", "role prompting", "persona prompting", "few-shot prompting"],
    "llm apis": ["llm apis", "groq", "openai", "gpt", "llm api", "anthropic"],
    "agentic workflows": ["agentic workflows", "agentic", "ai agents", "langchain", "llamaindex", "autogen", "crewai"],
    "vector databases": ["vector databases", "vector database", "chromadb", "chroma", "pinecone", "qdrant", "weaviate", "faiss"],
    "guardrails & fallbacks": ["guardrails & fallbacks", "guardrails", "fallbacks", "nemo guardrails", "structured json output"],
    "structured json output": ["structured json output", "json output", "json parsing"],
    "text-to-speech": ["text-to-speech", "gtts", "tts", "speech synthesis"],
    "speaker recognition": ["speaker recognition", "resemblyzer", "voice recognition"],
    "audio processing": ["audio processing", "librosa", "torchaudio", "pydub"],
    "socket.io": ["socket.io", "websockets", "websocket"],
    "streamlit": ["streamlit"],
    "supabase": ["supabase"],
    "statistics": ["statistics", "statistical modeling"],

    # Data Engineering & BI
    "spark": ["spark", "apache spark", "pyspark"],
    "kafka": ["kafka", "apache kafka"],
    "hadoop": ["hadoop"],
    "etl": ["etl", "etl pipelines", "data pipeline", "data pipelines", "airflow"],
    "data cleaning & validation": ["data cleaning", "data validation", "data cleaning & validation", "data wrangling"],
    "power bi": ["power bi", "powerbi"],
    "tableau": ["tableau"],
    "excel": ["excel", "microsoft excel"],

    # Architecture & Core CS
    "algorithms": ["algorithms", "algorithmic problem solving", "dsa"],
    "data structures": ["data structures", "dsa", "leetcode"],
    "data structures & algorithms": ["data structures & algorithms", "dsa", "data structures", "algorithms"],
    "system design": ["system design", "software architecture", "distributed systems"],
    "object-oriented programming": ["oop", "object-oriented programming", "object oriented programming"],
    "dbms": ["dbms", "database management", "database management systems"],
    "operating systems": ["operating systems", "os"],
    "computer networks": ["computer networks", "networking"],

    # Testing & Tools
    "testing": ["testing", "unit testing", "integration testing", "test automation", "qa"],
    "pytest": ["pytest"],
    "jest": ["jest"],
    "selenium": ["selenium"],
    "cypress": ["cypress"],
    "hoppscotch": ["hoppscotch", "api testing", "postman"],
    "git": ["git", "github", "gitlab", "version control"],
    "github actions": ["github actions", "ci/cd", "continuous integration"],
    "jira": ["jira"],
    "agile": ["agile", "scrum", "kanban"],
    "cross-functional collaboration": ["cross-functional collaboration", "collaboration"],
    "pitching": ["pitching", "presentation"],
    "persuasion": ["persuasion"],
    "remote work": ["remote work"],
    "stakeholder communication": ["stakeholder communication", "communication"],
}

# Precompute alias map
SKILL_ALIASES: Dict[str, str] = {}
for primary, synonyms in SKILLS_DATABASE.items():
    SKILL_ALIASES[primary.lower()] = primary
    for syn in synonyms:
        SKILL_ALIASES[syn.lower()] = primary


def normalize_skill(skill: str) -> str:
    """Normalize a raw skill text to its canonical name."""
    if not skill:
        return ""
    cleaned = skill.strip().lower()
    return SKILL_ALIASES.get(cleaned, cleaned)


def expand_skill_variants(raw_skill: str) -> List[str]:
    """
    Given a raw skill name (e.g. 'LLM APIs (Groq, OpenAI)', 'Vector Databases (ChromaDB)', 'Data Structures & Algorithms'),
    generate a comprehensive set of search variants including canonical names, parenthetical terms, and acronyms.
    """
    if not raw_skill:
        return []

    variants = set()
    raw_lower = raw_skill.strip().lower()
    variants.add(raw_lower)

    # Extract parenthetical contents e.g. "AWS (EC2, S3)" -> "AWS" + ["EC2", "S3"]
    import re
    parentheticals = re.findall(r"\((.*?)\)", raw_skill)
    clean_base = re.sub(r"\(.*?\)", "", raw_skill).strip().lower()

    if clean_base:
        variants.add(clean_base)
        canon_base = normalize_skill(clean_base)
        variants.add(canon_base.lower())

    for paren in parentheticals:
        for part in paren.split(","):
            part_clean = part.strip().lower()
            if part_clean:
                variants.add(part_clean)

    # Check canonical synonyms from database
    canon = normalize_skill(raw_skill)
    variants.add(canon.lower())
    if canon.lower() in SKILLS_DATABASE:
        variants.update([s.lower() for s in SKILLS_DATABASE[canon.lower()]])

    # Common acronym and abbreviation splits
    if "&" in raw_lower:
        for p in raw_lower.split("&"):
            if p.strip():
                variants.add(p.strip())
    if "/" in raw_lower:
        for p in raw_lower.split("/"):
            if p.strip():
                variants.add(p.strip())

    return [v for v in variants if len(v) >= 2]


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
