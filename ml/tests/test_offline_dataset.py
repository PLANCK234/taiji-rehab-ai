import json
from copy import deepcopy
from hashlib import sha256

import pytest
from ml.offline_dataset import (
    generate_rows,
    quality_report,
    snapshot_files,
    split_participants,
    verify_split,
    write_snapshot,
)


def test_reproducible_snapshot_and_manifest(tmp_path):
    first = snapshot_files()
    assert first == snapshot_files()
    manifest = json.loads(first["manifest.json"])
    assert manifest["record_count"] == 36
    assert manifest["participant_count"] == 18
    assert manifest["target"] is None
    assert manifest["clinical_use"] is False
    assert manifest["data_class"] == "synthetic_demo"
    assert manifest["records_sha256"] == sha256(first["records.jsonl"]).hexdigest()
    assert manifest["splits_sha256"] == sha256(first["splits.json"]).hexdigest()
    assert first != snapshot_files(seed=123)
    output = tmp_path / "snapshot"
    write_snapshot(output)
    write_snapshot(output)
    assert {path.name: path.read_bytes() for path in output.iterdir()} == first
    (output / "records.jsonl").write_text("changed", encoding="utf-8")
    with pytest.raises(ValueError, match="refusing overwrite"):
        write_snapshot(output)


def test_quality_separates_missing_zero_and_detects_duplicates():
    rows = generate_rows()
    report = quality_report(rows)
    assert report["issues"] == []
    assert report["raw_value_null_count"] > 0
    assert report["observed_zero_count"] > 0
    assert report["missing_reason_counts"]["not_attempted"] > 0
    duplicate = deepcopy(rows[0])
    bad = deepcopy(rows)
    bad.append(duplicate)
    bad[1]["validity"] = "valid"
    bad[1]["raw_value"] = None
    report = quality_report(bad)
    assert report["duplicate_record_ids"] == [duplicate["record_id"]]
    assert {issue["code"] for issue in report["issues"]} >= {
        "duplicate_record_id", "invalid_manual_total"
    }
    with pytest.raises(ValueError, match="quality check failed"):
        split_participants(bad)


def test_participant_level_split_refuses_leakage_and_missing_members():
    rows = generate_rows()
    splits = split_participants(rows)
    assert all(splits[part] for part in ("train", "validation", "test"))
    assert splits == split_participants(list(reversed(rows)))
    for row in rows:
        assert sum(row["participant_id"] in values for values in splits.values()) == 1
    overlapping = deepcopy(splits)
    overlapping["test"].append(overlapping["train"][0])
    with pytest.raises(ValueError, match="overlap"):
        verify_split(rows, overlapping)
    incomplete = deepcopy(splits)
    incomplete["validation"].pop()
    with pytest.raises(ValueError, match="missing participants"):
        verify_split(rows, incomplete)
    with pytest.raises(ValueError, match="at least three"):
        split_participants(rows[:2])


def test_non_synthetic_or_unexplained_missing_value_is_rejected():
    rows = generate_rows()
    rows[0]["participant_id"] = "real-person"
    rows[0]["efficacy_label"] = "invented"
    rows[1]["validity"] = "missing"
    rows[1]["raw_value"] = None
    rows[1]["missing_reason"] = None
    report = quality_report(rows)
    assert {issue["code"] for issue in report["issues"]} >= {
        "missing_or_non_synthetic_id", "missing_reason_required", "unexpected_or_missing_fields"
    }
    with pytest.raises(ValueError, match="quality check failed"):
        split_participants(rows)
