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


class PoseReviewInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    expected_revision: int = Field(ge=0)
    decision: Literal["accepted_observations", "needs_retake", "rejected"]
    reason: str = Field(min_length=1, max_length=1000)


class PoseReviewView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    revision_no: int
    decision: str
    reason: str
    recorded_by: uuid.UUID
    recorded_at: datetime


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
