"""Synthetic Demo plan and run API contracts."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt


class DemoGradeView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    assessment_revision_id: uuid.UUID
    rule_version: str
    functional_grade: Literal["I", "II", "III", "IV", "UNASSESSED"]
    demo_training_mode: str | None
    evidence: dict
    created_at: datetime


class DemoActionView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    category: str
    demo_grade: str
    explanation: str
    steps: list[str]
    display_order: int
    marker: Literal["DEMO_ONLY"]


class DemoRunView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    participant_id: uuid.UUID
    grade_result_id: uuid.UUID
    status: Literal["in_progress", "paused", "awaiting_feedback", "completed", "stopped"]
    action_ids: list[str]
    completed_action_ids: list[str] | None
    current_index: int
    started_at: datetime
    ended_at: datetime | None
    training_session_id: uuid.UUID | None


class DemoPlanView(BaseModel):
    participant_id: uuid.UUID
    marker: Literal["DEMO_ONLY"] = "DEMO_ONLY"
    grade: DemoGradeView | None
    actions: list[DemoActionView]
    current_run: DemoRunView | None


class DemoStep(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_status: Literal["in_progress", "paused"]
    action: Literal["pause", "resume", "next", "previous"]


class DemoStart(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DemoEnd(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    actual_minutes: StrictInt = Field(ge=0, le=1440)
    completion_status: Literal["completed", "partial", "interrupted"]
    notes: str | None = Field(default=None, max_length=1000)
    completed_action_ids: list[str] | None = None
