# Requirements traceability

| Requirement | Design | Tests | Sprint | State |
|---|---|---|---|---|
| Sprint 0 bootstrap | `frontend/`, `backend/`, `infra/compose.yaml`, README | frontend lint/typecheck/test/build; backend Ruff/pytest; migration up/down; HTTP smoke | 0 | local verified 2026-10-30; remote CI pending |
| Sprint 0 handoff | `AGENTS.md`, `HANDOFF.md`, `TASKS.md`, `SESSION_LOG.md`, ADR-0004 | `scripts/check_handoff.py`; recovery walkthrough | 0 | local verified 2026-10-30 |
| FR-001 user/auth | [API](api/API_CONTRACT.md), [security](security/SECURITY.md), [ADR-0005](decisions/0005-synthetic-auth-boundary.md), `backend/app/api.py`, `backend/app/security.py`, `backend/alembic/versions/0002_auth_scope.py`, `frontend/app/login/page.tsx` | `backend/tests/test_auth_scope.py` + `test_seed_demo.py` (14 total backend tests); `frontend/app/workspace/auth.test.ts`; PostgreSQL migration/check and container smoke | 1 | synthetic-only login/session and coded read scope locally verified 2026-10-30; AT-05 export portion pending S5-01; remote CI pending |
| FR-002 consent/screen | data, research | AT-03, AT-14 | 1 | not implemented |
| FR-003 assessments | dictionary, API | AT-01, AT-02 | 2 | not implemented |
| FR-004 grading V0 | ml/rule baseline | AT-02 | 3 | not implemented |
| FR-005 clinician review | API, governance | AT-04, AT-10 | 3 | not implemented |
| FR-006 training feedback | data model, API | AT-06, AT-07 | 4 | not implemented |
| FR-007 safety events | security, API | AT-08 | 4 | not implemented |
| FR-008/009 cycles/export | dataset, API | AT-01, AT-09 | 5 | not implemented |
| FR-010 audit/privacy | security, `backend/app/models.py`, `backend/app/api.py` | auth/login/logout/read audit checks in `test_auth_scope.py`; broader data/export audit later | all | auth-scope subset implemented; remaining audit not implemented |
| FR-011 cycle freeze | research/dataset | AT-09 | 5 | not implemented |
| P1 images | scope, security | AT-12 | 6 | not implemented |
| P1 ML registry | ML lifecycle | AT-10, AT-11 | 7 | not implemented |

When a feature is implemented, add links to actual source files, migrations, test names and CI run. **Do not mark complete solely because documents exist.**
