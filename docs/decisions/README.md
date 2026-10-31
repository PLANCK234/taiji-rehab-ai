# Architecture Decision Records (ADR)

For a significant architecture, compliance, research data or model-release decision, create an immutable dated `NNNN-short-title.md` with: Context / Options / Decision / Consequences / Revisit trigger / Approvers. Supersede rather than rewriting history.

Current proposals:
- [ADR-0001](0001-modular-monolith.md): modular monolith first.
- [ADR-0002](0002-human-approved-clinical-rules.md): clinical approval gate.
- [ADR-0003](0003-frozen-offline-ml.md): frozen-snapshot offline optimization.
- [ADR-0004](0004-persistent-agent-handoff.md): repository-based checkpoint and cross-session handoff.
- [ADR-0005](0005-synthetic-auth-boundary.md): synthetic-only staff access and explicit coded-participant scope.
- [ADR-0006](0006-synthetic-intake-no-clearance.md): append-only simulated consent and screening without clinical clearance.
- [ADR-0007](0007-synthetic-manual-total-revisions.md): append-only synthetic manual SPPB total with distinct draft, confirmation and missingness.
- [ADR-0008](0008-synthetic-pose-preview-no-images.md): browser-local synthetic SVG pose shell without image collection.
- [ADR-0009](0009-synthetic-confirmed-trend.md): separate latest confirmed manual totals from pending drafts in synthetic research trend reads.

These are engineering **proposals**, pending team acceptance; not signed hospital governance decisions.
