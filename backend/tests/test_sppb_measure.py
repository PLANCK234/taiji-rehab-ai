"""Synthetic trajectories verify timing arithmetic, not human recognition accuracy."""

import copy
import json
import subprocess
import sys

import pytest
from pydantic import ValidationError

from app.pose_schemas import PoseInput
from app.sppb_measure import SitStandOptions, measure_sit_to_stand


def trajectory(cycles=5, *, interval=200, mirror=False, positions=None):
    frames = []
    positions = positions or [0, 0, 0, .4, .7, 1, 1, 1, .7, .4, 0, 0]
    for p in positions * cycles:
        points = [dict(x=.5, y=.5, z=0, visibility=0) for _ in range(33)]
        hip_y = 300 - 80 * p
        coords = {11: (190, hip_y - 100), 12: (210, hip_y - 100),
                  23: (190, hip_y), 24: (210, hip_y),
                  25: (300 - 100 * p, 300 + 20 * p),
                  26: (300 - 100 * p, 300 + 20 * p),
                  27: (300 - 100 * p, 400 + 20 * p),
                  28: (300 - 100 * p, 400 + 20 * p),
                  15: (210, hip_y - 100), 16: (190, hip_y - 100)}
        for i, (x, y) in coords.items():
            points[i] = dict(x=1 - x / 640 if mirror else x / 640,
                             y=y / 480, z=0, visibility=1)
        frames.append(dict(timestamp_ms=len(frames) * interval, landmarks=points, pose_count=1))
    return dict(source="synthetic_video", model_version="mediapipe-pose-lite-float16-v1",
                model_sha256="59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a",
                width=640, height=480, support="unknown", frames=frames)


def test_known_five_cycles_onset_and_fifth_stand_preserve_input():
    data = trajectory()
    before = copy.deepcopy(data)
    result = measure_sit_to_stand(PoseInput(**data))
    assert result["status"] == "candidate"
    assert result["stand_timestamps_ms"] == [1000, 3400, 5800, 8200, 10600]
    assert result["start_ms"] == 600
    assert result["elapsed_seconds"] == 10
    assert result["candidate_count"] == 5
    assert result["failure_reasons"] == []
    assert result["sppb_score"] is None
    assert result["quality"]["usable_frame_ratio"] == 1
    assert result["protocol_compliance"] == "unverified"
    assert data == before


def test_manual_start_and_mirror_and_slow_motion():
    result = measure_sit_to_stand(PoseInput(**trajectory(mirror=True)),
                                 SitStandOptions(manual_start_ms=0))
    assert result["elapsed_seconds"] == 10.6
    assert result["start_source"] == "manual"
    slow = measure_sit_to_stand(PoseInput(**trajectory(interval=400)))
    assert slow["elapsed_seconds"] == 20
    assert slow["candidate_count"] == 5


@pytest.mark.parametrize("mode,reason", [
    ("occluded", "missing_landmarks_during_attempt"),
    ("multiple", "multiple_people_during_attempt"),
    ("gap", "sampling_gap_during_attempt"),
    ("support", "hand_support_suspected"),
    ("unknown_arms", "arm_position_unknown"),
    ("not_crossed", "arms_not_crossed"),
])
def test_failure_modes_abstain_without_filling(mode, reason):
    # Six cycles leave five observable transitions even if one was interrupted.
    data = trajectory(6)
    frame = data["frames"][20]
    if mode in ("occluded", "multiple"):
        frame.update(landmarks=[], pose_count=2 if mode == "multiple" else 0)
    elif mode == "gap":
        for row in data["frames"][20:]:
            row["timestamp_ms"] += 1000
    elif mode == "support":
        frame["landmarks"][15] = frame["landmarks"][23].copy()
    elif mode == "unknown_arms":
        frame["landmarks"][15]["visibility"] = 0
    else:
        frame["landmarks"][15].update(x=.9, y=.2)
    result = measure_sit_to_stand(PoseInput(**data))
    assert result["elapsed_seconds"] is None
    assert reason in result["failure_reasons"]


def test_insufficient_cycles_static_and_all_missing_are_unknown():
    result = measure_sit_to_stand(PoseInput(**trajectory(3)))
    assert result["candidate_count"] == 3
    assert result["elapsed_seconds"] is None
    assert "fewer_than_five_stands" in result["failure_reasons"]
    data = trajectory()
    for row in data["frames"]:
        row["landmarks"] = copy.deepcopy(data["frames"][0]["landmarks"])
    assert measure_sit_to_stand(PoseInput(**data))["failure_reasons"] == ["insufficient_motion"]
    for row in data["frames"]:
        row.update(landmarks=[], pose_count=0)
    result = measure_sit_to_stand(PoseInput(**data))
    assert result["elapsed_seconds"] is None
    assert result["quality"]["mean_keypoint_visibility"] is None
    assert result["failure_reasons"] == ["insufficient_visible_landmarks"]


def test_hand_and_knee_disagreement_cannot_create_stands():
    data = trajectory()
    # Hip moves up while knee stays flexed: no paired motion.
    for row in data["frames"]:
        for hip, knee, ankle in ((23, 25, 27), (24, 26, 28)):
            y = row["landmarks"][hip]["y"]
            row["landmarks"][hip]["x"] = 200 / 640
            row["landmarks"][knee].update(x=300 / 640, y=y)
            row["landmarks"][ankle].update(x=300 / 640, y=y + 100 / 480)
    result = measure_sit_to_stand(PoseInput(**data))
    assert result["candidate_count"] == 0
    assert result["elapsed_seconds"] is None


def test_invalid_manual_start_and_configuration():
    data = PoseInput(**trajectory())
    with pytest.raises(ValueError, match="outside the recording"):
        measure_sit_to_stand(data, SitStandOptions(manual_start_ms=300_000))
    result = measure_sit_to_stand(data, SitStandOptions(manual_start_ms=1100))
    assert result["elapsed_seconds"] is None
    assert "manual_start_outside_first_rise" in result["failure_reasons"]
    for kwargs in ({"low_position": .9, "high_position": .8}, {"manual_start_ms": -1},
                   {"visibility": float("nan")}, {"confirm_samples": 1}):
        with pytest.raises(ValidationError):
            SitStandOptions(**kwargs)


def test_single_frame_high_spike_is_not_a_stand():
    data = trajectory()
    data["frames"] = data["frames"][:12]
    # Only one high frame, then descent. Two samples are required.
    for i in range(12):
        if i == 5:
            continue
        data["frames"][i]["landmarks"] = copy.deepcopy(data["frames"][0]["landmarks"])
    result = measure_sit_to_stand(PoseInput(**data))
    assert result["candidate_count"] == 0
    assert result["elapsed_seconds"] is None


def test_supported_report_abstains_and_input_hash_is_reproducible():
    data = trajectory()
    first = measure_sit_to_stand(PoseInput(**data))
    assert first["input_sha256"] == measure_sit_to_stand(PoseInput(**data))["input_sha256"]
    data["support"] = "supported"
    result = measure_sit_to_stand(PoseInput(**data))
    assert result["elapsed_seconds"] is None
    assert result["candidate_count"] == 5
    assert result["failure_reasons"] == ["reported_support"]
    assert result["input_sha256"] != first["input_sha256"]


def test_onset_uses_small_rise_and_discards_single_sample_false_start():
    data = trajectory(positions=[0, 0, .1, 0, 0, .1, .4, .7, 1, 1, .4, 0, 0])
    result = measure_sit_to_stand(PoseInput(**data))
    assert result["status"] == "candidate"
    assert result["start_ms"] == 1000
    assert result["fifth_stand_ms"] == 12000
    assert result["elapsed_seconds"] == 11


def test_cli_reproduces_manual_timing_without_database(tmp_path):
    path = tmp_path / "synthetic-keypoints.json"
    path.write_text(json.dumps(trajectory()), encoding="utf-8")
    completed = subprocess.run([sys.executable, "-m", "app.sppb_measure", str(path),
                                "--manual-start-ms", "0"],
                               capture_output=True, text=True, check=True)
    result = json.loads(completed.stdout)
    assert result["elapsed_seconds"] == 10.6
    assert result["parameters"]["manual_start_ms"] == 0
    assert len(result["input_sha256"]) == 64
