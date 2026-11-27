# 太极拳康复分级评估与科研数据平台

[![Status](https://img.shields.io/badge/status-synthetic--demo-yellow)](docs/STATUS.md)

面向**医疗研究人员**的 Web 工作台：编码建档 → 人工 SPPB 评估 → 版本化 Demo 分级 → 太极动作方案与训练 → 训练反馈 → AI 视频动作分析与人工复核。所有数据由 FastAPI 写入 PostgreSQL，可追溯、可导出。

> 当前只用于**合成数据演示**。Demo 分级与动作组合（`DEMO_ONLY`）不是临床处方；真实患者数据需另行完成伦理、同意、安全与部署审批。

## 功能一览

| 功能 | 说明 |
|---|---|
| 一步建档 | 填编号 →（勾选模拟同意）→（填 SPPB）即自动生成 Demo 分级与训练方案 |
| 人工评估 | 草稿 / 确认 / 追加更正，零分、缺失、无效严格区分 |
| 太极训练 | 12 个动作（含要领与步骤），按等级自动组合；开始/暂停/继续/结束/反馈，刷新可恢复 |
| AI 动作分析 | 浏览器本地 MediaPipe 识别 33 关键点（原视频不上传）；后端 `pose-geometry-v3` 计算关节角度、躯干倾斜、骨盆重心移动、左右差；工作人员可逐项修正复核 |
| 数据导出 | 单对象编号化 CSV，不含身份与自由文本，附 SHA-256 |

## 快速启动

需要 Docker Desktop。复制 `.env.example` 为 `.env`，把 `SESSION_SECRET`（≥32 字符）和 `DEMO_PASSWORD`（≥12 字符）改成本机随机值。

```powershell
Copy-Item .env.example .env
docker compose --env-file .env -f infra/compose.yaml up --build -d
docker compose --env-file .env -f infra/compose.yaml run --rm backend uv run --no-dev alembic upgrade head
docker compose --env-file .env -f infra/compose.yaml run --rm backend uv run --no-dev python -m app.seed_demo
docker compose --env-file .env -f infra/compose.yaml run --rm backend uv run --no-dev python -m app.seed_demo_actions
Start-Process http://localhost:3000
```

演示账号（密码为 `.env` 中的 `DEMO_PASSWORD`，登录页可一键填入邮箱）：
`demo-clinician-a@example.org`、`demo-clinician-b@example.org`、`demo-analyst@example.org`。

- 已有数据库：先备份，再执行 `alembic upgrade head`（当前头 `0011`）；重跑 `seed_demo_actions` 会更新动作要领文本。不要删除数据卷。
- 忘记演示密码：在 `.env` 写新密码并临时设置 `RESET_DEMO_PASSWORD=true` 后重跑 `seed_demo`。
- 可选复评夹具：`python -m app.seed_reassessment_demo`。

不用容器时需要 Node.js 26、pnpm 10、Python 3.12+ 与 uv：`pnpm --dir frontend install && pnpm --dir frontend dev`；`cd backend && uv sync && uv run uvicorn app.main:app --reload`（`DATABASE_URL` 指向可达的 PostgreSQL）。AI 模型资源首次需 `pnpm --dir frontend prepare:pose`。

## 质量检查

```powershell
cd backend; uv run ruff check .; uv run pytest            # 后端
pnpm --dir frontend lint; pnpm --dir frontend typecheck; pnpm --dir frontend test
uv run --no-project python scripts/run_eng04_integration.py   # 临时 PostgreSQL 迁移门禁
uv run --no-project python scripts/run_pose_browser.py        # 真实模型 + 浏览器 E2E
uv run --no-project python scripts/check_handoff.py           # 文档与交接检查
```

浏览器 E2E 用本机 Chrome 时设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`；只跑部分用例设置 `E2E_SPECS="demo-v2.real.ts"`。

## 目录

```text
frontend/   Next.js + TypeScript
  app/          页面（App Router）
  components/   AppShell、Card、Badge、FlowSteps 等 UI 组件
  lib/          API 客户端（api.ts 统一读写/CSRF/幂等）、标签与格式化
  workers/      MediaPipe 姿态推理 Worker
backend/    FastAPI + SQLAlchemy + Alembic（app/、alembic/versions/、tests/）
ml/         离线合成数据质量与对象级切分
infra/      Docker Compose（Demo；Research 模板默认关闭）
scripts/    集成/浏览器测试运行器、交接检查
docs/       产品、架构、API、数据、安全、测试、ADR、交接
```

## 文档入口

[当前状态](docs/STATUS.md) · [交接](docs/HANDOFF.md) · [文档索引](docs/README.md) · [设计系统](docs/product/DESIGN_SYSTEM.md) · [小程序方案](docs/product/MINIPROGRAM_PLAN.md) · [ADR](docs/decisions/README.md)

## 研究边界（不变）

- 系统没有真实身份字段；编号必须以 `SYN-` 开头。
- 权限、对象范围、CSRF 与审计全部在服务器端执行。
- 缺失的评估或反馈永远是“未知”，不是 0、正常或安全。
- AI 只提供观察指标与候选，人工复核另存版本；新的医学规则需先经授权人员批准。
