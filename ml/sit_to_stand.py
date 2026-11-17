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


@dataclass(frozen=True)
class Sample:
    timestamp_ms: float
    pelvis_y: float | None


def read_samples(source: bytes) -> list[Sample]:
    reader = csv.DictReader(io.StringIO(source.decode("utf-8-sig"), newline=""))
    if not REQUIRED_COLUMNS.issubset(reader.fieldnames or []):
        raise ValueError("Expected a pose-analysis CSV with timestamp, detection and pelvis y.")
    samples = []
    for row in reader:
        if any(row[column] is None for column in REQUIRED_COLUMNS):
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
        samples.append(Sample(timestamp, y if y is not None and 0 <= y <= 1 else None))
    return samples


def detect_candidates(samples: list[Sample]) -> dict:
    heights = sorted(1 - sample.pelvis_y for sample in samples if sample.pelvis_y is not None)
    result = {
        "sample_count": len(samples),
        "usable_samples": len(heights),
        "candidate_count": None,
        "candidate_timestamps_ms": [],
        "status": "insufficient_signal",
    }
    if len(heights) < 2 * CONFIRM_SAMPLES:
        return result
    margin = (len(heights) - 1) // 10
    low, high = heights[margin], heights[-1 - margin]
    span = high - low
    if span < MIN_IMAGE_SPAN:
        return result

    candidates = []
    armed = False
    low_run = 0
    high_start = None
    previous = None
    for sample in samples:
        time = sample.timestamp_ms
        if (sample.pelvis_y is None
                or (previous is not None and time - previous > MAX_INTERVAL_MS)):
            armed = False
            low_run = 0
            high_start = None
        previous = time
        if sample.pelvis_y is None:
            continue

        position = (1 - sample.pelvis_y - low) / span
        if not armed:
            low_run = low_run + 1 if position <= LOW_POSITION else 0
            armed = low_run >= CONFIRM_SAMPLES
        elif position < HIGH_POSITION:
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
    args = parser.parse_args()
    try:
        source = args.pose_csv.read_bytes()
        result = detect_candidates(read_samples(source))
    except (OSError, ValueError) as error:
        parser.error(str(error))
    print(json.dumps({
        "algorithm": "image-pelvis-hysteresis-v1",
        "input_sha256": hashlib.sha256(source).hexdigest(),
        **result,
    }, indent=2))


if __name__ == "__main__":
    main()
