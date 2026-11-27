"""Project explicit human observations without mutating AI evidence or past decisions."""

from app.models import PoseReview
from app.pose_analysis import JOINTS
from app.pose_schemas import PoseHumanConfirmation

REVIEW_METRICS = ("median_deg", "range_p05_p95_deg")


def human_confirmation(result: dict, reviews: list[PoseReview]) -> PoseHumanConfirmation | None:
    if not reviews:
        return None
    latest = max(reviews, key=lambda row: row.revision_no)
    if latest.decision not in {"accepted_observations", "modified_observations"}:
        return None
    metrics = {
        joint: {metric: result["metrics"][joint][metric] for metric in REVIEW_METRICS}
        for joint in JOINTS
    }
    # Each review is a complete snapshot relative to this immutable AI result.
    # Never silently carry corrections from an earlier human decision.
    for correction in latest.corrections:
        metrics[correction["joint"]][correction["metric"]] = correction["value"]
    return PoseHumanConfirmation(
        review_id=latest.id, revision_no=latest.revision_no, decision=latest.decision,
        metrics=metrics,
    )
