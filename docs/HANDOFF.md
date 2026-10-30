# 当前交接检查点

> 新 Agent 请先运行 `git status --short --branch` 和 `git rev-parse HEAD`，核对本文件与实际代码。HEAD 是本交接文件所在提交；其哈希不能自写入同一提交。

| 项目 | 当前值 |
|---|---|
| Branch / HEAD | `feat/s1-02-synthetic-intake`；HEAD = 包含本文件的本地检查点提交（运行 `git rev-parse HEAD`）；上一检查点 `a95c9cd` |
| 最近完成任务 | S1-02：仅合成编号对象建档、模拟同意和三态筛查；Sprint 1 合成范围仍 `IN_PROGRESS`，完整 CRUD/真实流程未完成 |
| 本次改动 | `backend/app/intake.py`、`intake_api.py`、模型/模式/授权、`0003_synthetic_intake` 迁移、OpenAPI 和测试；`frontend/app/workspace/` 创建表单、`frontend/app/participants/[id]/` 对象页/记录表单；API、数据、安全、验收、ADR-0006 及任务/状态文档 |
| 已通过验证 | 后端 Ruff/pytest 18；前端 Node 26/pnpm 10 容器 lint/typecheck/test 7/build；临时空 PostgreSQL 17 迁移升降升与 Alembic check；PostgreSQL 授权/同意/筛查 API 烟测；Next 前端代理工作台/对象页状态烟测；Compose config |
| 失败或未运行 | 本机 `pnpm` 不存在；首次非交互容器安装因 pnpm 模块清理确认失败，设置 `CI=true` 后通过；GitHub Actions 远端 CI 和 Playwright 未运行。测试有上游 Starlette TestClient 弃用警告 1 条 |
| 已知问题 | Q-01/Q-07/Q-10 与 Q-02 等未关闭；模拟同意不是真实签署；没有批准的筛查项目或安全/入组规则。照片、身份映射、评估及导出不可用；AT-05 导出部分待 S5-01，AT-14 真实数据准入待人工签核 |
| 尚未完成 | S1 完整受试者 CRUD、真实流程和后续业务；远端 PR/CI；任何真实研究使用。临时 PostgreSQL tmpfs 容器与开发服务已停止；原合成数据库卷未操作 |
| 下一任务 | `S2-01`：只按 PRD 明许的人工确认 SPPB 总分合成回退路径做评估草稿、缺失与追加历史；Q-02 未决时禁止分项自动计分或临床安全推断 |
| 需阅读 | `AGENTS.md`, `docs/ROADMAP.md`, `docs/product/PRD.md`, `docs/product/ACCEPTANCE.md`, `docs/research/PROTOCOL_INTERFACE.md`, `docs/data/DATA_MODEL.md`, `docs/data/DATA_DICTIONARY.md`, `docs/api/API_CONTRACT.md`, `docs/security/SECURITY.md`, `docs/testing/TEST_STRATEGY.md`, `docs/OPEN_QUESTIONS.md`, `backend/AGENTS.md`, `frontend/AGENTS.md` |
| 下一任务验收 | FR-003 / AT-01/02 的录入部分：草稿与确认分离；原始值/单位/有效性/缺失原因和操作者时间保留；修订只追加；缺失不是零；授权跨研究/对象 403；迁移、审计及前后端测试。AT-02 自动分级边界留给有批准规则的 S3-01 |
| 未提交修改 / 本地依赖 | 检查点提交时预计工作区干净；若实际不同以 `git status` 为准。本机无 `pnpm`，前端检查用 Node 26/pnpm 10 容器执行；`.pnpm-store` 已忽略且不随 Git 同步。临时数据库/密码不随 Git 同步 |

S1-02 证据见 [STATUS.md](STATUS.md)、[TRACEABILITY.md](TRACEABILITY.md)、[ADR-0006](decisions/0006-synthetic-intake-no-clearance.md) 与 [迁移](../backend/alembic/versions/0003_synthetic_intake.py)。不要把模拟同意或筛查 `needs_review` 解释为真实授权、合格或安全。恢复演练见 [RECOVERY_TEST.md](testing/RECOVERY_TEST.md)。
