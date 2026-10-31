"""Deterministic, non-clinical display mapping for synthetic demos only."""

RULE_VERSION = "demo-rule-v1"
MODE_NAMES = {
    "I": "基础太极演示模式",
    "II": "简化站立太极演示模式",
    "III": "坐位 / 扶椅太极演示模式",
}


def demo_grade(score: int | None, *, valid: bool) -> tuple[str, str | None]:
    if not valid or score is None:
        return "UNASSESSED", None
    if not 0 <= score <= 12:
        raise ValueError("SPPB total outside 0..12")
    grade = "I" if score >= 10 else "II" if score >= 7 else "III" if score >= 4 else "IV"
    return grade, MODE_NAMES.get(grade)
