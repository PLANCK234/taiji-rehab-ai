"""pose-geometry-v3 trunk, pelvis and symmetry metrics on known synthetic geometry."""

import math

import pytest

from app.pose_analysis import analyze_pose
from app.pose_schemas import PoseInput


def trunk_payload(leans_deg, hip_shift_px=(), hip_drop_px=(), *, width=600, height=600):
    """Hips at (300, 400); shoulders 200 px above, rotated by the given lean angle."""
    frames = []
    for n, lean in enumerate(leans_deg):
        dx = hip_shift_px[n] if hip_shift_px else 0
        dy = hip_drop_px[n] if hip_drop_px else 0
        hip = (300 + dx, 400 + dy)
        theta = math.radians(lean)
        shoulder = (hip[0] + 200 * math.sin(theta), hip[1] - 200 * math.cos(theta))
        points = [dict(x=.5, y=.5, z=0, visibility=0) for _ in range(33)]
        for index, (x, y) in {
            11: (shoulder[0] - 50, shoulder[1]), 12: (shoulder[0] + 50, shoulder[1]),
            23: (hip[0] - 40, hip[1]), 24: (hip[0] + 40, hip[1]),
        }.items():
            points[index] = dict(x=x / width, y=y / height, z=0, visibility=1)
        frames.append(dict(timestamp_ms=n * 200, landmarks=points, pose_count=1))
    return PoseInput(
        source="synthetic_video", model_version="mediapipe-pose-lite-float16-v1",
        model_sha256="59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a",
        width=width, height=height, support="standing", frames=frames,
    )


def test_upright_trunk_reads_zero_lean_and_direction_is_ignored():
    upright = analyze_pose(trunk_payload([0] * 10))
    assert upright["algorithm_version"] == "pose-geometry-v3"
    assert upright["posture"]["trunk_lean_median_deg"] == pytest.approx(0, abs=1e-6)
    left = analyze_pose(trunk_payload([-8] * 10))["posture"]["trunk_lean_median_deg"]
    right = analyze_pose(trunk_payload([8] * 10))["posture"]["trunk_lean_median_deg"]
    assert left == pytest.approx(8, abs=.01) and right == pytest.approx(8, abs=.01)


def test_pelvis_travel_is_normalised_by_trunk_length():
    # 40 px lateral sway and 20 px sinking against a 200 px trunk.
    shifts = [40 * (n % 2) for n in range(12)]
    drops = [20 * (n % 2) for n in range(12)]
    near = analyze_pose(trunk_payload([0] * 12, shifts, drops))["posture"]
    assert near["pelvis_lateral_range_pct_torso"] == pytest.approx(20, abs=.1)
    assert near["pelvis_vertical_range_pct_torso"] == pytest.approx(10, abs=.1)


def test_missing_trunk_stays_unknown_not_zero():
    payload = trunk_payload([0] * 5)
    for frame in payload.frames:
        frame.landmarks = []
        frame.pose_count = 0
    posture = analyze_pose(payload)["posture"]
    assert posture["trunk_lean_median_deg"] is None
    assert posture["pelvis_lateral_range_pct_torso"] is None
    assert posture["reason"] == "insufficient_visible_landmarks"


def test_symmetry_unknown_when_one_side_is_not_visible():
    result = analyze_pose(trunk_payload([0] * 10))
    assert result["symmetry"]["elbow"]["difference_deg"] is None
    assert set(result["symmetry"]) == {"elbow", "shoulder", "knee"}
