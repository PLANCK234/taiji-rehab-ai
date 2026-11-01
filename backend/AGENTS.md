# Backend agent instructions
- Python FastAPI, typed Pydantic schemas, SQLAlchemy + Alembic; keep business services separate from routers.
- Server-side RBAC plus per-participant authorization on every read/write/export; no trusting client-supplied roles.
- Transactions and idempotency keys for create/feedback submission. Corrections append revisions and audits.
- Treat missing as missing, never 0/normal. Use timezone-aware UTC storage and explicit local presentation.
- Do not embed research clinical cutoffs in controllers; invoke versioned rules approved for the environment.
- Unit/integration tests for 401/403, cross-participant access, grade boundaries, feedback safety and publication gate.
- Read `docs/data/DATA_MODEL.md`, `docs/api/API_CONTRACT.md`, `docs/security/SECURITY.md`.

## DEMO-V2 backend
- Reuse existing participant, assessment revision, training observation, feedback, event, authorization, receipt and audit models. Add only forward-compatible fields/tables via Alembic. Never rebuild PostgreSQL or erase observations.
- Run versioned Demo grading on the server and persist its evidence separately from clinical approval. The client does not select the saved functional grade. Demo plans need no clinical publication workflow, but remain `DEMO_ONLY` and require synthetic consent/scope for writes.
- Demo runs distinguish not started, in progress, paused, completed and stopped. Link final observed training to existing `training_sessions` and feedback revisions. Feedback is never inferred from completion; duplicate completion must be idempotent. Keep safety-event entry available.
