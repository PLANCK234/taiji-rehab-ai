"""DEMO-V2 isolated display mapping boundaries."""

import pytest

from app.demo_rule import RULE_VERSION, demo_grade


@pytest.mark.parametrize(
    ("score", "expected"),
    [(12, "I"), (10, "I"), (9, "II"), (7, "II"), (6, "III"), (4, "III"), (3, "IV"), (0, "IV")],
)
def test_demo_grade_boundaries(score: int, expected: str) -> None:
    grade, mode = demo_grade(score, valid=True)
    assert RULE_VERSION == "demo-rule-v1"
    assert grade == expected
    assert (mode is None) == (expected == "IV")


def test_missing_is_not_zero() -> None:
    assert demo_grade(None, valid=False) == ("UNASSESSED", None)
    assert demo_grade(0, valid=False) == ("UNASSESSED", None)
    with pytest.raises(ValueError):
        demo_grade(13, valid=True)
