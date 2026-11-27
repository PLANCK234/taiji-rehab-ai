"""Signal validation has known latent trajectories, noise and occlusion."""

import math
import random

import pytest

from app.pose_analysis import analyze_pose, analyze_pose_v1
from app.pose_schemas import PoseInput
from tests.test_pose_analysis import input_payload


def trajectory(values, step_ms=100):
    data = input_payload(values)
    for index, frame in enumerate(data["frames"]):
        frame["timestamp_ms"] = index * step_ms
    return data


def rms(values, truth):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(values, truth)) / len(truth))


def test_median_reduces_seeded_stationary_jitter_and_preserves_raw():
    rng = random.Random(20261126)
    truth = [90.0] * 151
    observed = [value + rng.gauss(0, .8) for value in truth]
    payload = PoseInput(**trajectory(observed))
    result = analyze_pose(payload)
    raw = [row["angles"]["left_elbow"] for row in result["series"]]
    smooth = [row["smoothed_angles"]["left_elbow"] for row in result["series"]]
    print(f"static RMS: raw={rms(raw, truth):.6f}, smooth={rms(smooth, truth):.6f}")
    assert rms(smooth, truth) <= rms(raw, truth) * .75
    assert result["metrics"]["left_elbow"]["variation_status"] == "within_residual_noise"
    legacy = analyze_pose_v1(payload)
    assert legacy["algorithm_version"] == "pose-geometry-v1"
    assert result["algorithm_version"] == "pose-geometry-v3"
    assert raw == [row["angles"]["left_elbow"] for row in legacy["series"]]


def test_noisy_slow_four_degree_motion_remains_visible():
    rng = random.Random(19)
    truth = [90 + 4 * index / 100 for index in range(101)]
    observed = [value + rng.gauss(0, .15) for value in truth]
    result = analyze_pose(PoseInput(**trajectory(observed)))
    smooth = [row["smoothed_angles"]["left_elbow"] for row in result["series"]]
    print(f"slow 4deg RMS: {rms(smooth, truth):.6f}; range="
          f"{result['metrics']['left_elbow']['smoothed_range_p05_p95_deg']}")
    assert rms(smooth, truth) < .15
    metric = result["metrics"]["left_elbow"]
    assert metric["smoothed_range_p05_p95_deg"] == pytest.approx(3.6, abs=.35)
    assert metric["variation_status"] == "above_residual_noise"


def test_irregular_linear_motion_does_not_become_noise():
    times = [0]
    for index in range(30):
        times.append(times[-1] + (80 if index % 2 else 170))
    data = trajectory([90 + time / 1000 for time in times])
    for frame, time in zip(data["frames"], times):
        frame["timestamp_ms"] = time
    result = analyze_pose(PoseInput(**data))
    assert result["metrics"]["left_elbow"]["noise_sigma_deg"] == 0
    assert result["metrics"]["left_elbow"]["variation_status"] == "above_residual_noise"


def test_two_slow_small_cycles_preserve_waveform():
    rng = random.Random(27)
    truth = [90 + 2 * math.sin(2 * math.pi * index / 80) for index in range(161)]
    data = trajectory([value + rng.gauss(0, .15) for value in truth])
    result = analyze_pose(PoseInput(**data))
    smooth = [row["smoothed_angles"]["left_elbow"] for row in result["series"]]
    print(f"two slow cycles RMS: {rms(smooth, truth):.6f}; range="
          f"{result['metrics']['left_elbow']['smoothed_range_p05_p95_deg']}")
    assert rms(smooth, truth) < .2
    assert 3.5 <= result["metrics"]["left_elbow"]["smoothed_range_p05_p95_deg"] <= 4.4
    assert result["metrics"]["left_elbow"]["variation_status"] == "above_residual_noise"


def test_missing_frames_break_smoothing_and_sparse_noise_stays_unknown():
    data = trajectory([80] * 6 + [120] * 5)
    data["frames"][5].update(landmarks=[], pose_count=0)
    result = analyze_pose(PoseInput(**data))
    values = [row["smoothed_angles"]["left_elbow"] for row in result["series"]]
    assert values == [80] * 5 + [None] + [120] * 5
    metric = result["metrics"]["left_elbow"]
    assert metric["noise_sigma_deg"] is None
    assert metric["variation_status"] == "insufficient_data"
    assert metric["observed_seconds"] == .8


def test_time_gap_does_not_smooth_two_postures_together():
    data = trajectory([80] * 5 + [120] * 5)
    for frame in data["frames"][5:]:
        frame["timestamp_ms"] += 1500
    result = analyze_pose(PoseInput(**data))
    values = [row["smoothed_angles"]["left_elbow"] for row in result["series"]]
    assert values == [80] * 5 + [120] * 5
    assert result["metrics"]["left_elbow"]["observed_seconds"] == .8


def test_isolated_spike_is_not_reported_as_sustained_motion():
    values = [90] * 15
    values[7] = 130
    result = analyze_pose(PoseInput(**trajectory(values)))
    assert result["series"][7]["angles"]["left_elbow"] == 130
    assert result["series"][7]["smoothed_angles"]["left_elbow"] == 90
    assert result["metrics"]["left_elbow"]["smoothed_range_p05_p95_deg"] == 0
    assert result["metrics"]["left_elbow"]["variation_status"] == "within_residual_noise"
