# ADR-0020: Synthetic display profile correction history

Date: 2026-11-06. Status: engineering proposal; no institutional approval.

## Context

The Demo display profile stores optional age, sex, assistance and note in one row and refuses later changes. REAL-01B needs attributable corrections without rewriting existing rows. Older rows have no creator or creation time.

## Decision

Keep `demo_participant_profiles` as the immutable initial snapshot. Add `demo_profile_revisions` for new initial profiles and later full-snapshot corrections. A correction requires the current revision, a `SYN-` reason, CSRF, idempotency and the existing staff study/object write scope. The current read projects the latest revision, while a separate history read returns all versions. For a preexisting profile without a version-1 event, history projects its original row as `legacy_initial` with null actor/time; these facts are unknown, never inferred. The old row is never overwritten.

## Consequences

Only synthetic display metadata is editable; no identity mapping, verified consent, eligibility or clinical decision is added. A blank field remains unrecorded. Downgrade is rehearsed only on an empty disposable database, since it would erase revision history in a populated database.

## Revisit

Revisit after institutional approval defines the real participant profile, identity boundary, correction policy and consent documentation.
