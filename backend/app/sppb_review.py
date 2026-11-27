"""Project the latest explicit human timing, without mutating candidate evidence."""

from app.models import SppbMeasurement, SppbReview
from app.sppb_schemas import SppbHumanConfirmation


def confirmation(
    row: SppbMeasurement, reviews: list[SppbReview],
) -> SppbHumanConfirmation | None:
    if not reviews:
        return None
    latest = max(reviews, key=lambda review: review.revision_no)
    if latest.decision not in {"accepted_timing", "modified_timing"}:
        return None
    if latest.decision == "modified_timing":
        start, end = latest.start_ms, latest.fifth_stand_ms
    else:
        start, end = row.result["start_ms"], row.result["fifth_stand_ms"]
    return SppbHumanConfirmation(
        review_id=latest.id, revision_no=latest.revision_no, start_ms=start,
        fifth_stand_ms=end, elapsed_seconds=round((end - start) / 1000, 4),
        recorded_by=latest.recorded_by, recorded_at=latest.recorded_at,
    )
