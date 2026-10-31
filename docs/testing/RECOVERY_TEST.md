# 新会话恢复演练

只使用仓库、Git 和实际命令，按 [continue.md](../prompts/continue.md) 开始。回答并核对：

1. 当前阶段、已证实通过与未完成项目：`STATUS.md`、`TASKS.md`、测试命令。
2. 下一 Task ID、预计文件、验收及测试：`HANDOFF.md`、`TASKS.md`。
3. 不可擅改的临床规则：`AGENTS.md`、`OPEN_QUESTIONS.md`、PRD。
4. 如何提交与交接：`CONTRIBUTING.md`、`prompts/handoff.md`。

运行 `uv run python scripts/check_handoff.py`（仓库根目录也可用任意 Python 3.12+）检查必需文件、状态字段、Task ID 引用和仓库内相对 Markdown 链接。脚本不能代替人工核对测试结果和 Git 状态。

## 2026-10-30 仓库内恢复核对结果

1. Sprint 0 完成，S1-01 合成认证/编码只读权限完成；证据在 `STATUS.md`。GitHub Actions 远端未运行。
2. FR-001 的登录与读取权限已实现；FR-002 至 FR-011 未实现。AT-05 导出部分仍待 S5-01。
3. 下一项 `S1-02`：仅合成数据建档、同意、筛查；预计改后端模型与迁移、权限服务和前端表单，详见 `HANDOFF.md`。
4. 需跑后端 Ruff/pytest、迁移升降级与权限/同意集成测试、前端 lint/typecheck/test/build；AT-03/14 必须通过。
5. 未获批准的量表计分、适配模板、禁忌/剂量、安全上报时限、真实数据与模型发布规则不能擅改；见 `OPEN_QUESTIONS.md`。
6. 用任务分支提交可验证单元，更新 TASKS/STATUS/TRACEABILITY/HANDOFF，追加 SESSION_LOG，按 PR 审核协作；完整指令见 `prompts/handoff.md`。

## 2026-10-30 S1-02 接续核对

从干净的 `a95c9cd` 检查点读仓库与 Git，确认 S1-01 完成、S1-02 的合成数据回退边界可执行。完成后应核对 `feat/s1-02-synthetic-intake` 的最新 HEAD、迁移 `0003_synthetic_intake`、18 项后端与 7 项前端测试、临时 PostgreSQL 和页面烟测证据（见 `STATUS.md`）。下一任务 S2-01 只能采用 PRD 明许的合成数据人工确认总分路径；Q-02 未关闭时不能增加自动分项计分。原合成数据库卷未迁移或删除，真实研究准入仍未批准。

## 2026-10-30 S2-01 接续核对

从干净的 `0ed1df1fb37608bc39fb51b45d89914977b4e4ed` 检查点只读仓库与 Git，核对 S1-02 的代码、迁移、测试和上次交接；选择依赖已满足的 S2-01 人工总分合成路径。完成后应核对 `feat/s2-01-manual-assessments` 的实际 HEAD、`0004_manual_assessments`、后端 22/前端 11 项测试、空临时 PostgreSQL 升降升和代理页面烟测（见 `STATUS.md`）。S3-01 因 Q-03/09 未签核保持阻断；下一可执行任务是 S6-01 的纯合成本地预览壳，AT-12 的真实授权仍待 Q-01/10。原合成数据库卷未操作，真实研究准入未批准。

## 2026-10-31 S6-01 接续核对

从干净的 `2bf72360c94244995fe078a01f4b5cc61a3f7a0e` 检查点只读仓库与 Git，确认 S2-01 代码与台账一致，S3-01 因 Q-03/09 未签核阻断；按 `TASKS.md` 选择允许纯合成回退的 S6-01。完成后核对 `feat/s6-01-synthetic-pose-demo` 的实际 HEAD、已授权对象页面和合成 SVG 状态、23 项后端与 12 项前端测试、本地 HTTP 范围/无图片 API 烟测及 `STATUS.md` 的未运行检查。此时台账没有下一项依赖已满足的任务；S3-01 需授权负责人按 `OPEN_QUESTIONS.md` 关闭 Q-03/09 后才能继续。真实影像仍受 Q-01/10 阻断。

## 2026-10-31 ENG-04A 接续核对

开发负责人授权 ENG-01 至 ENG-04 的独立非临床工作后，新增台账与 ENG-04A 检查点。新会话从 `feat/eng-04a-postgres-contract` 核对实际 HEAD、干净工作区、`ENG-04A` 的临时 PostgreSQL 迁移/API 测试与 OpenAPI 契约；运行 `uv run --no-project python scripts/check_handoff.py`，其下一任务引用须为存在于 TASKS 的 `ENG-01A`。S3-01 仍因 Q-03/09 未签核 `BLOCKED`。ENG-01A 只能造可重放的合成建档至人工复评夹具，不生成候选等级或临床建议。

## 2026-10-31 ENG-01A 接续核对

从 `feat/eng-01a-synthetic-reassessment` 的干净检查点核对 `ENG-01A` 两名合成编号对象、重复运行与拒绝覆盖逻辑、SQLite/临时 PostgreSQL API 测试，并重跑 `scripts/check_handoff.py`；下一任务应为 `ENG-02A`。该任务只读已确认的合成数据库评估记录，保持缺失、草稿及无效状态，不得把原始总分变化解释为疗效。`S3-01` 仍需 Q-03/09 有权签核。

## 2026-10-31 ENG-02A 接续核对

从 `feat/eng-02a-assessment-trends` 的干净检查点核对真实 HEAD、`backend/app/research_api.py` 的角色/研究/对象权限和审计、`research_trends.py` 的最新确认与当前草稿分离、对象页的有效零分/缺失/无效图示。运行后端常规测试及临时 PostgreSQL 集成、前端 lint/typecheck/test/build、`scripts/run_eng02a_smoke.py` 的临时数据库→API→Next 页面烟测和交接检查。下一任务为 `ENG-03A`，不得从训练反馈臆造疗效标签或修改 SPPB 分级；`S3-01` 仍需 Q-03/09 签核。

## 2026-10-31 ENG-03A 接续核对

从 `feat/eng-03a-synthetic-offline-dataset` 的干净检查点确认 HEAD、`ml/offline_dataset.py` 与锁定依赖；重跑 `ml/` Ruff/pytest 和命令行合成快照重放，检查清单的 `target=null`、哈希与对象不交叉。下一项 `ENG-04B` 只覆盖已有合成业务的真实数据库浏览器 E2E。ENG-03 的 V0/候选评估、真实研究数据导出、时点特征和模型发布均未完成；`S3-01` 保持 Q-03/09 阻断。
