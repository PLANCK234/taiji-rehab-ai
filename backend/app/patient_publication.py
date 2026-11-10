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
}
LEGACY_CARD_TITLE = "原固定流程测试卡片"


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
