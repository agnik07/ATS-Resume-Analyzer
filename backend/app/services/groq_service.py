import json
import logging
import re
from typing import Any, Dict, List, Optional
from groq import Groq
from app.core.config import settings
from app.services.skill_taxonomy import normalize_skill, SKILLS_DATABASE

logger = logging.getLogger(__name__)

_groq_client: Optional[Groq] = None


def get_groq_client() -> Optional[Groq]:
    """Obtain or initialize Groq client."""
    global _groq_client
    if _groq_client is None:
        if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
            try:
                _groq_client = Groq(api_key=settings.GROQ_API_KEY)
            except Exception as e:
                logger.warning(f"Failed to initialize Groq client: {e}")
                return None
    return _groq_client


def _try_parse_json(text: str) -> Optional[dict]:
    """Safely parse JSON response from LLM, stripping markdown code fences."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        first_newline = cleaned.index("\n") if "\n" in cleaned else len(cleaned)
        cleaned = cleaned[first_newline + 1 :]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(cleaned[start : end + 1])
            except Exception:
                pass
        return None


def _call_groq(system_prompt: str, user_prompt: str, model: Optional[str] = None) -> Optional[str]:
    """Invoke Groq API chat completion."""
    client = get_groq_client()
    if not client:
        return None

    model_name = model or settings.GROQ_PRIMARY_MODEL
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_tokens=4096,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.warning(f"Groq API call failed: {e}")
        return None


def _rule_based_resume_parser(raw_text: str) -> Dict[str, Any]:
    """Deterministic fallback parser if Groq LLM is offline or unavailable."""
    text_lower = raw_text.lower()

    # Extract email
    email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", raw_text)
    email = email_match.group(0) if email_match else None

    # Extract phone
    phone_match = re.search(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", raw_text)
    phone = phone_match.group(0) if phone_match else None

    # Extract LinkedIn & GitHub
    linkedin = None
    linkedin_match = re.search(r"linkedin\.com/in/[\w-]+", raw_text, re.IGNORECASE)
    if linkedin_match:
        linkedin = f"https://{linkedin_match.group(0)}"

    github = None
    github_match = re.search(r"github\.com/[\w-]+", raw_text, re.IGNORECASE)
    if github_match:
        github = f"https://{github_match.group(0)}"

    # Extract Skills
    detected_skills = set()
    for primary, syns in SKILLS_DATABASE.items():
        if primary in text_lower or any(s in text_lower for s in syns):
            detected_skills.add(primary)

    # Action verbs
    known_verbs = [
        "developed", "built", "implemented", "designed", "architected", "engineered",
        "optimized", "scaled", "created", "led", "managed", "deployed", "enhanced",
        "collaborated", "configured", "debugged", "maintained", "migrated"
    ]
    detected_verbs = [v for v in known_verbs if v in text_lower]

    return {
        "name": raw_text.split("\n")[0][:60].strip() if raw_text else "Candidate",
        "email": email,
        "phone": phone,
        "linkedin": linkedin,
        "github": github,
        "professional_summary": "",
        "skills": list(detected_skills),
        "experience": [],
        "education": [],
        "certifications": [],
        "projects": [],
        "action_verbs": detected_verbs,
        "keywords": list(detected_skills),
    }


def parse_resume_structure(raw_text: str) -> Dict[str, Any]:
    """Parse unstructured resume text into a normalized, structured JSON schema."""
    system_prompt = (
        "You are an expert resume parser. Extract structured entity information "
        "from the provided resume text and output ONLY valid JSON without markdown fences."
    )

    user_prompt = f"""Extract the following information from this resume and return as JSON:
{{
  "name": "Candidate Full Name",
  "email": "email address or null",
  "phone": "phone number or null",
  "linkedin": "LinkedIn URL or null",
  "github": "GitHub URL or null",
  "professional_summary": "Summary/Objective paragraph text or empty string",
  "skills": ["list", "of", "all", "technical", "and", "soft", "skills"],
  "experience": [
    {{
      "job_title": "Title",
      "company": "Company",
      "start_date": "Date",
      "end_date": "Date or Present",
      "duration_months": 0,
      "description": "bullet points and responsibilities"
    }}
  ],
  "education": [
    {{
      "degree": "Degree/Major",
      "institution": "University/College",
      "year": "Graduation year"
    }}
  ],
  "certifications": ["List of certifications"],
  "projects": [
    {{
      "title": "Project name",
      "description": "What it does and what was built",
      "technologies": ["tech", "used"]
    }}
  ],
  "action_verbs": ["strong action verbs used, e.g. developed, built, architected"],
  "keywords": ["important ATS keywords, tools, concepts, domain terms"]
}}

Resume Text:
{raw_text[:7000]}"""

    raw_response = _call_groq(system_prompt, user_prompt)
    if raw_response:
        result = _try_parse_json(raw_response)
        if result and isinstance(result, dict):
            skills = result.get("skills", [])
            if isinstance(skills, list):
                result["skills"] = [normalize_skill(s) for s in skills if s]
            return _validate_resume_dict(result)

    return _rule_based_resume_parser(raw_text)


def _validate_resume_dict(data: dict) -> dict:
    """Ensure all required keys exist and have valid types."""
    defaults = {
        "name": "Candidate",
        "email": None,
        "phone": None,
        "linkedin": None,
        "github": None,
        "professional_summary": "",
        "skills": [],
        "experience": [],
        "education": [],
        "certifications": [],
        "projects": [],
        "action_verbs": [],
        "keywords": [],
    }
    for k, v in defaults.items():
        if k not in data or data[k] is None:
            data[k] = v
        elif isinstance(v, list) and not isinstance(data[k], list):
            data[k] = [str(data[k])]

    for exp in data.get("experience", []):
        if isinstance(exp, dict):
            try:
                exp["duration_months"] = int(exp.get("duration_months", 0))
            except Exception:
                exp["duration_months"] = 0

    return data


def parse_job_description(raw_text: str) -> Dict[str, Any]:
    """Parse unstructured Job Description text into structured requirements."""
    system_prompt = (
        "You are an expert technical job description analyzer. Extract requirements "
        "and return ONLY valid JSON without markdown fences."
    )

    user_prompt = f"""Extract requirements from this Job Description and return as JSON:
{{
  "job_title": "Role title",
  "required_skills": ["must-have required skills"],
  "preferred_skills": ["nice-to-have or bonus skills"],
  "experience_required": "e.g., 2+ years",
  "education_required": "e.g., Bachelor's in CS",
  "key_responsibilities": ["list of responsibilities"],
  "keywords": ["all relevant technical and domain keywords for ATS matching"]
}}

Job Description:
{raw_text[:5000]}"""

    raw_response = _call_groq(system_prompt, user_prompt)
    if raw_response:
        result = _try_parse_json(raw_response)
        if result and isinstance(result, dict):
            return result

    text_lower = raw_text.lower()
    detected_skills = [
        primary for primary, syns in SKILLS_DATABASE.items()
        if primary in text_lower or any(s in text_lower for s in syns)
    ]
    return {
        "job_title": "Software Professional",
        "required_skills": detected_skills[:10],
        "preferred_skills": detected_skills[10:15],
        "experience_required": "Not specified",
        "education_required": "Not specified",
        "key_responsibilities": [],
        "keywords": detected_skills,
    }


def summarize_candidate_profile(
    candidate_name: str,
    resume_text: str,
    skills: List[str],
    target_role: str,
) -> str:
    """Generate concise Groq AI summary of candidate profile."""
    system_prompt = "You are an executive technical recruiter. Summarize the candidate's core strengths and fit in 3-4 concise sentences."
    user_prompt = f"Candidate: {candidate_name}\nTarget Role: {target_role}\nSkills: {', '.join(skills)}\nResume: {resume_text[:2000]}"
    res = _call_groq(system_prompt, user_prompt)
    if res:
        return res
    return f"{candidate_name} possesses demonstrated experience in {', '.join(skills[:5])}, showing strong technical foundations for the {target_role} position."


def generate_candidate_interview_questions(
    candidate_name: str,
    target_role: str,
    missing_skills: List[str],
    experience_summary: str,
) -> List[str]:
    """Generate role-specific interview questions via Groq LLM."""
    system_prompt = "You are a lead technical interviewer. Generate 5 focused technical and behavioral interview questions."
    user_prompt = f"Candidate: {candidate_name}\nRole: {target_role}\nFocus Areas / Missing Skills: {', '.join(missing_skills)}\nExperience: {experience_summary}"
    res = _call_groq(system_prompt, user_prompt)
    if res:
        lines = [line.strip().lstrip("1234567890.- ") for line in res.split("\n") if line.strip()]
        return [l for l in lines if len(l) > 10][:5]
    return [
        f"How have you applied {target_role} methodologies in past projects?",
        "Can you walk us through a complex system design or engineering challenge you resolved?",
        f"How would you quickly ramp up on {missing_skills[0] if missing_skills else 'new tools'}?",
        "Describe your approach to code reviews, testing, and production deployment.",
        "Tell us about a time you had to balance technical debt with urgent product delivery.",
    ]


def generate_candidate_summary_and_questions(
    candidate_name: str,
    resume_data: dict,
    job_title: str,
    job_description: str,
    ats_score: float,
    match_percentage: float,
) -> Dict[str, Any]:
    """Generate an AI executive summary and custom technical interview questions for recruiters."""
    system_prompt = (
        "You are a Senior Technical Recruiter and Hiring Manager. "
        "Provide a concise executive candidate assessment and tailored interview questions. "
        "Return ONLY valid JSON without markdown fences."
    )

    skills_str = ", ".join(resume_data.get("skills", []))
    exp_summary = "; ".join(
        [f"{e.get('job_title')} at {e.get('company')}" for e in resume_data.get("experience", [])[:3] if isinstance(e, dict)]
    )

    user_prompt = f"""Assess this candidate for the role: {job_title}
ATS Score: {ats_score}/100 | Skill Match: {match_percentage}%
Candidate Name: {candidate_name}
Skills: {skills_str}
Experience: {exp_summary}

Job Description Context:
{job_description[:1500]}

Return JSON:
{{
  "executive_summary": "3-4 sentence evaluation of candidate fit, strengths, and potential gaps.",
  "key_strengths": ["Top 3 standout qualities"],
  "potential_risks": ["1-2 areas to probe or missing prerequisites"],
  "technical_interview_questions": [
    "Technical question 1 focused on their claimed skills",
    "Technical question 2 on architecture or practical experience",
    "System design / problem solving question 3"
  ],
  "behavioral_questions": [
    "Behavioral question 1",
    "Behavioral question 2"
  ]
}}"""

    raw_response = _call_groq(system_prompt, user_prompt)
    if raw_response:
        result = _try_parse_json(raw_response)
        if result and isinstance(result, dict):
            return result

    return {
        "executive_summary": (
            f"{candidate_name} exhibits a {match_percentage:.0f}% skill match for {job_title} "
            f"with an ATS compatibility score of {ats_score:.0f}/100. "
            f"Demonstrated core proficiency in {', '.join(resume_data.get('skills', [])[:4])}."
        ),
        "key_strengths": [
            f"Strong background in {', '.join(resume_data.get('skills', [])[:3])}",
            "Demonstrated practical project and experience foundations",
            "Clear technical skill taxonomy alignment",
        ],
        "potential_risks": ["Verify depth of hands-on experience in recent technologies."],
        "technical_interview_questions": [
            f"Can you explain your experience using {resume_data.get('skills', ['relevant technologies'])[0]} in production?",
            "How do you approach debugging and performance optimization in your stack?",
            "Describe the architecture of a complex project you developed recently.",
        ],
        "behavioral_questions": [
            "Tell me about a time you encountered an unexpected technical roadblock and how you resolved it.",
            "How do you prioritize competing deadlines across multiple deliverables?",
        ],
    }
