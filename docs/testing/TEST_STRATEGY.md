# Test strategy / quality gates

## Layers
- Unit: V0 score boundaries, rule statuses, missingness, feedback schema, symptom mutual exclusions, feature cutoff/leakage, immutable historical versions.
- Integration: transaction/rollback, migrations, multi-role authorization, participant scoping, session idempotency, feedback revision, safety event without full form, frozen data integrity.
- E2E: doctor logs in → creates synthetic patient → consent/screening → baseline → candidate grade → review → 3 sessions and feedback → cycle endpoint → trend → coded export.
- Research ML: deterministic frozen snapshot, participant grouping, time-cutoff, baseline-vs-candidate comparison, rare safety event reporting, blocked unapproved publishing.
- Security and operations: direct-object-reference attempts, CSV redaction, image scope, export logs, backup/restore, TLS and environment secrets.

## Implemented commands and later targets
```bash
cd backend && uv run ruff check . && uv run pytest
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend test
pnpm --dir frontend exec playwright test
docker compose -f infra/compose.yaml config
```
Sprint 0 installed frontend/backend tooling. Sprint 1 adds `backend/tests/test_auth_scope.py` for login, CSRF, rate limiting, session expiry, study and explicit participant scope, audit, and the synthetic-only gate; `frontend/app/workspace/auth.test.ts` covers session-guard branches. PostgreSQL migration `0002_auth_scope` is checked with `uv run alembic check` after upgrade. Playwright remains a later target; no Playwright package or browser suite is installed yet.

## Seed data
S1 local seed (`python -m app.seed_demo`) creates only three synthetic staff accounts, two studies and three coded objects for access tests; it has no clinical measurements. A later synthetic cohort should cover SPPB boundaries, missingness, consent refusal, aborted sessions, symptoms, role denial, cycles and model decisions. Label all such data SYNTHETIC.

## Definition of done
Feature follows documented contract, permissions/validation, migration and rollback, tests executed with recorded output, no unapproved clinical rule, updated docs/traceability/status and reviewer checklist. No change is done because its code compiles alone.
