"""Versioned engineering sit-to-stand timing candidates; no SPPB scoring table."""

import argparse
import hashlib
import json
import math
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.pose_analysis import angle, percentile
from app.pose_schemas import PoseInput

VERSION = "sppb-measure-v1"


class SitStandOptions(BaseModel):
    """Signal parameters, not clinical cutoffs or approved protocol definitions."""

    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    manual_start_ms: float | None = Field(default=None, ge=0, le=300_000)
    visibility: float = Field(default=.5, gt=0, le=1)
    max_interval_ms: float = Field(default=450, gt=0, le=1000)
    confirm_samples: int = Field(default=2, ge=2, le=10)
    onset_position: float = Field(default=.05, gt=0, lt=1)
    low_position: float = Field(default=.3, ge=0, lt=1)
    high_position: float = Field(default=.8, gt=0, le=1)
    min_hip_span_torso: float = Field(default=.15, gt=0)
    min_knee_span_deg: float = Field(default=10, gt=0, le=180)
    crossed_wrist_radius_torso: float = Field(default=.8, gt=0)
    support_wrist_radius_torso: float = Field(default=.45, gt=0)

    @model_validator(mode="after")
    def positions(self):
        if not self.onset_position < self.low_position < self.high_position:
            raise ValueError("positions must satisfy onset < low < high")
        return self


def _sample(payload: PoseInput, frame, options: SitStandOptions) -> dict:
    def point(index):
        if not frame.landmarks:
            return None
        p = frame.landmarks[index]
        if p.visibility < options.visibility or not (0 <= p.x <= 1 and 0 <= p.y <= 1):
            return None
        return (p.x * payload.width, p.y * payload.height)

    def midpoint(a, b):
        return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)

    shoulders, hips = [point(i) for i in (11, 12)], [point(i) for i in (23, 24)]
    row = {"timestamp_ms": frame.timestamp_ms, "hip_y": None, "torso": None,
           "left_knee": None, "right_knee": None, "arms": "unknown"}
    for side, indices in (("left", (23, 25, 27)), ("right", (24, 26, 28))):
        points = [point(i) for i in indices]
        if all(p is not None for p in points):
            row[f"{side}_knee"] = angle(*points)
    if any(p is None for p in shoulders + hips):
        return row
    shoulder, hip = midpoint(*shoulders), midpoint(*hips)
    torso = math.dist(shoulder, hip)
    if torso < 1e-6:
        return row
    row.update(hip_y=hip[1], torso=torso)
    wrists = [point(15), point(16)]
    if any(p is None for p in wrists):
        return row
    if any(math.dist(w, h) / torso <= options.support_wrist_radius_torso
           for w in wrists for h in hips):
        row["arms"] = "support_suspected"
    elif all(math.dist(w, s) / torso <= options.crossed_wrist_radius_torso
             for w, s in zip(wrists, reversed(shoulders))):
        row["arms"] = "crossed_proxy"
    else:
        row["arms"] = "not_crossed"
    return row


def measure_sit_to_stand(payload: PoseInput, options: SitStandOptions | None = None) -> dict:
    """First five seated-to-standing transitions, with no bridging of missing frames.

    Arms are geometric proxies only. Contact with furniture and protocol compliance
    cannot be established from keypoints; a human must review every candidate.
    """
    options = options or SitStandOptions()
    if (options.manual_start_ms is not None
            and options.manual_start_ms > payload.frames[-1].timestamp_ms):
        raise ValueError("manual start is outside the recording")
    rows = [_sample(payload, f, options) for f in payload.frames]
    side = max(("right", "left"), key=lambda s: sum(
        r["hip_y"] is not None and r[f"{s}_knee"] is not None for r in rows))
    usable = [r for r in rows if r["hip_y"] is not None and r[f"{side}_knee"] is not None]
    visibility = [f.landmarks[i].visibility for f in payload.frames if f.landmarks
                  for i in (11, 12, 23, 24, 25 if side == "left" else 26,
                            27 if side == "left" else 28, 15, 16)]
    reasons: list[str] = []
    result = {
        "algorithm_version": VERSION, "evidence_type": "MODEL_CANDIDATE",
        "marker": "DEMO_ONLY", "test": "five_times_sit_to_stand",
        "status": "not_assessable", "elapsed_seconds": None,
        "start_ms": None, "start_source": "manual" if options.manual_start_ms is not None
        else "automatic_rise_onset_candidate", "fifth_stand_ms": None,
        "stand_timestamps_ms": [], "candidate_count": 0, "selected_side": side if usable else None,
        "failure_reasons": reasons,
        "quality": {"usable_frame_ratio": len(usable) / len(rows),
                    "single_person_frame_ratio": sum(f.pose_count == 1 for f in payload.frames)
                    / len(rows), "mean_keypoint_visibility": sum(visibility) / len(visibility)
                    if visibility else None},
        "parameters": options.model_dump(), "requires_human_review": True,
        "protocol_compliance": "unverified", "sppb_score": None,
        "input_sha256": hashlib.sha256(payload.model_dump_json().encode()).hexdigest(),
    }
    if payload.support == "supported":
        reasons.append("reported_support")
    if len(usable) < 2 * options.confirm_samples:
        reasons.append("insufficient_visible_landmarks")
        return result
    # One fixed scale avoids manufacturing motion when torso size changes per frame.
    torso = percentile([r["torso"] for r in usable], .5)
    heights = [-r["hip_y"] / torso for r in usable]
    knees = [r[f"{side}_knee"] for r in usable]
    low, high = percentile(heights, .1), percentile(heights, .9)
    knee_low, knee_high = percentile(knees, .1), percentile(knees, .9)
    if high - low < options.min_hip_span_torso or knee_high - knee_low < options.min_knee_span_deg:
        reasons.append("insufficient_motion")
        return result
    low_run = high_run = 0
    onset_run = 0
    onset_start = None
    armed = False
    start = trial_start = high_start = previous = None
    stands = result["stand_timestamps_ms"]
    confirmation_end = None
    for index, row in enumerate(rows):
        time, knee = row["timestamp_ms"], row[f"{side}_knee"]
        gap = previous is not None and time - previous > options.max_interval_ms
        previous = time
        if gap or row["hip_y"] is None or knee is None:
            low_run = high_run = 0
            armed = False
            onset_run = 0
            if not stands:
                start = None
            # A gap interrupts the current attempt. Do not infer a transition across it.
            continue
        pos = (-row["hip_y"] / torso - low) / (high - low)
        knee_pos = (knee - knee_low) / (knee_high - knee_low)
        if not armed:
            seated = pos <= options.low_position and knee_pos <= options.low_position
            low_run = low_run + 1 if seated else 0
            if low_run >= options.confirm_samples:
                armed = True
                if trial_start is None:
                    trial_start = rows[index - options.confirm_samples + 1]["timestamp_ms"]
            continue
        if not stands:
            if pos > options.onset_position and knee_pos > options.onset_position:
                if onset_run == 0:
                    onset_start = time
                onset_run += 1
                if onset_run >= options.confirm_samples:
                    start = onset_start
            else:
                onset_run = 0
                start = None
        if pos < options.high_position or knee_pos < options.high_position:
            high_run = 0
            continue
        if high_run == 0:
            high_start = time
        high_run += 1
        if high_run >= options.confirm_samples:
            stands.append(high_start)
            confirmation_end = time
            armed = False
            low_run = high_run = 0
            if len(stands) == 5:
                break
    result["candidate_count"] = len(stands)
    if len(stands) < 5:
        reasons.append("fewer_than_five_stands")
    if trial_start is not None and stands:
        end = confirmation_end
        window = [r for r in rows if trial_start <= r["timestamp_ms"] <= end]
        if any(r["hip_y"] is None or r[f"{side}_knee"] is None for r in window):
            reasons.append("missing_landmarks_during_attempt")
        if any(b["timestamp_ms"] - a["timestamp_ms"] > options.max_interval_ms
               for a, b in zip(window, window[1:])):
            reasons.append("sampling_gap_during_attempt")
        if any(r["arms"] == "support_suspected" for r in window):
            reasons.append("hand_support_suspected")
        if any(r["arms"] == "unknown" for r in window):
            reasons.append("arm_position_unknown")
        if any(r["arms"] == "not_crossed" for r in window):
            reasons.append("arms_not_crossed")
        if any(f.pose_count > 1 and trial_start <= f.timestamp_ms <= end
               for f in payload.frames):
            reasons.append("multiple_people_during_attempt")
    if options.manual_start_ms is not None:
        if (trial_start is None or not stands
                or not trial_start <= options.manual_start_ms < stands[0]):
            reasons.append("manual_start_outside_first_rise")
        start = options.manual_start_ms
    result["start_ms"] = start
    if len(stands) == 5:
        result["fifth_stand_ms"] = stands[4]
    if not reasons and start is not None:
        result.update(status="candidate", elapsed_seconds=round((stands[4] - start) / 1000, 4))
    return result


def main() -> None:
    """Reproduce a measurement from synthetic landmark JSON, without a server or DB."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Synthetic PoseInput JSON; no video upload")
    parser.add_argument("--manual-start-ms", type=float)
    args = parser.parse_args()
    payload = PoseInput.model_validate_json(args.input.read_text(encoding="utf-8"))
    result = measure_sit_to_stand(payload, SitStandOptions(manual_start_ms=args.manual_start_ms))
    print(json.dumps(result, ensure_ascii=False, allow_nan=False))


if __name__ == "__main__":
    main()
