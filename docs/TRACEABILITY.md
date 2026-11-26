# Requirements traceability

## 2026-11-26 DEMO-V2-15 信号与采集完善

| 验收 | 实现 | 证据/限制 |
|---|---|---|
| AI-SIGNAL-01..04 | `pose_analysis.py` v2，分段中位数/线性残差MAD，原始序列保留 | `test_pose_signal.py`固定种子：静态RMS降低37.54%，带噪4°慢变RMS0.086615°；两周期轨迹RMS0.091788°，范围3.96°；缺失/时间缺口不跨越。数值验证，不是人体精度 |
| AI-CAPTURE-02 / AI-SAVE-02 | `pose-capture.ts`、采集页、可传固定幂等键的writeDemo/savePose | `pose.real.ts`实际模型+250ms故意慢分发仍200ms时间点、提交响应丢失后恢复无重复、随后详情503恢复与提示清除；390px截图/曲线；最终9通过(39.6s)，exports/pose-browser-34c0eb4513/browser/ |
| AI-UPGRADE-02 / AI-LEGACY-02 | `0009_pose_geometry_v2`、v1函数/结果保留、摘要列表与图表兼容 | `test_pose_upgrade.py`带旧数据升级/存在v2拒绝回退；`test_pose_postgres.py`重开v1/v2；API完整详情/摘要区分；后端59/6skip，独立PostgreSQL7通过，前端25测试通过 |

预设目标见[验证](testing/AI_POSE_VALIDATION.md)，取舍见[ADR-0017](decisions/0017-pose-signal-and-retry.md)。实体手机、真实连续太极与专家评分仍未验。

## 2026-11-26 真实AI姿态实施追踪

| 范围 | 实现 | 执行证据与未验范围 |
|---|---|---|
| DEMO-V2-10 / AT-AI-01 | `backend/app/pose_analysis.py`、`pose_schemas.py`、`pose_api.py`、`0008_pose_analyses`，原始输入/指标与独立复核表 | `test_pose_analysis.py`、`test_pose_api.py`、`test_pose_postgres.py`；后端52/5skipped、独立PostgreSQL升降升/check与6 API通过 |
| DEMO-V2-11 / AT-AI-02子范围 | `frontend/workers/pose-worker.js`、固定SDK与模型锁、prepare-pose、新AI页面、合成素材 | `frontend/e2e/pose.real.ts`实际模型，`run_pose_browser.py`；`exports/pose-browser-23fa682926/browser/pose-report.png`与.last-run.json；最终8场景通过，含合成摄像流停止/释放；曾25/25采样帧单人检测；无实体手机或人群准确率证据 |
| DEMO-V2-13/14子范围 / AT-AI-04/05 partial | 原AI结果不覆盖、观察复核独立修订、历史骨架回放 | 浏览器确认/刷新、API幂等/并发/越权、空画面拒绝有效确认及旧Demo/训练回归；逐项量表评分、最终阶段/计划及专家标注验证未实现 |

完整预设目标、复现命令及限制见[验证](testing/AI_POSE_VALIDATION.md)，设计取舍见[ADR-0016](decisions/0016-local-pose-geometry-evidence.md)。

## 2026-11-26 AI视频评估设计追踪

| 范围 | 文档 | 证据与边界 |
|---|---|---|
| DEMO-V2-09 / AT-AI-DOC-01 | [方案](product/AI_VIDEO_ASSESSMENT_PROPOSAL.md)、[ADR-0015](decisions/0015-ai-video-assessment-proposal.md)、[任务](TASKS.md)、[Q-14/15](OPEN_QUESTIONS.md) | 已读人工评估、Demo规则、姿态SVG代码并核对官方模型文档；handoff与diff检查通过。仅设计交付，不代表量表/真实识别或模型准确率验收。 |

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
| P1 synthetic pose shell | [scope](product/SCOPE.md), [security](security/SECURITY.md), [ADR-0008](decisions/0008-synthetic-pose-preview-no-images.md), `frontend/app/participants/[id]/pose-demo/page.tsx`, `frontend/app/participants/[id]/pose-demo/synthetic-pose-preview.tsx`; no image backend route or migration | `frontend/app/participants/[id]/pose-demo/synthetic-pose-preview.test.tsx` (12 frontend total), `backend/tests/test_pose_demo_boundary.py` (23 backend total), temporary PostgreSQL/Next HTTP scope and no-upload smoke; `frontend/e2e/synthetic-pose.pw.ts` Playwright/Chromium 3 tests with local synthetic API fixture | 6 | S6-01 synthetic shell and S6-02 browser UI subset locally verified 2026-10-31; AT-12 real capture/consent and manual UAT pending Q-01/10; browser test does not cover PostgreSQL |
| P1 ML registry | ML lifecycle | AT-10, AT-11 | 7 | not implemented |
| ENG-04A synthetic API and handoff gate | `backend/tests/test_postgres_workflow.py`, `backend/tests/test_api_contract.py`, `.github/workflows/ci.yaml`, `scripts/run_eng04_integration.py`, `scripts/check_handoff.py`; [test strategy](testing/TEST_STRATEGY.md) | temporary PostgreSQL 17 upgrade/check/downgrade/upgrade; real DB coded intake, consent, screening, baseline/revisit, missingness/history, cross-study/object and role denies; OpenAPI snapshot equality; ENG next-ID handoff check | engineering | locally verified 2026-10-31; remote CI pending; existing APIs only |
| ENG-01A synthetic reassessment fixture | `backend/app/seed_reassessment_demo.py`, `backend/tests/test_seed_reassessment_demo.py`, [README](../README.md), [test strategy](testing/TEST_STRATEGY.md) | repeatable SQLite seed/API state and changed-fixture refusal; disposable PostgreSQL migration plus seed twice/API read | engineering | locally verified 2026-10-31; only FR-002/003 synthetic subset; no grade, training, cycle or export |
| ENG-02A synthetic manual-total trend | [API](api/API_CONTRACT.md), [dictionary](data/DATA_DICTIONARY.md), [security](security/SECURITY.md), [ADR-0009](decisions/0009-synthetic-confirmed-trend.md), `backend/app/research_trends.py`, `backend/app/research_api.py`, `frontend/app/participants/[id]/assessment-trend.tsx` | `backend/tests/test_research_trends.py` role/scope/history/audit; `backend/tests/test_seed_reassessment_demo.py` actual PostgreSQL trend read; `frontend/app/participants/[id]/assessment-trend.test.tsx`, typed client test; `scripts/run_eng02a_smoke.py` PostgreSQL→API→Next page and cross-study 404 | engineering | locally verified 2026-10-31; FR-003/009 and AT-01/05 read subsets only; no cycle, export, grade or efficacy claim |
| ENG-03A synthetic offline QA / split | [dataset specification](research/DATASET_SPEC.md), [lifecycle](ml/MODEL_LIFECYCLE.md), [ADR-0010](decisions/0010-synthetic-offline-split.md), `ml/offline_dataset.py` | `ml/tests/test_offline_dataset.py` deterministic bytes/hash, zero/null and missingness, duplicate/non-synthetic rejection, participant overlap/omission rejection; CLI replay | engineering | locally verified 2026-10-31; AT-11 participant split subset only; no real extraction, approved outcome, model or temporal cutoff |
| ENG-04B real browser synthetic API flow | `frontend/e2e/real-business.real.ts`, `scripts/run_eng04b_browser.py`, `frontend/Dockerfile.e2e-real` | disposable PostgreSQL/FastAPI/Next/Chromium: 3 original ENG-04B cases plus 1 D0 case all passed after explicit navigation wait; temporary containers stopped | engineering | locally verified 2026-10-31; synthetic-only, no cycle/export |

| REAL-01P Demo/Research isolation | [ADR-0011](decisions/0011-demo-research-profile-boundary.md), `backend/app/runtime.py`, `backend/app/db.py`, `backend/alembic/env.py`, `infra/compose.yaml`, `infra/compose.research.yaml`, `.env.research.example` | `backend/tests/test_runtime_profiles.py` (Research/unknown refusal and seeds), backend Ruff/pytest 30 passed/2 opt-in skipped, disposable PostgreSQL migration/API 3 passed, Demo/Research Compose config | engineering | locally verified 2026-10-31; Research deliberately closed, no real data or deployment approval |
| REAL-01D0 / FR-006/007 / AT-06/07/08 partial | [ADR-0012](decisions/0012-training-observation-before-cycle.md), `backend/app/training_api.py`, `backend/app/training_schemas.py`, `backend/alembic/versions/0005_training_observations.py`, `frontend/app/participants/[id]/training-forms.tsx`, `frontend/app/participants/[id]/training/[sessionId]/page.tsx`, [API](api/API_CONTRACT.md), [dictionary](data/DATA_DICTIONARY.md) | `backend/tests/test_training_observations.py`, `test_training_postgres.py`; temporary PostgreSQL migration/check/API 4 passed; backend 32 passed/3 opt-in skipped; frontend 21 tests/lint/typecheck/build; `frontend/e2e/training.real.ts` in 4-pass real browser run | engineering | observed sessions/feedback revisions and independent unclassified events locally verified; no cycle/rule link, event review, prescription or real data |
| REAL-01F0 / FR-008/009 / AT-01/05 partial | [ADR-0013](decisions/0013-live-coded-demo-export.md), `backend/app/research_export.py`, `backend/app/research_export_api.py`, `frontend/app/participants/[id]/page.tsx`, [API](api/API_CONTRACT.md), [dictionary](data/DATA_DICTIONARY.md) | `backend/tests/test_export_postgres.py` in disposable PostgreSQL 5-pass integration, backend 32 passed/4 opt-in skipped; `frontend/e2e/training.real.ts` Chromium download and cross-scope reject in 4-pass real browser run; content hash/rows/privacy assertions | engineering | locally verified 2026-10-31; single-participant live Demo CSV only, no frozen cycle or real-data approval |
| REAL-01A–F business loop | [task breakdown](TASKS.md), [PRD](product/PRD.md), [acceptance](product/ACCEPTANCE.md) | Existing S1/S2/ENG rows only cover synthetic subsets; each REAL task needs own PostgreSQL/API/browser and authorization evidence | engineering | incomplete; S3-01 remains blocked by Q-03/Q-09 |

When a feature is implemented, add links to actual source files, migrations, test names and CI run. **Do not mark complete solely because documents exist.**

## DEMO-V2 独立合成验收追踪（2026-10-31）

| 验收 | 实现 | 证据与边界 |
|---|---|---|
| AT-DEMO-01/02 | [流程](product/DEMO_USER_FLOW.md)、`backend/app/demo_rule.py`、`backend/app/assessment_api.py`、`frontend/app/workspace/create-participant-form.tsx`、`frontend/app/participants/[id]/demo/` | `backend/tests/test_demo_rule.py` 与 `test_manual_assessments.py`；`frontend/e2e/demo-v2.real.ts` 8→II、5→III、重开；只供合成展示 |
| AT-DEMO-03 | `backend/app/seed_demo_actions.py`、`backend/app/demo_api.py`、方案页 | 12 条本地幂等种子；Chromium 搜索/等级筛选/详情弹窗；无医学照片 |
| AT-DEMO-04/05 | `backend/alembic/versions/0006_demo_v2.py`、`0007_demo_completed_actions.py`、`demo_runs`、原 `training_sessions`/`training_feedback_revisions`、训练页 | PostgreSQL 浏览器开始/暂停/继续/结束/实际完成动作/RPE/完成/刷新与中止未知值 7 passed；API 无反馈拒绝完成、完成动作校验与重复提交；后端 42 passed/4 skipped |
| AT-DEMO-06 | 原认证/作用域/审计、迁移、`backend/openapi.json`；DEMO-V2-08 `backend/app/api.py:check_origin` | `backend/tests/test_auth_scope.py` 校验两个本地同端口回环来源、异端口/外部拒绝和 Research 配置；真实登录 API 两来源 200、外部 403；Chromium 8 passed 含 127 登录与原越权流程。真实数据/临床审批不在本验收 |

`FR-004/005` 与 `AT-02/04` 的正式临床规则/审批状态仍由 S3-01/Q-03/Q-09 约束；本表不宣称通过。
