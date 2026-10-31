"""Deterministic synthetic records for offline QA; no efficacy target or live extraction."""

import argparse
import hashlib
import json
import random
from collections import Counter
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "ENG-03A-SYNTHETIC-V1"
DEFAULT_SEED = 20261031
PARTITIONS = ("train", "validation", "test")
FILES = ("records.jsonl", "quality.json", "splits.json", "manifest.json")
ROW_FIELDS = frozenset(
    {
        "record_id", "study_code", "participant_id", "visit_kind", "protocol_version",
        "state", "validity", "raw_value", "missing_reason", "performed_at", "data_class",
    }
)


def _json_bytes(value: Any) -> bytes:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return f"{payload}\n".encode("utf-8")


def _checksum(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def generate_rows(seed: int = DEFAULT_SEED) -> list[dict[str, Any]]:
    """Generate fixed, plainly fictitious manual-total examples, never outcome labels."""
    rng = random.Random(seed)
    rows = []
    for number in range(1, 19):
        participant_id = f"SYN-ENG03A-{number:03d}"
        for visit_kind in ("baseline", "revisit"):
            state, validity, raw_value, missing_reason, performed_at = (
                "confirmed",
                "valid",
                0 if number == 1 and visit_kind == "baseline" else rng.randrange(13),
                None,
                f"2026-01-{1 if visit_kind == 'baseline' else 2:02d}T09:00:00+00:00",
            )
            if visit_kind == "revisit" and number % 8 == 0:
                state, validity, raw_value, performed_at = "draft", "unrecorded", None, None
            elif visit_kind == "revisit" and number % 7 == 0:
                validity, raw_value, missing_reason, performed_at = (
                    "invalid", None, "technical_failure", None
                )
            elif visit_kind == "revisit" and number % 6 == 0:
                validity, raw_value, missing_reason, performed_at = (
                    "missing", None, "not_attempted", None
                )
            rows.append(
                {
                    "record_id": f"{participant_id}-{visit_kind}",
                    "study_code": "SYN-ENG03A-STUDY",
                    "participant_id": participant_id,
                    "visit_kind": visit_kind,
                    "protocol_version": "SYN-MANUAL-V1",
                    "state": state,
                    "validity": validity,
                    "raw_value": raw_value,
                    "missing_reason": missing_reason,
                    "performed_at": performed_at,
                    "data_class": "synthetic_demo",
                }
            )
    return rows


def quality_report(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Report unknown values and structural defects without treating null as zero."""
    ids = Counter(row.get("record_id") for row in rows)
    issues = []
    by_validity = Counter()
    by_reason = Counter()
    for index, row in enumerate(rows):
        label = row.get("record_id") or f"row:{index}"
        validity = row.get("validity")
        value = row.get("raw_value")
        reason = row.get("missing_reason")
        by_validity[str(validity)] += 1
        if reason is not None:
            by_reason[str(reason)] += 1
        if set(row) != ROW_FIELDS:
            issues.append({"record": label, "code": "unexpected_or_missing_fields"})
        if not str(row.get("record_id", "")).startswith("SYN-") or not str(
            row.get("participant_id", "")
        ).startswith("SYN-"):
            issues.append({"record": label, "code": "missing_or_non_synthetic_id"})
        if row.get("data_class") != "synthetic_demo" or not str(
            row.get("study_code", "")
        ).startswith("SYN-"):
            issues.append({"record": label, "code": "non_synthetic_source"})
        if row.get("state") not in ("draft", "confirmed"):
            issues.append({"record": label, "code": "unknown_state"})
        if validity == "valid":
            if type(value) is not int or not 0 <= value <= 12:
                issues.append({"record": label, "code": "invalid_manual_total"})
            if row.get("performed_at") is None or reason is not None:
                issues.append({"record": label, "code": "invalid_valid_metadata"})
        elif validity in ("missing", "invalid"):
            if reason is None:
                issues.append({"record": label, "code": "missing_reason_required"})
            if validity == "missing" and value is not None:
                issues.append({"record": label, "code": "missing_has_value"})
        elif validity == "unrecorded":
            if row.get("state") != "draft" or value is not None:
                issues.append({"record": label, "code": "invalid_unrecorded"})
        else:
            issues.append({"record": label, "code": "unknown_validity"})
    duplicates = sorted(key for key, count in ids.items() if key is not None and count > 1)
    for key in duplicates:
        issues.append({"record": key, "code": "duplicate_record_id"})
    return {
        "record_count": len(rows),
        "participant_count": len({row.get("participant_id") for row in rows}),
        "validity_counts": dict(sorted(by_validity.items())),
        "missing_reason_counts": dict(sorted(by_reason.items())),
        "raw_value_null_count": sum(row.get("raw_value") is None for row in rows),
        "observed_zero_count": sum(
            row.get("validity") == "valid" and row.get("raw_value") == 0 for row in rows
        ),
        "duplicate_record_ids": duplicates,
        "issues": issues,
    }


def require_quality(rows: list[dict[str, Any]]) -> dict[str, Any]:
    report = quality_report(rows)
    if report["issues"]:
        raise ValueError(f"dataset quality check failed: {report['issues']}")
    return report


def split_participants(
    rows: list[dict[str, Any]], seed: int = DEFAULT_SEED
) -> dict[str, list[str]]:
    """Hash-sort participant IDs, then assign whole participants to 60/20/20 partitions."""
    require_quality(rows)
    participants = sorted(
        {row["participant_id"] for row in rows},
        key=lambda participant: (_checksum(f"{seed}:{participant}".encode()), participant),
    )
    count = len(participants)
    if count < 3:
        raise ValueError("at least three synthetic participants are required for three partitions")
    train_end = count * 6 // 10
    validation_end = count * 8 // 10
    partitions = {
        "train": participants[:train_end],
        "validation": participants[train_end:validation_end],
        "test": participants[validation_end:],
    }
    verify_split(rows, partitions)
    return partitions


def verify_split(rows: list[dict[str, Any]], partitions: dict[str, list[str]]) -> None:
    if set(partitions) != set(PARTITIONS):
        raise ValueError("split must contain train, validation and test")
    expected = {row["participant_id"] for row in rows}
    listed = [participant for part in PARTITIONS for participant in partitions[part]]
    if len(listed) != len(set(listed)) or set(listed) != expected:
        raise ValueError(
            "participant split has overlap, missing participants or unknown participants"
        )


def snapshot_files(seed: int = DEFAULT_SEED) -> dict[str, bytes]:
    rows = generate_rows(seed)
    quality = require_quality(rows)
    splits = split_participants(rows, seed)
    records = b"".join(_json_bytes(row) for row in rows)
    split_data = _json_bytes(splits)
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "data_class": "synthetic_demo",
        "source": "offline_generator",
        "seed": seed,
        "record_count": len(rows),
        "participant_count": quality["participant_count"],
        "records_sha256": _checksum(records),
        "splits_sha256": _checksum(split_data),
        "target": None,
        "clinical_use": False,
    }
    return {
        "records.jsonl": records,
        "quality.json": _json_bytes(quality),
        "splits.json": split_data,
        "manifest.json": _json_bytes(manifest),
    }


def write_snapshot(directory: Path, seed: int = DEFAULT_SEED) -> dict[str, bytes]:
    """Replay identical bytes; refuse to replace a changed or unrelated directory."""
    files = snapshot_files(seed)
    if directory.exists():
        if not directory.is_dir():
            raise ValueError("snapshot path is not a directory")
        existing = {entry.name for entry in directory.iterdir()}
        if existing - set(FILES):
            raise ValueError("snapshot directory contains unrelated files")
        for name in existing:
            if (directory / name).read_bytes() != files[name]:
                raise ValueError(f"snapshot differs; refusing overwrite: {name}")
    else:
        directory.mkdir(parents=True)
    for name, content in files.items():
        target = directory / name
        if not target.exists():
            target.write_bytes(content)
    return files


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic-only offline QA snapshot")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    args = parser.parse_args()
    files = write_snapshot(args.output, args.seed)
    manifest = json.loads(files["manifest.json"])
    print(f"SYNTHETIC snapshot: {manifest['records_sha256']} ({manifest['record_count']} rows)")


if __name__ == "__main__":
    main()
