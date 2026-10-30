"""Public request and response validation for synthetic research intake."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

SYNTHETIC_CODE = r"^SYN-[A-Z0-9_-]{3,60}$"


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


class ParticipantCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    study_id: uuid.UUID
    study_code: str = Field(min_length=7, max_length=64, pattern=SYNTHETIC_CODE)


class ConsentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_version: str = Field(min_length=7, max_length=64, pattern=SYNTHETIC_CODE)
    purpose_code: str = Field(min_length=7, max_length=64, pattern=SYNTHETIC_CODE)
    decision: Literal["granted", "refused", "withdrawn"]
    photo_scope: bool = False
    change_reason: str | None = Field(default=None, max_length=64, pattern=SYNTHETIC_CODE)

    @model_validator(mode="after")
    def photo_requires_grant(self) -> "ConsentCreate":
        if self.photo_scope and self.decision != "granted":
            raise ValueError("photo scope requires granted decision")
        return self


class ConsentView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    participant_id: uuid.UUID
    document_version: str
    purpose_code: str
    decision: Literal["granted", "refused", "withdrawn"]
    photo_scope: bool
    change_reason: str | None
    recorded_by: uuid.UUID
    recorded_at: datetime


class ConsentHistory(BaseModel):
    state: Literal["not_recorded", "granted", "refused", "withdrawn"]
    records: list[ConsentView]


class ScreeningCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    item_code: str = Field(min_length=7, max_length=64, pattern=SYNTHETIC_CODE)
    answer: Literal["yes", "no", "unknown"]
    change_reason: str | None = Field(default=None, max_length=64, pattern=SYNTHETIC_CODE)


class ScreeningView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    participant_id: uuid.UUID
    item_code: str
    answer: Literal["yes", "no", "unknown"]
    change_reason: str | None
    recorded_by: uuid.UUID
    recorded_at: datetime


class ScreeningHistory(BaseModel):
    review_state: Literal["not_assessed", "needs_review"]
    records: list[ScreeningView]
