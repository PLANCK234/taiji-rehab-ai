# Test strategy / quality gates

## Layers
- Unit: V0 score boundaries, rule statuses, missingness, feedback schema, symptom mutual exclusions, feature cutoff/leakage, immutable historical versions.
- Integration: transaction/rollback, migrations, multi-role authorization, participant scoping, session idempotency, feedback revision, safety event without full form, frozen data integrity.
- E2E: doctor logs in → creates synthetic patient → consent/screening → baseline → candidate grade → review → 3 sessions and feedback → cycle endpoint → trend → coded export.
- Research ML: deterministic frozen snapshot, participant grouping, time-cutoff, baseline-vs-candidate comparison, rare safety event reporting, blocked unapproved publishing.
- Security and operations: direct-object-reference attempts, CSV redaction, image scope, export logs, backup/restore, TLS and environment secrets.

## Proposed commands, subject to repository bootstrap
```bash
cd backend && uv run ruff check . && uv run pytest
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend exec playwright test
docker compose -f infra/compose.yaml config
```
No scripts/packages are installed by this documentation package. Codex must create and verify commands in Sprint 0, then adjust instructions if different.

## Seed data
Synthetic cohort of 8–12 cases covering SPPB boundary scores, no measurement, consent refusal, aborted session, symptom event, missing feedback, role denial, two cycles, and approved/rejected model. Label the dataset SYNTHETIC.

## Definition of done
Feature follows documented contract, permissions/validation, migration and rollback, tests executed with recorded output, no unapproved clinical rule, updated docs/traceability/status and reviewer checklist. No change is done because its code compiles alone.
