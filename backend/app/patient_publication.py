"""Synthetic publication projection; never derives patient advice from Demo rules."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DemoPatientBinding, DemoPatientPublication

MARKER = "SYNTHETIC_PROCESS_ONLY"
MESSAGE = "合成发布流程测试卡片；没有可执行的训练计划。"
VIDEO_STATUS = "awaiting_review"
CARD_OPTIONS = {
    "SYN-CARD-A": "演示卡片 A · 初次查看",
    "SYN-CARD-B": "演示卡片 B · 后续查看",
    "SYN-TAIJI-OPENING": "演示动作：起势",
    "SYN-TAIJI-CLOUD-HANDS": "演示动作：云手",
    "SYN-TAIJI-OPENING-CLOUD-HANDS": "演示动作：起势、云手",
}
LEGACY_CARD_TITLE = "原固定流程测试卡片"

TAIJI_ACTIONS = {
    f"SYN-24-{number:02}": f"{number:02} {name}"
    for number, name in enumerate((
        "起势", "左右野马分鬃", "白鹤亮翅", "左右搂膝拗步", "手挥琵琶", "左右倒卷肱",
        "左揽雀尾", "右揽雀尾", "单鞭", "云手", "单鞭", "高探马",
        "右蹬脚", "双峰贯耳", "转身左蹬脚", "左下势独立", "右下势独立", "左右穿梭",
        "海底针", "闪通臂", "转身搬拦捶", "如封似闭", "十字手", "收势",
    ), start=1)
}


def active_binding(db: Session, participant_id: uuid.UUID) -> bool:
    return db.scalar(
        select(DemoPatientBinding.user_id).where(
            DemoPatientBinding.participant_id == participant_id,
            DemoPatientBinding.revoked_at.is_(None),
        )
    ) is not None


def latest_publication(db: Session, participant_id: uuid.UUID) -> DemoPatientPublication | None:
    return db.scalar(
        select(DemoPatientPublication)
        .where(DemoPatientPublication.participant_id == participant_id)
        .order_by(DemoPatientPublication.version.desc())
        .limit(1)
    )
