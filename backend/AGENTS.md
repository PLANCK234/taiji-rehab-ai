# Backend agent instructions
- Python FastAPI, typed Pydantic schemas, SQLAlchemy + Alembic; keep business services separate from routers.
- Server-side RBAC plus per-participant authorization on every read/write/export; no trusting client-supplied roles.
- Transactions and idempotency keys for create/feedback submission. Corrections append revisions and audits.
- Treat missing as missing, never 0/normal. Use timezone-aware UTC storage and explicit local presentation.
- Do not embed research clinical cutoffs in controllers; invoke versioned rules approved for the environment.
- Unit/integration tests for 401/403, cross-participant access, grade boundaries, feedback safety and publication gate.
- Read `docs/data/DATA_MODEL.md`, `docs/api/API_CONTRACT.md`, `docs/security/SECURITY.md`.
