# 当前交接检查点

更新时间：2026-11-26。先执行 `git status --short --branch`、`git log -3 --oneline`，再对照 [STATUS](STATUS.md) 与 [TASKS](TASKS.md)。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | `feat/ux-refresh`，基于 `feat/real-01f0-coded-export` 的 `5875d96`（DEMO-V2-17 逐项修正检查点）。以 `git log -1` 为准；未推送/合并。 |
| 最近独立任务 | DEMO-V2-17/18/19 DONE：逐项修正、界面重设计与摩擦清理、pose-geometry-v3。见 [ADR-0018](decisions/0018-usable-demo-and-pose-v3.md)。 |
| 验证 | 后端 ruff + 77 passed/6 skip；PostgreSQL 门禁 7 passed（含 0011 升降升）；前端 lint/typecheck/28 tests；真实浏览器 12 passed。 |
| 当前缺口 | 小程序未建工程（需 Bearer 鉴权）；AI 无量表评分/阶段（Q-14/Q-15）；v3 指标无人体视频精度验证；实体手机未测。 |
| 临床与数据阻断 | S3-01 BLOCKED（Q-03/Q-09）；真实数据、影像、部署审批均未记录；Research 默认拒绝。 |
| 下一 Task ID | `DEMO-V2-20`：先实现 Bearer token 鉴权（ADR + 测试），再按 [小程序方案](product/MINIPROGRAM_PLAN.md) 建 `miniprogram/`。并行可做 `DEMO-V2-11` 实体手机验证。 |
| 下一步文件 | `backend/app/api.py`（current_auth/require_csrf）、`backend/app/security.py`、[设计系统](product/DESIGN_SYSTEM.md)、`frontend/lib/api.ts`。 |
| 未提交/推送 | 以实际 `git status` 为准；不推送/合并 main、不删除数据库卷。已有库升级前先备份再 `alembic upgrade head`，然后重跑 `python -m app.seed_demo_actions` 更新动作要领。 |

历史检查点见 [SESSION_LOG](SESSION_LOG.md) 与 [STATUS_HISTORY](archive/STATUS_HISTORY.md)。
