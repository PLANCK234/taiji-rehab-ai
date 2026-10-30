"""Public request and response validation for authentication scope."""

import uuid

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=1024)


class UserView(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: str


class StudyView(BaseModel):
    id: uuid.UUID
    code: str


class ParticipantView(BaseModel):
    id: uuid.UUID
    study_id: uuid.UUID
    study_code: str
