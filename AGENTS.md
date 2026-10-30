# Repository agent instructions

> These instructions apply to the whole repository. Read `docs/README.md` to find the authoritative detail; do not treat this file as a specification replacement.

## Mission and constraints
- Build a **researcher-facing**, Chinese-first Web platform for Tai Chi rehabilitation assessment and research data management; **not** a patient app, autonomous diagnosis system, or autonomous clinical prescription engine.
- Follow `docs/product/PRD.md` and `docs/product/ACCEPTANCE.md`. When requirements disagree, document the conflict in `docs/OPEN_QUESTIONS.md` and ask the human owner before implementing a clinical rule.
- Clinical advice, grades and model suggestions are **proposals** until explicitly approved by an authorized clinician; preserve prediction, confirmation and version separately.
- Use synthetic fixtures only until ethics, consent, security review and hosting approvals are documented. Never upload identifiable health information to public LLMs.
- Never invent clinical cutoffs, treatment dosages, efficacy claims, research approvals, published papers or model performance results.

## Architecture
- Modular monolith: `frontend/` Next.js + TypeScript; `backend/` FastAPI + Python; PostgreSQL, SQLAlchemy, Alembic; `ml/` for offline rules/experiments; `infra/` for deployment.
- Validate with Pydantic and database constraints. Enforce RBAC and participant scope on the server, not just the UI. Use private file storage and audit privileged operations.
- A missing assessment or missing symptom report is **unknown**, never zero, normal, safe or completed.
- Persist append-only history for measurements, grades, training feedback, data snapshots and model decisions; corrections must be attributable.

## Workflow for every task
1. Read the relevant spec, current code and nearest nested `AGENTS.md`; consult `docs/ROADMAP.md`.
2. Describe the smallest shippable change, files touched, risk, tests and acceptance ID. Avoid unrelated rewrites.
3. Implement with migrations, validation, authorization, tests, docs and audit changes where needed.
4. Run applicable commands only **after** the matching package/tooling exists; never claim a test passed without executing it.
5. Update `docs/STATUS.md`, link evidence in `docs/TRACEABILITY.md`, record material tradeoffs as an ADR.

## Proposed quality gates (once initialized)
- Frontend: `pnpm --dir frontend lint`, `pnpm --dir frontend typecheck`, `pnpm --dir frontend test`.
- Backend: `cd backend && uv run ruff check . && uv run pytest`.
- End-to-end: `pnpm --dir frontend exec playwright test` after services start.
- Deploy: `docker compose -f infra/compose.yaml config` and documented smoke tests.
- Commands are **targets**, not evidence that these scripts/files already exist. The first implementation phase creates and verifies them.

## Stop-and-escalate conditions
- Any new clinical threshold, medical eligibility/contraindication, medication advice, use of identifiable images or third-party APIs, rules for data retention, model publication to clinical users, or changes to approved study protocol.
- Any data deletion, production migration or bulk export without an approved rollback/authorization plan.

## References
`README.md` → `docs/README.md` → PRD / architecture / API / data / ML / security / testing / runbooks. Current work: `docs/STATUS.md` and `docs/ROADMAP.md`.

## Agent lifecycle and durable handoff
1. **Rehydrate**: read this file, `docs/STATUS.md`, `docs/HANDOFF.md`, `docs/TASKS.md`, relevant specifications and nearest nested `AGENTS.md`. Check Git branch, HEAD, worktree and actual code; documents may lag.
2. **Select and scope**: choose a task whose dependencies are satisfied. State its Task ID, smallest files, acceptance IDs, tests and risk. Never infer an unapproved clinical rule.
3. **Implement and verify**: run applicable checks and record failures or unavailable tools honestly. Code written is not `DONE` until its exit criteria are verified.
4. **Checkpoint**: after each independently verifiable task, update its ledger state and handoff. For long tasks, persist a checkpoint before moving to another substantial unit. Prefer a scoped Git commit with test evidence.
5. **Handoff**: inspect diff/status; run applicable checks; update `TASKS`, `STATUS`, `TRACEABILITY` and `HANDOFF`; append `SESSION_LOG`; update affected contracts; report commit, uncommitted changes and next Task ID. Keep `HANDOFF` current even if other docs need no change.
6. **Stop**: for permissions, missing services, clinical approvals or unsafe ambiguity, mark the affected task `BLOCKED`, record the exact cause and next action, then continue independent tasks. Do not retry indefinitely.

The repository code, committed documents, executed test results and Git history are the cross-session record. Agents must not depend on hidden memory from a previous chat. See [collaboration workflow](docs/CONTRIBUTING.md) and [continuation prompt](docs/prompts/continue.md). Never overwrite another developer's uncommitted work or force push; remote main updates and PR merges require developer authorization.
