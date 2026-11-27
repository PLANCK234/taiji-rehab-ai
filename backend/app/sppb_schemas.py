"""Persisted candidate measurements and attributable human timing decisions."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SppbCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    source_analysis_id: uuid.UUID
    manual_start_ms: float | None = Field(default=None, strict=True, ge=0, le=300_000)


class SppbReviewInput(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False, str_strip_whitespace=True)
    expected_revision: int = Field(strict=True, ge=0)
    decision: Literal["accepted_timing", "modified_timing", "needs_retake", "rejected"]
    start_ms: float | None = Field(default=None, strict=True, ge=0, le=300_000)
    fifth_stand_ms: float | None = Field(default=None, strict=True, ge=0, le=300_000)
    reason: str = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def correction(self):
        if self.decision == "modified_timing":
            if (self.start_ms is None or self.fifth_stand_ms is None
                    or self.start_ms >= self.fifth_stand_ms):
                raise ValueError("modified timing requires start < fifth stand")
        elif self.start_ms is not None or self.fifth_stand_ms is not None:
            raise ValueError("only modified timing may supply replacement timestamps")
        return self


class SppbMeasurementView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    source_analysis_id: uuid.UUID
    algorithm_version: str
    result: dict
    created_by: uuid.UUID
    created_at: datetime


class SppbReviewRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    measurement_id: uuid.UUID
    revision_no: int
    decision: str
    start_ms: float | None
    fifth_stand_ms: float | None
    reason: str
    recorded_by: uuid.UUID
    recorded_at: datetime


class SppbHumanConfirmation(BaseModel):
    evidence_type: Literal["HUMAN_CONFIRMATION"] = "HUMAN_CONFIRMATION"
    review_id: uuid.UUID
    revision_no: int
    start_ms: float
    fifth_stand_ms: float
    elapsed_seconds: float
    recorded_by: uuid.UUID
    recorded_at: datetime


class SppbDetail(SppbMeasurementView):
    reviews: list[SppbReviewRecord]
    human_confirmation: SppbHumanConfirmation | None


class SppbPage(BaseModel):
    items: list[SppbMeasurementView]
    total: int
    offset: int
    limit: int
