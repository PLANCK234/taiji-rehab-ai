# 当前交接检查点

> 新 Agent 请先运行 `git status --short --branch` 和 `git rev-parse HEAD`，核对本文件与实际代码。HEAD 是本交接文件所在提交；其哈希不能自写入同一提交。

| 项目 | 当前值 |
|---|---|
| Branch / HEAD | `feat/s0-bootstrap-handoff`；HEAD = 包含本文件的本地检查点提交（运行 `git rev-parse HEAD`） |
| 最近完成任务 | S0-01、S0-02、S0-03、S0-04；Sprint 0 本地验收完成 |
| 本次改动 | `frontend/` 健康页/工具链；`backend/` 健康/就绪 API 与空基线迁移；`infra/compose.yaml`；`.github/workflows/ci.yaml`；根 README/环境示例；`docs/` 交接体系与 `scripts/check_handoff.py` |
| 已通过验证 | 前端 lint/typecheck/test 2/build；后端 Ruff/pytest 2；Compose 构建/配置；Postgres 迁移升降升；容器 health/ready/首页 200；交接检查 |
| 失败或未运行 | 初次 Ruff import 顺序失败后修复并通过；Docker Desktop 曾短暂重启，服务重启后冒烟通过；GitHub Actions 远端 CI 未运行 |
| 已知问题 | 真实数据/临床/生产审批未有证据；见 `OPEN_QUESTIONS.md`。TestClient 有一条上游弃用警告 |
| 尚未完成 | Sprint 1 及后续业务功能；远端 PR/CI；任何真实研究使用 |
| 下一任务 | `S1-01`：登录、会话、服务器端 RBAC 与研究分配；本次没有开始 Sprint 1 |
| 需阅读 | `AGENTS.md`, `docs/ROADMAP.md`, `docs/product/PRD.md`, `docs/product/ACCEPTANCE.md`, `docs/security/SECURITY.md`, `docs/api/API_CONTRACT.md`, `docs/data/DATA_MODEL.md`, `backend/AGENTS.md`, `frontend/AGENTS.md` |
| 下一任务验收 | FR-001 / AT-05：跨角色、跨研究/对象访问在服务器拒绝并审计；至少单测和集成权限测试；迁移升降级与前后端检查 |
| 未提交修改 / 本地依赖 | 检查点提交时预计工作区干净；若实际不同以 `git status` 为准。Node.js 26 与 pnpm 10 的临时本地安装不随 Git 同步；按 README 重建 |

下一任务预计修改 `backend/app/`、`backend/alembic/versions/`、`backend/tests/`、`frontend/app/` 及相关 API/数据/安全文档。先检查未决问题及实际 Git 状态，避免扩展到临床规则。恢复演练见 [RECOVERY_TEST.md](testing/RECOVERY_TEST.md)。
