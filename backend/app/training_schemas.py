"""Manual observations only; no prescribed training or safety classification."""

import uuid
from datetime import datetime, timezone
from typing import Literal

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    field_validator,
    model_validator,
)

Completion = Literal["completed", "partial", "interrupted", "not_started"]
MissingReason = Literal["declined", "interrupted", "technical_failure", "unknown"]


class TrainingSessionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    session_at: AwareDatetime
    action_label: str = Field(min_length=1, max_length=120)
    actual_minutes: StrictInt | None = Field(default=None, ge=0)
    completion_status: Completion
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("session_at")
    @classmethod
    def utc_session_time(cls, value: datetime) -> datetime:
        return value.astimezone(timezone.utc)


class TrainingSessionView(TrainingSessionCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    participant_id: uuid.UUID
    source: Literal["manual_staff_entry"]
    recorded_by: uuid.UUID
    recorded_at: datetime

    @field_validator("session_at", mode="before")
    @classmethod
    def restore_sqlite_utc(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


class TrainingFeedbackWrite(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    expected_revision: StrictInt = Field(ge=0)
    state: Literal["recorded", "missing"]
    missing_reason: MissingReason | None = None
    rpe: StrictInt | None = Field(default=None, ge=6, le=20)
    difficulty: str | None = Field(default=None, min_length=1, max_length=500)
    support: str | None = Field(default=None, min_length=1, max_length=500)
    fatigue: str | None = Field(default=None, min_length=1, max_length=500)
    discomfort: str | None = Field(default=None, min_length=1, max_length=500)
    notes: str | None = Field(default=None, min_length=1, max_length=1000)
    change_reason: str | None = Field(default=None, min_length=1, max_length=500)

    @model_validator(mode="after")
    def check_state(self) -> "TrainingFeedbackWrite":
        details = (
            self.rpe, self.difficulty, self.support, self.fatigue, self.discomfort, self.notes
        )
        if self.state == "missing":
            if self.missing_reason is None or any(value is not None for value in details):
                raise ValueError("missing feedback requires reason and no observed values")
        elif self.missing_reason is not None or all(value is None for value in details):
            raise ValueError("recorded feedback requires an observation and no missing reason")
        return self


class TrainingFeedbackView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    revision_no: int
    state: Literal["recorded", "missing"]
    missing_reason: MissingReason | None
    rpe: int | None
    difficulty: str | None
    support: str | None
    fatigue: str | None
    discomfort: str | None
    notes: str | None
    change_reason: str | None
    recorded_by: uuid.UUID
    recorded_at: datetime


class SafetyEventCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    event_at: AwareDatetime
    session_id: uuid.UUID | None = None
    description: str = Field(min_length=1, max_length=2000)

    @field_validator("event_at")
    @classmethod
    def utc_event_time(cls, value: datetime) -> datetime:
        return value.astimezone(timezone.utc)


class SafetyEventView(SafetyEventCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    participant_id: uuid.UUID
    recorded_by: uuid.UUID
    recorded_at: datetime

    @field_validator("event_at", mode="before")
    @classmethod
    def restore_sqlite_utc(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
