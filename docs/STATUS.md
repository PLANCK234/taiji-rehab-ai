# 实施状态

更新：2026-10-30；当前阶段：Sprint 1 `IN_PROGRESS`，S1-01 本地完成。本仓库只可用于合成数据开发；临床、伦理、真实数据和生产部署均未获本仓库文件证明批准。

| 范围 | 状态 | 证据与限制 |
|---|---|---|
| Sprint 0 前后端骨架 | DONE | Next.js 构建、lint/typecheck、Vitest 2 tests；FastAPI Ruff、pytest 2 tests；容器 HTTP 冒烟 200 |
| PostgreSQL / Alembic / Compose | DONE | PostgreSQL 17 健康；空库 `upgrade head → current → downgrade base → upgrade head` 成功；`/ready` 返回 ready；Compose config 成功 |
| CI 配置 | DONE | `.github/workflows/ci.yaml` 已配置；同等本地命令已执行。GitHub Actions 远端运行尚未发生，待 PR 验证 |
| 持久交接 | DONE | 任务台账、HANDOFF、追加日志、Prompt、ADR、恢复演练；`scripts/check_handoff.py` 通过 |
| S1-01 身份和编码只读授权 | DONE | Argon2 员工登录、持久会话、CSRF 注销、限流、研究及对象双重分配、审计；本地测试与容器烟测通过 |
| FR-002 至 FR-011 业务功能 | NOT_STARTED | 无建档、同意、量表、建议、导出或研究数据 API；AT-05 导出部分未实现；见 `TASKS.md` |
| 真实数据/临床上线 | BLOCKED | Q-01 至 Q-13 待相应负责人签核；见 `OPEN_QUESTIONS.md` |

## 最近实测结果

- S1 Windows 本地：`uv run ruff check .`、`uv run pytest -q` → 14 passed；`pnpm lint/typecheck/test/build` → 4 passed、构建成功。
- S1 PostgreSQL：`0002_auth_scope` 升→降至 `0001_baseline`→再升成功；`alembic check` → No new upgrade operations detected；最终版本 `0002_auth_scope`。
- S1 容器：登录 200（2 个 Cookie）、工作台 200、已授权对象 200、同研究未分配对象 403、CSRF 注销 204；审计包含登录/读取/拒绝/注销。未知账号失败 5 次 401，随后 429；未登录工作台 307 到 `/login`。
- S1 合成密码恢复：本地显式重置后重新登录 200，数据库新增 3 条 `demo_password_reset` 审计；单测验证旧会话撤销。
- S1 不包含导出端点；AT-05 的未授权导出测试仍待 S5-01。GitHub Actions 远端尚未运行。

### Sprint 0 检查点（历史）

- Windows 本地：`uv run ruff check .` → all checks passed；`uv run pytest` → 2 passed（上游 TestClient 弃用警告 1 条）。
- Windows 本地：`pnpm lint`、`pnpm typecheck`、`pnpm test` → 2 passed、`pnpm build` → 成功。
- `docker compose --env-file .env.example -f infra/compose.yaml config --quiet` → 成功；`up --build -d` → 前后端镜像构建、服务启动成功。
- 空的本地合成数据库：Alembic `upgrade head`、`current`、`downgrade base`、再 `upgrade head` → 成功；`SELECT version_num FROM alembic_version` → `0001_baseline`。
- 容器冒烟：`GET /health` → `{"status":"ok"}`，`GET /ready` → `{"status":"ready"}`，前端首页 HTTP 200 且显示 API 正常。
- `uv run --no-project python scripts/check_handoff.py` → 13 个 Task ID、仓库内 Markdown 链接检查通过（最终文档更新后复跑）。

当时 Docker Desktop 在首次迁移后短暂重启，第一次容器 HTTP 复核失败；重启服务后复核通过。Sprint 0 检查点尚无认证业务流程；远端 CI、生产部署与真实数据至今未运行。

## 当前阻断与下一步

`S1-02` 是下一任务：只在 Q-01/Q-07 的合成数据回退边界内实现编码对象建档、同意与筛查；真实身份映射和照片继续关闭。Sprint 1 尚未完成。临床问题保持 [OPEN_QUESTIONS](OPEN_QUESTIONS.md) 的未决状态。
