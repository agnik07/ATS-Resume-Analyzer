from datetime import datetime
from typing import Any, Dict, List
from pydantic import BaseModel


class CareerTestQuestion(BaseModel):
    id: int
    question: str
    options: List[str]


class CareerTestAnswer(BaseModel):
    question_id: int
    answer: str


class CareerTestSubmission(BaseModel):
    answers: List[CareerTestAnswer]


class CareerTestResultResponse(BaseModel):
    id: str
    career_path: str
    explanation: str
    strengths: List[str]
    suggested_skills: List[str]
    created_at: datetime
