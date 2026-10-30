"""Public request and response validation for synthetic research intake."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StrictInt,
    model_validator,
)

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


MissingReason = Literal[
    "not_scheduled",
    "not_attempted",
    "declined",
    "unsafe_to_attempt",
    "technical_failure",
    "lost_followup",
    "unknown",
]


class AssessmentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    participant_id: uuid.UUID
    visit_kind: Literal["baseline", "revisit"]


class MeasurementWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_revision: StrictInt = Field(ge=1)
    validity: Literal["valid", "missing", "invalid"]
    raw_value: StrictInt | None = None
    missing_reason: MissingReason | None = None
    performed_at: AwareDatetime | None = None
    change_reason: str | None = Field(default=None, max_length=64, pattern=SYNTHETIC_CODE)

    @model_validator(mode="after")
    def validate_measurement(self) -> "MeasurementWrite":
        if self.validity == "valid":
            if (
                self.raw_value is None
                or not 0 <= self.raw_value <= 12
                or self.missing_reason is not None
                or self.performed_at is None
            ):
                raise ValueError("valid manual total requires 0..12 and performed_at")
        elif self.validity == "missing":
            if self.raw_value is not None or self.missing_reason is None or self.performed_at:
                raise ValueError("missing manual total requires reason and no value/time")
        elif self.missing_reason is None:
            raise ValueError("invalid manual total requires reason")
        return self


class AssessmentConfirm(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_revision: StrictInt = Field(ge=1)


class AssessmentRevisionView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    assessment_id: uuid.UUID
    revision_no: int
    state: Literal["draft", "confirmed"]
    metric_code: Literal["sppb_total"]
    raw_value: int | None
    unit: Literal["points"]
    validity: Literal["unrecorded", "valid", "missing", "invalid"]
    missing_reason: MissingReason | None
    performed_at: datetime | None
    source: Literal["manual_staff_entry"]
    change_reason: str | None
    recorded_by: uuid.UUID
    recorded_at: datetime


class AssessmentSummary(BaseModel):
    id: uuid.UUID
    participant_id: uuid.UUID
    visit_kind: Literal["baseline", "revisit"]
    protocol_version: str
    created_by: uuid.UUID
    created_at: datetime
    current: AssessmentRevisionView


class AssessmentDetail(AssessmentSummary):
    history: list[AssessmentRevisionView]
