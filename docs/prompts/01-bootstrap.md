# Sprint 0 — Repository foundation

## Prompt to give Codex

> Read `AGENTS.md`, `docs/README.md`, `docs/ROADMAP.md`, and the relevant domain specifications before editing. Implement the following **single bounded milestone**. Use only synthetic data and do not invent clinical rules. First inspect current source and write a short plan. Then implement with migration, auth, audit, tests and docs updates as applicable.

## Scope
Create real frontend/backend/ml/infra modules; pin compatible versions, Docker Compose, Postgres, Alembic baseline, sample env, lint/typecheck/test scripts, CI, synthetic seed and health checks. Do not invent production settings.

## Acceptance / exit
Service startup, migration up/down on empty synthetic DB, frontend build, backend test and CI commands verified. Update README with **actual** commands.

## Required final Codex report
- Changes and file paths; FR/AT IDs satisfied.
- Actual commands executed and outputs/pass-fail status (not hypothetical).
- Database/API/privacy impact and rollback.
- Remaining open questions, known limitations, next smallest task.

**Do not move to the next milestone when acceptance fails.**
