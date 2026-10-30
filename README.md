# 太极拳康复分级评估与科研数据平台

[![Status](https://img.shields.io/badge/status-sprint--1-yellow)](#项目状态)

**Researcher-facing Tai Chi Rehabilitation Assessment & Research Platform.**

> 当前仓库包含 Sprint 0 工程骨架、Sprint 1 合成账号授权与编号对象建档、模拟同意及三态筛查。不包含真实数据接入或临床判定功能。

## 目标
医疗人员对研究对象建档、安全筛查、录入 SPPB 等客观评估，获取可解释的功能分级候选及太极训练适配建议并人工复核；每次训练后收集结构化反馈；周期末冻结数据并对照 V0 规则离线优化，审批通过的新版本才可发布。

## 不做什么
不提供患者端、实时动作纠错、自动诊断、自动调整临床处方或在线自学习；姿态照片模块当前仅为明确标注“识别算法未接入”的演示能力。

## 技术方案
| 层 | 选型 |
|---|---|
| 前端 | Next.js、React、TypeScript |
| 后端 | FastAPI、Pydantic、SQLAlchemy、Alembic |
| 数据库 | PostgreSQL |
| 分析 | 后续阶段离线实现；Sprint 0 仅保留 `ml/` 约束 |
| 部署 | Docker Compose 本地开发；生产 TLS/私有存储待审批 |

## 本地启动（合成数据）

需要 Docker Desktop / Docker Engine 与 Compose。首次复制 `.env.example` 为 `.env`，将 `SESSION_SECRET` 和 `DEMO_PASSWORD` 改为仅用于本机的随机值（后者至少 12 字符），不要提交 `.env`。PowerShell：

```powershell
Copy-Item .env.example .env
docker compose -f infra/compose.yaml config --quiet
docker compose -f infra/compose.yaml up --build -d
docker compose -f infra/compose.yaml run --rm backend uv run --no-dev alembic upgrade head
docker compose -f infra/compose.yaml run --rm backend uv run --no-dev python -m app.seed_demo
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/ready
Start-Process http://localhost:3000/login
```

演示账号：`demo-clinician-a@example.org`、`demo-clinician-b@example.org`、`demo-analyst@example.org`，密码为本机 `.env` 的 `DEMO_PASSWORD`。种子脚本仅在 `APP_ENV=local` 且 `ALLOW_SYNTHETIC_ONLY=true` 时执行；再次运行须使用同一密码。若丢失本地演示密码，在 `.env` 写入新密码，并临时设置 `RESET_DEMO_PASSWORD=true` 后运行同一种子命令；脚本会撤销旧会话并追加审计。运行后删除该临时设置。它只创建虚构研究编号、编码对象和权限分配。

登录后从工作台选择已分配研究，创建 `SYN-` 编号对象；进入对象页追加模拟同意记录，再填写合成项目代码和 `yes`/`no`/`unknown` 三态筛查。无当前模拟同意时筛查写入关闭；所有筛查结果都保持“待复核”，绝不表示安全或入组资格。当前模拟同意下可创建基线/复评草稿，仅由工作人员录入 SPPB 人工总分、缺失或无效状态，按权限确认并查看追加版本。零分与缺失分开显示；不自动计算分项、等级或训练建议。照片、真实身份和导出均未开放。

迁移回退只在**空的临时合成测试数据库**操作：`docker compose -f infra/compose.yaml run --rm backend uv run --no-dev alembic downgrade 0002_auth_scope` 会删除 S1-02 的同意、筛查和幂等记录表；进一步退至 `0001_baseline` 会删除认证表。已创建记录后不要直接执行；需先有获批准的备份及回退计划。停止服务用 `docker compose -f infra/compose.yaml down`，保留数据库卷；不要对有研究数据的环境执行卷删除。数据库只在 Compose 私网，宿主机不公开 5432。

不使用容器时，需要 Node.js 26、pnpm 10、Python 3.12–3.14 与 uv；数据库仍可用 Compose 启动：

```powershell
docker compose -f infra/compose.yaml up -d db
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend dev
cd backend
uv sync --frozen
# DATABASE_URL 需指向可达的本地 PostgreSQL；Compose 数据库未映射宿主机端口
uv run uvicorn app.main:app --reload
```

前后端质量检查：`pnpm --dir frontend lint`、`typecheck`、`test`、`build`；在 `backend/` 执行 `uv run ruff check .` 和 `uv run pytest`。交接检查：`uv run --no-project python scripts/check_handoff.py`。准确执行结果见 [STATUS](docs/STATUS.md)。研究对象仅有合成编码、模拟记录和人工总分草稿/历史，无姓名、联系方式、临床分级或导出功能。

## 研究安全边界
- 数据是敏感研究数据；真实患者数据只进入获批准的环境。
- SPPB 分级规则仅作为 V0 可解释候选：10–12 Ⅰ，7–9 Ⅱ，4–6 Ⅲ，0–3 Ⅳ；缺失/不安全无法自动分级。
- 训练反馈是模型特征而非疗效真值；周期末客观测量和经审核的标签才可用于指定预测任务。
- AI 只提供候选，所有变更由授权医疗人员确认；保留完整审计链。

## 开发协作
- 每次 PR 写明需求编号、迁移影响、测试证据、隐私与安全影响。
- 新的医学规则或研究用途先更新文档并获批准，不得由 Codex 猜测。
- 当前项目状态与接续入口见 [`docs/STATUS.md`](docs/STATUS.md) 和 [`docs/HANDOFF.md`](docs/HANDOFF.md)。

## 参考与来源
- 输入依据：用户提供的 PRD V0.9、剪枝版 PRD V1.1、技术实现路径 V1.1（2026-10-30）。
- Codex 官方说明：https://learn.chatgpt.com/docs/agent-configuration/agents-md
- 本仓库所有新增工程约定均是**建议方案**，不是医院已批准的研究协议。
