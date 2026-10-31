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
pnpm --dir frontend test:e2e
docker compose -f infra/compose.yaml config
```
Sprint 0 installed frontend/backend tooling. Sprint 1 adds `backend/tests/test_auth_scope.py` for login, CSRF, rate limiting, session expiry, study and explicit participant scope, audit, and the synthetic-only gate; `frontend/app/workspace/auth.test.ts` covers session-guard branches. PostgreSQL migration `0002_auth_scope` is checked with `uv run alembic check` after upgrade.

S1-02 adds `backend/tests/test_synthetic_intake.py` for coded create scope/idempotency, consent revision and withdrawal, screening unknown/needs-review states, consent-gated collection, and absent photo route. `frontend/app/workspace/intake.test.ts` covers CSRF/idempotency transport and denied-list handling. Migration `0003_synthetic_intake` requires PostgreSQL upgrade/check and a disposable-database downgrade rehearsal; no downgrade on a populated synthetic or real database.

S2-01 adds `backend/tests/test_manual_assessments.py` for manual total 0 versus null, invalid/missing validation, append-only revisions, clinician confirmation, scope/consent/CSRF/idempotency/409 behavior and database constraints. `frontend/app/workspace/assessments.test.ts` covers display semantics, transport and local-time conversion. Migration `0004_manual_assessments` must upgrade, pass Alembic drift check, downgrade to `0003_synthetic_intake` and upgrade again on an **empty disposable** PostgreSQL database. PostgreSQL API smoke should verify persistence across a fresh TestClient and deny no-consent/unassigned access. These checks cover only the AT-01 recording/history and AT-02 input-domain portions.

S6-01 adds a server-guarded Next pose demo page and no image API or schema change. `backend/tests/test_pose_demo_boundary.py` asserts image/upload routes are absent. `frontend/app/participants/[id]/pose-demo/synthetic-pose-preview.test.tsx` exercises generate/clear behavior in jsdom and checks that no camera, file, network or local storage action occurs. A temporary synthetic PostgreSQL/Next HTTP smoke checks login redirect, assigned versus cross-study page access, the unavailable-algorithm message, and that a simulated `photo_scope` record never enables upload. Browser hand testing remains separate from the automated DOM test; do not claim it ran without evidence.

S6-02 adds Chromium browser coverage for the same synthetic page. From `frontend/`, install the locked dependencies, run `pnpm exec playwright install --with-deps chromium`, then `pnpm test:e2e`. Where the Playwright browser CDN is unavailable, build `Dockerfile.e2e` and run the same command in that container with `frontend/` mounted at `/app`; the image uses distribution Chromium via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. `playwright.config.ts` starts Next and a local mock API containing only coded synthetic fixture data; the tests check login redirect, an unassigned object 404, the algorithm warning, simulated photo scope, preview switching/clearing, no camera call and no write request. This is browser UI coverage with a mock API, not a PostgreSQL or real-image end-to-end test.

ENG-04A adds an opt-in PostgreSQL API workflow against a fresh `taiji_eng04` database. From the repository root run `uv run --no-project python scripts/run_eng04_integration.py`; it creates a uniquely named PostgreSQL 17 container with tmpfs storage, migrates up, checks drift, migrates down/up while empty, runs `backend/tests/test_postgres_workflow.py` and subsequent fixture integration tests, then stops the container. The database tests refuse a different database name and require `ENG04_INTEGRATION=1` and `ALLOW_SYNTHETIC_ONLY=true`. Ordinary backend pytest skips the database-only cases and always compares the live OpenAPI schema with `backend/openapi.json`. CI uses its disposable `taiji_eng04` service and runs the same migration sequence before all backend tests. This covers existing synthetic intake and manual assessment APIs, not grading, training, cycles, export, or browser end to end.

ENG-01A adds an opt-in local seed `python -m app.seed_reassessment_demo` after the base demo seed. It creates two coded, synthetic participants with simulated consent, unknown/absent screening, manual baseline/revisit entries, a missing value and an attributable correction. Re-running validates the full fixture and refuses changed or partial records rather than overwriting them. `backend/tests/test_seed_reassessment_demo.py` checks idempotence and visible API states on SQLite, then the same seed/read flow on the disposable PostgreSQL database. `scripts/run_eng04_integration.py` now runs both integration modules; ordinary pytest skips the two database-only cases. No grade, clinical outcome label or advice is generated.

PowerShell fallback from `frontend/`:

```powershell
docker build -f Dockerfile.e2e -t taiji-s6-02-e2e .
docker run --rm -e CI=true --mount "type=bind,source=$((Get-Location).Path),target=/app" -w /app taiji-s6-02-e2e sh -lc 'pnpm install --frozen-lockfile && pnpm test:e2e'
```

## Seed data
S1 local seed (`python -m app.seed_demo`) creates only three synthetic staff accounts, two studies and three coded objects for access tests; it has no clinical measurements. The optional ENG-01A fixture adds two synthetic coded participants and manual total records; later synthetic cohorts still need consent refusal, aborted sessions, symptoms, cycles and model decisions. Label all such data SYNTHETIC.

## Definition of done
Feature follows documented contract, permissions/validation, migration and rollback, tests executed with recorded output, no unapproved clinical rule, updated docs/traceability/status and reviewer checklist. No change is done because its code compiles alone.
