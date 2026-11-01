"""Idempotent, marked action-card seed for the local synthetic Demo."""

import os

from sqlalchemy.orm import Session

from app.db import get_engine
from app.models import DemoAction
from app.runtime import demo_enabled

CATALOG = [
    ("I-01", "起势", "基础", "I", "基础姿态的页面演示。", ["观看示意", "记录演示动作"]),
    ("I-02", "云手", "上肢", "I", "云手动作的页面演示。", ["观看示意", "记录演示动作"]),
    ("I-03", "开合手", "上肢", "I", "开合手动作的页面演示。", ["观看示意", "记录演示动作"]),
    ("I-04", "收势", "基础", "I", "收势动作的页面演示。", ["观看示意", "记录演示动作"]),
    ("II-01", "简化起势", "基础", "II", "简化站立起势的页面演示。", ["观看示意", "记录演示动作"]),
    ("II-02", "简化云手", "上肢", "II", "简化站立云手的页面演示。", ["观看示意", "记录演示动作"]),
    (
        "II-03",
        "简化开合手",
        "上肢",
        "II",
        "简化站立开合手的页面演示。",
        ["观看示意", "记录演示动作"],
    ),
    ("II-04", "简化收势", "基础", "II", "简化站立收势的页面演示。", ["观看示意", "记录演示动作"]),
    ("III-01", "坐位起势", "坐位", "III", "坐位起势的页面演示。", ["观看示意", "记录演示动作"]),
    ("III-02", "坐位云手", "坐位", "III", "坐位云手的页面演示。", ["观看示意", "记录演示动作"]),
    ("III-03", "扶椅重心转移", "扶椅", "III", "扶椅姿态的页面演示。", ["观看示意", "记录演示动作"]),
    ("III-04", "呼吸调息", "调息", "III", "调息动作的页面演示。", ["观看示意", "记录演示动作"]),
]


def main() -> None:
    if os.environ.get("APP_ENV") != "local" or not demo_enabled():
        raise RuntimeError("Demo action seed is restricted to synthetic local mode")
    with Session(get_engine()) as db, db.begin():
        for order, (key, name, category, grade, explanation, steps) in enumerate(CATALOG, 1):
            expected = dict(
                name=name,
                category=category,
                demo_grade=grade,
                explanation=explanation,
                steps=steps,
                display_order=order,
                enabled=True,
                marker="DEMO_ONLY",
            )
            existing = db.get(DemoAction, key)
            if existing is None:
                db.add(DemoAction(id=key, **expected))
            elif any(getattr(existing, field) != value for field, value in expected.items()):
                raise RuntimeError(f"Demo action {key} differs; refusing to overwrite")
    print("DEMO_ONLY action catalog ready")


if __name__ == "__main__":
    main()
