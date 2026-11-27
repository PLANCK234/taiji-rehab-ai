"""Reproducible image-plane joint metrics, without clinical score inference."""

import math

from app.pose_schemas import PoseInput

ALGORITHM_VERSION = "pose-geometry-v3"
V2_VERSION = "pose-geometry-v2"
V1_VERSION = "pose-geometry-v1"
# Engineering visibility threshold, not a clinical or movement-amplitude cutoff.
VISIBILITY = 0.5
JOINTS = {
    "left_elbow": (11, 13, 15), "right_elbow": (12, 14, 16),
    "left_shoulder": (13, 11, 23), "right_shoulder": (14, 12, 24),
    "left_knee": (23, 25, 27), "right_knee": (24, 26, 28),
}


def angle(a: tuple, b: tuple, c: tuple) -> float | None:
    u, v = (a[0] - b[0], a[1] - b[1]), (c[0] - b[0], c[1] - b[1])
    length = math.hypot(*u) * math.hypot(*v)
    if length < 1e-12:
        return None
    cosine = max(-1.0, min(1.0, (u[0] * v[0] + u[1] * v[1]) / length))
    return math.degrees(math.acos(cosine))


def percentile(values: list[float], fraction: float) -> float:
    values = sorted(values)
    index = (len(values) - 1) * fraction
    lo, hi = math.floor(index), math.ceil(index)
    return values[lo] + (values[hi] - values[lo]) * (index - lo)


def analyze_pose_v1(payload: PoseInput) -> dict:
    metrics, series = {}, []
    for frame in payload.frames:
        row = {"timestamp_ms": frame.timestamp_ms, "angles": {}}
        for name, indices in JOINTS.items():
            points = [frame.landmarks[i] for i in indices] if frame.landmarks else []
            usable = points and all(
                p.visibility >= VISIBILITY and 0 <= p.x <= 1 and 0 <= p.y <= 1
                for p in points
            )
            value = angle(*[(p.x * payload.width, p.y * payload.height) for p in points]) \
                if usable else None
            row["angles"][name] = round(value, 4) if value is not None else None
        series.append(row)
    for name in JOINTS:
        values = [r["angles"][name] for r in series if r["angles"][name] is not None]
        # Do not bridge occlusion, missing samples or intervals > 1 second.
        observed_ms = sum(
            b["timestamp_ms"] - a["timestamp_ms"]
            for a, b in zip(series, series[1:])
            if a["angles"][name] is not None and b["angles"][name] is not None
            and b["timestamp_ms"] - a["timestamp_ms"] <= 1000
        )
        enough = len(values) >= 3
        metrics[name] = {
            "valid_frames": len(values), "coverage": len(values) / len(series),
            "observed_seconds": observed_ms / 1000,
            "median_deg": round(percentile(values, .5), 2) if enough else None,
            "range_p05_p95_deg": round(percentile(values, .95) - percentile(values, .05), 2)
            if enough else None,
            "reason": None if enough else "insufficient_visible_landmarks",
        }
    any_usable = any(m["median_deg"] is not None for m in metrics.values())
    return {
        "marker": "DEMO_ONLY", "evidence_type": "MODEL_CANDIDATE",
        "status": "measured" if any_usable else "not_assessable",
        "coordinate_system": "image_plane_aspect_corrected",
        "algorithm_version": V1_VERSION,
        "model_version": payload.model_version, "model_sha256": payload.model_sha256,
        "visibility_threshold": VISIBILITY, "support": payload.support,
        "sampled_frames": len(series),
        "single_pose_frames": sum(f.pose_count == 1 for f in payload.frames),
        "multiple_pose_frames": sum(f.pose_count > 1 for f in payload.frames),
        "duration_seconds": payload.frames[-1].timestamp_ms / 1000,
        "metrics": metrics, "series": series,
        "clinical_score": None, "rehabilitation_stage": None,
        "stage_reason": "requires_confirmed_scale_and_expert_mapping",
    }


def signal_quality(series: list[dict], name: str) -> tuple[list[float | None], dict]:
    """Separate median smoothing and high-frequency residuals from original evidence.

    Local linear residuals allow slow linear changes to remain in the signal.
    This is an engineering noise proxy, not calibrated motion measurement error.
    """
    smoothed: list[float | None] = [None] * len(series)
    segments: list[list[int]] = []
    for index, row in enumerate(series):
        if row["angles"][name] is None:
            continue
        if (not segments or index != segments[-1][-1] + 1
                or row["timestamp_ms"] - series[index - 1]["timestamp_ms"] > 1000):
            segments.append([])
        segments[-1].append(index)
    residuals = []
    for segment in segments:
        for offset, index in enumerate(segment):
            # Keep endpoints and sparse samples unchanged, never cross missing frames.
            neighbors = [series[j]["angles"][name] for j in segment[
                max(0, offset - 4):offset + 5
            ] if abs(series[j]["timestamp_ms"] - series[index]["timestamp_ms"]) <= 250]
            smoothed[index] = (percentile(neighbors, .5) if len(neighbors) >= 3
                               and offset not in (0, len(segment) - 1)
                               else series[index]["angles"][name])
        for before, index, after in zip(segment, segment[1:], segment[2:]):
            a, b, c = series[before], series[index], series[after]
            left = (c["timestamp_ms"] - b["timestamp_ms"]) / (
                c["timestamp_ms"] - a["timestamp_ms"]
            )
            right = 1 - left
            prediction = left * a["angles"][name] + right * c["angles"][name]
            residuals.append((b["angles"][name] - prediction) / math.sqrt(
                1 + left * left + right * right
            ))
    values = [value for value in smoothed if value is not None]
    motion_range = percentile(values, .95) - percentile(values, .05) if len(values) >= 3 else None
    sigma = None
    if len(residuals) >= 7:
        center = percentile(residuals, .5)
        sigma = 1.4826 * percentile([abs(value - center) for value in residuals], .5)
    status = "insufficient_data"
    if sigma is not None and motion_range is not None:
        status = ("above_residual_noise" if motion_range > max(3 * sigma, 1e-6)
                  else "within_residual_noise")
    return smoothed, {
        "smoothed_range_p05_p95_deg": round(motion_range, 2) if motion_range is not None else None,
        "noise_sigma_deg": round(sigma, 3) if sigma is not None else None,
        "noise_residual_count": len(residuals), "variation_status": status,
    }


def analyze_pose_v2(payload: PoseInput) -> dict:
    result = analyze_pose_v1(payload)
    result["algorithm_version"] = V2_VERSION
    for row in result["series"]:
        row["smoothed_angles"] = {}
    for name in JOINTS:
        smoothed, quality = signal_quality(result["series"], name)
        result["metrics"][name].update(quality)
        for row, value in zip(result["series"], smoothed):
            row["smoothed_angles"][name] = round(value, 4) if value is not None else None
    result["signal_processing"] = {
        "smoothing": "segment_local_time_window_median", "half_window_ms": 250,
        "max_neighbor_steps": 4, "segment_gap_ms": 1000,
        "noise": "normalized_local_linear_residual_mad", "min_noise_residuals": 7,
        "noise_multiplier": 3, "limitations": "curvature_and_drift_are_not_ground_truth_motion",
    }
    return result


# Shoulders and hips define the trunk; these four landmarks drive posture/balance metrics.
TRUNK = (11, 12, 23, 24)
SYMMETRY_PAIRS = {"elbow": ("left_elbow", "right_elbow"),
                  "shoulder": ("left_shoulder", "right_shoulder"),
                  "knee": ("left_knee", "right_knee")}


def _trunk_points(frame, width: int, height: int):
    if not frame.landmarks:
        return None
    points = [frame.landmarks[i] for i in TRUNK]
    if not all(p.visibility >= VISIBILITY and 0 <= p.x <= 1 and 0 <= p.y <= 1 for p in points):
        return None
    ls, rs, lh, rh = [(p.x * width, p.y * height) for p in points]
    shoulder = ((ls[0] + rs[0]) / 2, (ls[1] + rs[1]) / 2)
    hip = ((lh[0] + rh[0]) / 2, (lh[1] + rh[1]) / 2)
    torso = math.hypot(shoulder[0] - hip[0], shoulder[1] - hip[1])
    return (shoulder, hip, torso) if torso >= 1e-6 else None


def _spread(values: list[float]) -> float:
    return percentile(values, .95) - percentile(values, .05)


def posture_metrics(payload: PoseInput, series: list[dict]) -> dict:
    """Trunk uprightness, pelvis travel and left/right balance in the image plane.

    Pelvis travel is normalised by the median trunk length so the value is comparable
    across camera distance; it describes weight shift and sinking, not a clinical score.
    """
    trunk = [_trunk_points(frame, payload.width, payload.height) for frame in payload.frames]
    usable = [item for item in trunk if item is not None]
    for row, item in zip(series, trunk):
        row["angles"]["trunk_lean"] = None
        if item is not None:
            (sx, sy), (hx, hy), _ = item
            # Deviation of hip->shoulder from image vertical, independent of lean direction.
            row["angles"]["trunk_lean"] = round(math.degrees(math.atan2(abs(sx - hx), hy - sy)), 4)
    lean_values = [row["angles"]["trunk_lean"] for row in series
                   if row["angles"]["trunk_lean"] is not None]
    smoothed, quality = signal_quality(series, "trunk_lean")
    for row, value in zip(series, smoothed):
        row.setdefault("smoothed_angles", {})["trunk_lean"] = (
            round(value, 4) if value is not None else None)
    enough = len(usable) >= 3
    lateral = vertical = None
    if enough:
        torso = percentile([item[2] for item in usable], .5)
        lateral = round(_spread([item[1][0] for item in usable]) / torso * 100, 1)
        vertical = round(_spread([item[1][1] for item in usable]) / torso * 100, 1)
    return {
        "valid_frames": len(usable),
        "coverage": len(usable) / len(series),
        "trunk_lean_median_deg": round(percentile(lean_values, .5), 2) if enough else None,
        "trunk_lean_range_p05_p95_deg": round(_spread(lean_values), 2) if enough else None,
        "trunk_lean_variation_status": quality["variation_status"],
        "pelvis_lateral_range_pct_torso": lateral,
        "pelvis_vertical_range_pct_torso": vertical,
        "reason": None if enough else "insufficient_visible_landmarks",
    }


def symmetry_metrics(metrics: dict) -> dict:
    """Left/right range difference on smoothed ranges (positive = left moves more)."""
    out = {}
    for pair, (left, right) in SYMMETRY_PAIRS.items():
        lv = metrics[left].get("smoothed_range_p05_p95_deg")
        rv = metrics[right].get("smoothed_range_p05_p95_deg")
        out[pair] = {
            "left_range_deg": lv, "right_range_deg": rv,
            "difference_deg": round(lv - rv, 2) if lv is not None and rv is not None else None,
        }
    return out


def analyze_pose(payload: PoseInput) -> dict:
    result = analyze_pose_v2(payload)
    result["algorithm_version"] = ALGORITHM_VERSION
    result["posture"] = posture_metrics(payload, result["series"])
    result["symmetry"] = symmetry_metrics(result["metrics"])
    return result
