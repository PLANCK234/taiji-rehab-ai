# Requirements traceability

> 本分支证据只对应 `a69aac8` 上的本地合成预览版本，不适用于远端 `1f1d977` 的不同页面及新增工程功能。见[远端差异](testing/S6-01-REMOTE-RECONCILIATION.md)。

| Requirement | Design | Tests | Sprint | State |
|---|---|---|---|---|
| Sprint 0 bootstrap | `frontend/`, `backend/`, `infra/compose.yaml`, README | frontend lint/typecheck/test/build; backend Ruff/pytest; migration up/down; HTTP smoke | 0 | local verified 2026-10-30; remote CI pending |
| Sprint 0 handoff | `AGENTS.md`, `HANDOFF.md`, `TASKS.md`, `SESSION_LOG.md`, ADR-0004 | `scripts/check_handoff.py`; recovery walkthrough | 0 | local verified 2026-10-30 |
| FR-001 user/auth | [API](api/API_CONTRACT.md), [security](security/SECURITY.md), [ADR-0005](decisions/0005-synthetic-auth-boundary.md), `backend/app/api.py`, `backend/app/security.py`, `backend/alembic/versions/0002_auth_scope.py`, `frontend/app/login/page.tsx` | `backend/tests/test_auth_scope.py` + `test_seed_demo.py` (14 total backend tests); `frontend/app/workspace/auth.test.ts`; PostgreSQL migration/check and container smoke | 1 | synthetic-only login/session and coded read scope locally verified 2026-10-30; AT-05 export portion pending S5-01; remote CI pending |
| FR-002 synthetic intake | [API](api/API_CONTRACT.md), [data](data/DATA_MODEL.md), [security](security/SECURITY.md), [ADR-0006](decisions/0006-synthetic-intake-no-clearance.md), `backend/app/intake_api.py`, `backend/alembic/versions/0003_synthetic_intake.py`, `frontend/app/participants/[id]/page.tsx` | `backend/tests/test_synthetic_intake.py` (18 backend total), `frontend/app/workspace/intake.test.ts` (7 frontend total), PostgreSQL migration/check + API/UI smoke | 1 | synthetic coded create, simulated consent and tri-state screening locally verified 2026-10-30; AT-03 synthetic portion; AT-14 real-data approval pending |
| FR-003 synthetic manual assessment subset | [API](api/API_CONTRACT.md), [data](data/DATA_MODEL.md), [dictionary](data/DATA_DICTIONARY.md), [ADR-0007](decisions/0007-synthetic-manual-total-revisions.md), `backend/app/assessment_api.py`, `backend/alembic/versions/0004_manual_assessments.py`, `frontend/app/assessments/[id]/page.tsx` | `backend/tests/test_manual_assessments.py` (22 backend total), `frontend/app/workspace/assessments.test.ts` (11 frontend total), PostgreSQL upgrade/check/downgrade/upgrade and API/Next smoke | 2 | S2-01 locally verified 2026-10-30; AT-01 recording/history and AT-02 input-domain portions only; export/grading pending |
| FR-004 grading V0 | ml/rule baseline | AT-02 | 3 | not implemented |
| FR-005 clinician review | API, governance | AT-04, AT-10 | 3 | not implemented |
| FR-006 training feedback | data model, API | AT-06, AT-07 | 4 | not implemented |
| FR-007 safety events | security, API | AT-08 | 4 | not implemented |
| FR-008/009 cycles/export | dataset, API | AT-01, AT-09 | 5 | not implemented |
| FR-010 audit/privacy | security, `backend/app/models.py`, `backend/app/api.py`, `backend/app/intake_api.py`, `backend/app/assessment_api.py` | auth/login/logout/read and intake/assessment allow/deny audit checks in backend tests; export audit later | all | auth, synthetic intake and manual-assessment subsets implemented; remaining audit not implemented |
| FR-011 cycle freeze | research/dataset | AT-09 | 5 | not implemented |
| P1 images | [合成预览组件](../frontend/app/participants/%5Bid%5D/synthetic-pose-demo.tsx), [对象详情](../frontend/app/participants/%5Bid%5D/page.tsx), [安全边界](security/SECURITY.md) | [组件测试](../frontend/app/participants/%5Bid%5D/synthetic-pose-demo.test.tsx)验证初始文案及无采集控件；独立工具链 lint/typecheck、Vitest 12/build；[浏览器验收 10/10](testing/S6-01-VERIFICATION.md)验证交互、三种同意状态、无上传、真实鉴权范围 | 6 | 2026-10-31 S6-01 纯合成范围本地 DONE，未提交及 PR/远端 CI；真实摄像/图片授权、完整照片流程 E2E 仍待 Q-01/10 |
| P1 ML registry | ML lifecycle | AT-10, AT-11 | 7 | not implemented |

When a feature is implemented, add links to actual source files, migrations, test names and CI run. **Do not mark complete solely because documents exist.**
