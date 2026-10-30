# 实施状态

更新：2026-10-30；当前阶段：Sprint 0 工程交付，Sprint 1 `NOT_STARTED`。本仓库只可用于合成数据开发；临床、伦理、真实数据和生产部署均未获本仓库文件证明批准。

| 范围 | 状态 | 证据与限制 |
|---|---|---|
| Sprint 0 前后端骨架 | DONE | Next.js 构建、lint/typecheck、Vitest 2 tests；FastAPI Ruff、pytest 2 tests；容器 HTTP 冒烟 200 |
| PostgreSQL / Alembic / Compose | DONE | PostgreSQL 17 健康；空库 `upgrade head → current → downgrade base → upgrade head` 成功；`/ready` 返回 ready；Compose config 成功 |
| CI 配置 | DONE | `.github/workflows/ci.yaml` 已配置；同等本地命令已执行。GitHub Actions 远端运行尚未发生，待 PR 验证 |
| 持久交接 | DONE | 任务台账、HANDOFF、追加日志、Prompt、ADR、恢复演练；`scripts/check_handoff.py` 通过 |
| 业务功能 FR-001 至 FR-011 | NOT_STARTED | 没有用户、受试者、量表、建议或研究数据 API；见 `TASKS.md` |
| 真实数据/临床上线 | BLOCKED | Q-01 至 Q-13 待相应负责人签核；见 `OPEN_QUESTIONS.md` |

## 最近实测结果

- Windows 本地：`uv run ruff check .` → all checks passed；`uv run pytest` → 2 passed（上游 TestClient 弃用警告 1 条）。
- Windows 本地：`pnpm lint`、`pnpm typecheck`、`pnpm test` → 2 passed、`pnpm build` → 成功。
- `docker compose --env-file .env.example -f infra/compose.yaml config --quiet` → 成功；`up --build -d` → 前后端镜像构建、服务启动成功。
- 空的本地合成数据库：Alembic `upgrade head`、`current`、`downgrade base`、再 `upgrade head` → 成功；`SELECT version_num FROM alembic_version` → `0001_baseline`。
- 容器冒烟：`GET /health` → `{"status":"ok"}`，`GET /ready` → `{"status":"ready"}`，前端首页 HTTP 200 且显示 API 正常。
- `uv run --no-project python scripts/check_handoff.py` → 13 个 Task ID、仓库内 Markdown 链接检查通过（最终文档更新后复跑）。

Docker Desktop 在首次迁移后短暂重启，第一次容器 HTTP 复核失败；重启服务后复核通过。远端 CI、生产部署、真实数据和业务流程均未运行。

## 当前阻断与下一步

Sprint 0 无剩余工程阻断。`S1-01` 是下一可执行任务：登录/会话、服务器端 RBAC 与研究分配；在开始前阅读 [HANDOFF](HANDOFF.md)，不要自动开始 Sprint 1。临床问题保持 [OPEN_QUESTIONS](OPEN_QUESTIONS.md) 的未决状态。
