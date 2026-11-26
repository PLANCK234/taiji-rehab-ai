"""Bounded synthetic video landmark input and append-only review contracts."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class PosePoint(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    x: float = Field(ge=-2, le=3)
    y: float = Field(ge=-2, le=3)
    z: float = Field(ge=-10, le=10)
    visibility: float = Field(ge=0, le=1)


class PoseFrame(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    timestamp_ms: float = Field(ge=0, le=300_000)
    landmarks: list[PosePoint] = Field(max_length=33)
    pose_count: int = Field(ge=0, le=2)

    @model_validator(mode="after")
    def shape(self):
        if len(self.landmarks) not in (0, 33):
            raise ValueError("expected 33 landmarks or no detection")
        if (self.pose_count == 1) != bool(self.landmarks):
            raise ValueError("only unambiguous single-person frames may carry landmarks")
        return self


class PoseInput(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    source: Literal["synthetic_video", "synthetic_camera"]
    model_version: Literal["mediapipe-pose-lite-float16-v1"]
    model_sha256: Literal["59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a"]
    width: int = Field(ge=16, le=7680)
    height: int = Field(ge=16, le=7680)
    support: Literal["unknown", "standing", "seated", "supported"]
    frames: list[PoseFrame] = Field(min_length=3, max_length=1800)

    @model_validator(mode="after")
    def timeline(self):
        times = [frame.timestamp_ms for frame in self.frames]
        if times[0] != 0 or any(b <= a for a, b in zip(times, times[1:])):
            raise ValueError("timestamps must start at zero and strictly increase")
        return self


PoseJoint = Literal[
    "left_elbow", "right_elbow", "left_shoulder", "right_shoulder", "left_knee", "right_knee",
]
PoseMetric = Literal["median_deg", "range_p05_p95_deg"]


class PoseMetricCorrection(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)
    joint: PoseJoint
    metric: PoseMetric
    validity: Literal["valid", "missing"]
    value: float | None = Field(strict=True, ge=0, le=180)
    reason: str = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def value_state(self):
        if (self.validity == "valid") != (self.value is not None):
            raise ValueError("valid needs a value; missing needs null")
        return self


class PoseReviewInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    expected_revision: int = Field(ge=0)
    decision: Literal[
        "accepted_observations", "modified_observations", "needs_retake", "rejected",
    ]
    reason: str = Field(min_length=1, max_length=1000)
    corrections: list[PoseMetricCorrection] = Field(default_factory=list, max_length=12)

    @model_validator(mode="after")
    def correction_snapshot(self):
        if (self.decision == "modified_observations") != bool(self.corrections):
            raise ValueError("only modified reviews require nonempty corrections")
        keys = [(row.joint, row.metric) for row in self.corrections]
        if len(set(keys)) != len(keys):
            raise ValueError("a metric can only be corrected once in a review")
        return self


class PoseReviewView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    revision_no: int
    decision: str
    reason: str
    recorded_by: uuid.UUID
    recorded_at: datetime
    corrections: list[PoseMetricCorrection]


class PoseHumanConfirmation(BaseModel):
    evidence_type: Literal["HUMAN_CONFIRMATION"] = "HUMAN_CONFIRMATION"
    review_id: uuid.UUID
    revision_no: int
    decision: Literal["accepted_observations", "modified_observations"]
    metrics: dict[str, dict[str, float | None]]


class PoseAnalysisView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    participant_id: uuid.UUID
    algorithm_version: str
    input_sha256: str
    result: dict
    created_at: datetime


class PoseDetail(PoseAnalysisView):
    input_data: PoseInput
    reviews: list[PoseReviewView]
    human_confirmation: PoseHumanConfirmation | None
