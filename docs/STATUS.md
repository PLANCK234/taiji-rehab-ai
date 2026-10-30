# 实施状态

更新：2026-10-30；当前阶段：Sprint 2 合成手工评估范围 `IN_PROGRESS`，S2-01 本地完成；Sprint 1 完整受试者 CRUD、真实同意和获批准筛查流程仍未完成。本仓库只可用于合成数据开发；临床、伦理、真实数据和生产部署均未获本仓库文件证明批准。

| 范围 | 状态 | 证据与限制 |
|---|---|---|
| Sprint 0 前后端骨架 | DONE | Next.js 构建、lint/typecheck、Vitest 2 tests；FastAPI Ruff、pytest 2 tests；容器 HTTP 冒烟 200 |
| PostgreSQL / Alembic / Compose | DONE | PostgreSQL 17 健康；空库 `upgrade head → current → downgrade base → upgrade head` 成功；`/ready` 返回 ready；Compose config 成功 |
| CI 配置 | DONE | `.github/workflows/ci.yaml` 已配置；同等本地命令已执行。GitHub Actions 远端运行尚未发生，待 PR 验证 |
| 持久交接 | DONE | 任务台账、HANDOFF、追加日志、Prompt、ADR、恢复演练；`scripts/check_handoff.py` 通过 |
| S1-01 身份和编码只读授权 | DONE | Argon2 员工登录、持久会话、CSRF 注销、限流、研究及对象双重分配、审计；本地测试与容器烟测通过 |
| S1-02 合成建档/模拟同意/筛查 | DONE | `SYN-` 编号创建与列表、追加式同意/三态筛查、当前同意门禁、未知/待复核状态、权限和审计；本地测试、PostgreSQL 及页面烟测通过 |
| S2-01 合成人工 SPPB 总分评估 | DONE | 基线/复评草稿、有效/缺失/无效总分、追加历史、更正理由与临床角色确认；权限、模拟同意、CSRF、幂等、审计；本地单测、迁移、PostgreSQL 和页面烟测通过。FR-003/AT-01/02 仅录入部分 |
| FR-004 至 FR-011 后续业务功能 | NOT_STARTED | 无分级、建议、训练、周期或导出 API；AT-01 导出与 AT-02 分级边界未实现；见 `TASKS.md` |
| 真实数据/临床上线 | BLOCKED | Q-01 至 Q-13 待相应负责人签核；见 `OPEN_QUESTIONS.md` |

## 最近实测结果

- S2-01 Windows 后端：`uv run ruff check .` → All checks passed；`uv run pytest -q` → 22 passed，Starlette TestClient 上游弃用警告 1 条；`uv run python -m app.export_openapi` 已生成新快照。
- S2-01 Node 26.13 / pnpm 10 容器：`pnpm lint`、`pnpm typecheck`、`pnpm test` → 11 passed；`pnpm build` 成功，动态路由包含 `/assessments/[id]`。本机仍无 pnpm。
- S2-01 独立临时 PostgreSQL 17 `taiji_migration` 空库：`upgrade head → alembic check → downgrade 0003_synthetic_intake → upgrade head → current` 全通过，最终 `0004_manual_assessments`；回退只在空库执行。另一临时库的 API 烟测：无模拟同意和未分配对象写入均 403；创建与同键重放 201 且同 ID；有效零分草稿 200、确认 200；新 TestClient 中读取持久历史 `[3,2,1]`，审计 9 条。Next 开发容器代理：登录 200、对象页 200、复评创建 201、缺失草稿 200、确认 200，评估页 200 显示“缺失（拒测）”与历史版本。临时服务结束后停止，测试数据不随 Git 保存。
- S2-01 首次 Next 烟测脚本受环境 SOCKS 代理影响，设置 `trust_env=False` 直连；后一次文本断言忽略 React 数字节点注释后通过。该脚本没有成为仓库测试套件，实际接口和页面响应已复核。远端 CI、Playwright 浏览器套件与真实数据准入门禁仍未运行。
- S1-02 Windows 后端：`uv run ruff check .` → All checks passed；`uv run pytest -q` → 18 passed，Starlette TestClient 上游弃用警告 1 条；`uv run python -m app.export_openapi` 已生成新快照。
- S1-02 Node 26.13 / pnpm 10.34 容器：`pnpm lint`、`pnpm typecheck`、`pnpm test` → 7 passed、`pnpm build` 成功。本机无 pnpm；首次非交互容器安装因清理旧模块被拒，设置 `CI=true` 后完成。
- S1-02 临时空 PostgreSQL 17：`upgrade head → alembic check → downgrade 0002_auth_scope → upgrade head → current` 全通过，最终 `0003_synthetic_intake`。独立临时库经 tmpfs 容器停止后丢弃，没有对原合成卷回退。
- S1-02 PostgreSQL API：登录 200；跨研究创建及未分配对象读取 403；合成对象创建 201；无同意筛查 403、模拟同意 201、筛查 201 并显示 `needs_review`；照片路由 404；审计 8 条。最终独立临时库复测创建/同键重放 201 且 ID 相同、同键异请求 409、同意和筛查 201。前端 Next 开发容器通过代理登录 200、工作台 200、对象页 200；有筛查显示“待复核”，无记录显示“未评估”且筛查表单关闭。临时服务已停止。
- `docker compose --env-file .env.example -f infra/compose.yaml config --quiet` 通过；远端 GitHub Actions、Playwright、真实数据准入人工门禁未运行。
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

S2-01 的合成人工总分路径已完成；Q-02 未决时不能自动计算 SPPB 分项。`S3-01` 按任务依赖暂为 `BLOCKED`：Q-03 适配模板/禁忌/剂量及 Q-09 审批/发布权限未签核，不能实现已批准规则和建议发布。下一可执行 Task ID 为 `S6-01` 的**纯合成本地拍照预览演示壳**：只做本地预览和“算法尚未接入”提示，不持久上传，不用真实图片；AT-12 的真实授权/留存部分仍待 Q-01/10。S1 完整 CRUD、真实同意/身份/照片、AT-14 人工准入及 AT-01 导出仍未完成。临床问题保持 [OPEN_QUESTIONS](OPEN_QUESTIONS.md) 的未决状态。
