"""Offline engineering probe for a stationary-camera pose CSV."""

import argparse
import csv
import hashlib
import io
import json
import math
from dataclasses import dataclass
from pathlib import Path

# Image-space signal parameters for this prototype version.
MIN_IMAGE_SPAN = 0.025
LOW_POSITION = 0.30
HIGH_POSITION = 0.80
CONFIRM_SAMPLES = 2
MAX_INTERVAL_MS = 150
REQUIRED_COLUMNS = {"timestamp_ms", "detected", "pelvis_y_normalized"}
JOINT_COLUMNS = {"right_hip_angle_deg", "right_knee_angle_deg"}


@dataclass(frozen=True)
class Sample:
    timestamp_ms: float
    pelvis_y: float | None
    hip_deg: float | None = None
    knee_deg: float | None = None


def read_samples(source: bytes, *, require_joints: bool = False) -> list[Sample]:
    reader = csv.DictReader(io.StringIO(source.decode("utf-8-sig"), newline=""))
    columns = REQUIRED_COLUMNS | JOINT_COLUMNS if require_joints else REQUIRED_COLUMNS
    if not columns.issubset(reader.fieldnames or []):
        raise ValueError(f"Pose CSV is missing columns: {', '.join(sorted(columns))}.")
    samples = []
    for row in reader:
        if any(row[column] is None for column in columns):
            raise ValueError("Incomplete pose CSV row.")
        timestamp = float(row["timestamp_ms"])
        value = row["pelvis_y_normalized"]
        detected = row["detected"]
        if (not math.isfinite(timestamp) or timestamp < 0
                or (samples and timestamp <= samples[-1].timestamp_ms)):
            raise ValueError("Sample timestamps must be finite, nonnegative and increasing.")
        if detected not in {"0", "1"}:
            raise ValueError(f"Invalid pose row at {timestamp} ms.")
        y = float(value) if detected == "1" and value else None
        # Out-of-frame normalized positions provide no usable signal here.
        read_joints = require_joints and detected == "1"
        hip = _read_angle(row["right_hip_angle_deg"]) if read_joints else None
        knee = _read_angle(row["right_knee_angle_deg"]) if read_joints else None
        samples.append(Sample(timestamp, y if y is not None and 0 <= y <= 1 else None, hip, knee))
    return samples


def _read_angle(value: str) -> float | None:
    angle = float(value) if value else None
    return angle if angle is not None and 0 <= angle <= 180 else None


def _signal_scale(values: list[float], minimum_span: float) -> tuple[float, float] | None:
    if len(values) < 2 * CONFIRM_SAMPLES:
        return None
    ordered = sorted(values)
    margin = (len(ordered) - 1) // 10
    low, high = ordered[margin], ordered[-1 - margin]
    span = high - low
    return (low, span) if span >= minimum_span else None


def detect_candidates(samples: list[Sample]) -> dict:
    heights = [1 - sample.pelvis_y if sample.pelvis_y is not None else None for sample in samples]
    return _detect_transitions(samples, heights, MIN_IMAGE_SPAN)


def detect_joint_candidates(samples: list[Sample]) -> dict:
    hips = [sample.hip_deg for sample in samples]
    knees = [sample.knee_deg for sample in samples]
    # Below this within-clip span the angle channel provides little contrast for this probe.
    return _detect_transitions(samples, hips, 10, confirmation=knees)


def _detect_transitions(
    samples: list[Sample],
    signal: list[float | None],
    minimum_span: float,
    *,
    confirmation: list[float | None] | None = None,
) -> dict:
    known = [value for value in signal if value is not None]
    result = {
        "sample_count": len(samples),
        "usable_samples": len(known),
        "candidate_count": None,
        "candidate_timestamps_ms": [],
        "status": "insufficient_signal",
    }
    scale = _signal_scale(known, minimum_span)
    if scale is None:
        return result
    low, span = scale
    confirmation_boundary = None
    if confirmation is not None:
        paired_count = sum(
            first is not None and second is not None
            for first, second in zip(signal, confirmation, strict=True)
        )
        result["paired_samples"] = paired_count
        confirmation_scale = _signal_scale(
            [value for value in confirmation if value is not None], minimum_span,
        )
        if confirmation_scale is None or paired_count < CONFIRM_SAMPLES:
            return result
        knee_low, knee_span = confirmation_scale
        confirmation_boundary = knee_low + HIGH_POSITION * knee_span

    candidates = []
    armed = False
    low_run = 0
    high_start = None
    previous = None
    for index, (sample, value) in enumerate(zip(samples, signal, strict=True)):
        time = sample.timestamp_ms
        if (value is None
                or (previous is not None and time - previous > MAX_INTERVAL_MS)):
            armed = False
            low_run = 0
            high_start = None
        previous = time
        if value is None:
            continue

        position = (value - low) / span
        confirmed = True
        if confirmation is not None and confirmation_boundary is not None:
            knee = confirmation[index]
            confirmed = knee is not None and knee >= confirmation_boundary
        if not armed:
            low_run = low_run + 1 if position <= LOW_POSITION else 0
            armed = low_run >= CONFIRM_SAMPLES
        elif position < HIGH_POSITION or not confirmed:
            high_start = None
        elif high_start is None:
            high_start = time
        else:
            candidates.append(high_start)
            armed = False
            low_run = 0
            high_start = None

    return {**result, "candidate_count": len(candidates),
            "candidate_timestamps_ms": candidates, "status": "evaluated"}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pose_csv", type=Path)
    parser.add_argument("--signal", choices=("pelvis", "joints"), default="pelvis")
    args = parser.parse_args()
    try:
        source = args.pose_csv.read_bytes()
        joints = args.signal == "joints"
        samples = read_samples(source, require_joints=joints)
        result = detect_joint_candidates(samples) if joints else detect_candidates(samples)
    except (OSError, ValueError) as error:
        parser.error(str(error))
    print(json.dumps({
        "algorithm": "right-hip-knee-v1" if joints else "image-pelvis-hysteresis-v1",
        "input_sha256": hashlib.sha256(source).hexdigest(),
        **result,
    }, indent=2))


if __name__ == "__main__":
    main()
