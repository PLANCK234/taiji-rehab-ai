"""Known geometry and slow/small movements, not invented clinical accuracy."""

import math

import pytest
from pydantic import ValidationError

from app.pose_analysis import analyze_pose, angle
from app.pose_schemas import PoseInput


def input_payload(angles=(90, 91, 92, 93, 94), *, width=640, height=480):
    frames = []
    for n, degrees in enumerate(angles):
        points = [dict(x=.5, y=.5, z=0, visibility=0) for _ in range(33)]
        # Coordinates chosen in pixels, then normalized: verifies aspect correction.
        points[11] = dict(x=200 / width, y=200 / height, z=0, visibility=1)
        points[13] = dict(x=300 / width, y=200 / height, z=0, visibility=1)
        theta = math.radians(180 - degrees)
        points[15] = dict(x=(300 + 100 * math.cos(theta)) / width,
                          y=(200 + 100 * math.sin(theta)) / height, z=0, visibility=1)
        frames.append(dict(timestamp_ms=n * 500, landmarks=points, pose_count=1))
    return dict(
        source="synthetic_video", model_version="mediapipe-pose-lite-float16-v1",
        model_sha256="59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a",
        width=width, height=height, support="seated", frames=frames,
    )


def test_angle_known_geometry_and_degenerate():
    assert angle((1, 0), (0, 0), (0, 1)) == pytest.approx(90)
    assert angle((-1, 0), (0, 0), (1, 0)) == pytest.approx(180)
    assert angle((0, 0), (0, 0), (1, 0)) is None


def test_slow_small_seated_movement_is_measured_without_clinical_score():
    result = analyze_pose(PoseInput(**input_payload()))
    elbow = result["metrics"]["left_elbow"]
    assert elbow["median_deg"] == pytest.approx(92, abs=.01)
    assert elbow["range_p05_p95_deg"] == pytest.approx(3.6, abs=.01)
    assert elbow["coverage"] == 1
    assert elbow["observed_seconds"] == 2
    assert result["status"] == "measured" and result["support"] == "seated"
    assert result["clinical_score"] is None and result["rehabilitation_stage"] is None
    assert result["metrics"]["left_knee"]["median_deg"] is None


def test_mirror_and_aspect_ratio_do_not_change_angles():
    original = input_payload()
    mirrored = input_payload()
    for frame in mirrored["frames"]:
        for point in frame["landmarks"]:
            point["x"] = 1 - point["x"]
    assert analyze_pose(PoseInput(**original))["metrics"] == (
        analyze_pose(PoseInput(**mirrored))["metrics"]
    )
    assert analyze_pose(PoseInput(**input_payload(width=1280, height=720)))["metrics"] == (
        analyze_pose(PoseInput(**original))["metrics"]
    )


def test_occlusion_and_long_gap_are_not_filled():
    data = input_payload()
    data["frames"][1]["landmarks"][13]["visibility"] = 0
    data["frames"][-1]["timestamp_ms"] = 9000
    result = analyze_pose(PoseInput(**data))
    assert result["metrics"]["left_elbow"]["coverage"] == .8
    assert result["metrics"]["left_elbow"]["observed_seconds"] == .5
    for frame in data["frames"]:
        frame["landmarks"] = []
        frame["pose_count"] = 0
    result = analyze_pose(PoseInput(**data))
    assert result["status"] == "not_assessable"
    assert all(m["median_deg"] is None for m in result["metrics"].values())


@pytest.mark.parametrize("change", ["repeated_time", "partial_points", "nan", "multi_person"])
def test_bad_input_rejected(change):
    data = input_payload()
    if change == "repeated_time":
        data["frames"][1]["timestamp_ms"] = 0
    elif change == "partial_points":
        data["frames"][0]["landmarks"].pop()
    elif change == "nan":
        data["frames"][0]["landmarks"][0]["x"] = float("nan")
    else:
        data["frames"][0]["pose_count"] = 2
    with pytest.raises(ValidationError):
        PoseInput(**data)
