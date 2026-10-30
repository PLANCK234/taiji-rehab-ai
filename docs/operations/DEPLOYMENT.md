# Deployment guide (local Sprint 0 runnable; production remains a target)

## Environments
`local` / `test` / `staging` (synthetic only); `production-research` only after written institutional approvals. Do not configure public demo endpoints to a real clinical database.

## Proposed components
Docker Compose: reverse proxy (TLS), Next.js server, FastAPI server, PostgreSQL, optional private object store and isolated cron/worker for exports/training. No direct DB exposure. Secrets supplied by secure deployment mechanism, not tracked `.env`.

## Bootstrap checklist
1. Sprint 0 provides `infra/compose.yaml`, health checks, `.env.example`, an empty Alembic baseline and a synthetic fixture file. Local commands are in the root README; no participant seed is loaded before its schema exists.
2. CI builds frontend/backend, runs typecheck/lint/unit tests, integration migrations and synthetic E2E.
3. Stage release: backup → migration check → deploy → auth/API/data smoke tests → inspect logs and audit events.
4. Production gate: ethics/security/hosting/retention/rule approvals, support personnel, rollback and restore drill.
5. On regression: halt release, restore last good app/model pointer, revert compatible migrations only with DBA approval; never discard newly recorded research data.

## Environment variables (names proposed)
`DATABASE_URL`, `SESSION_SECRET`, `APP_ENV`, `APP_PUBLIC_URL`, `ALLOWED_ORIGINS`, `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_BUCKET`, `ENCRYPTION_KEY_REF`, `ENABLE_IMAGE_UPLOAD`, `ALLOW_SYNTHETIC_ONLY`. Never commit real values; production config validated against the institution's security policy.

## Operational verification
Smoke: application health, DB readiness, login/logout, read/write one synthetic test record (on staging), confirm blocked unauthorized access, export permission, queue/worker if enabled, backup age and TLS expiry. Record build and migration versions.
