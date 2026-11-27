# 当前交接检查点

更新时间：2026-11-26。先执行 `git status --short --branch`、`git log -3 --oneline`，再对照 [STATUS](STATUS.md) 与 [TASKS](TASKS.md)。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | `feat/ux-refresh`：AI 姿态分支 + 界面重设计，已合入团队 main `7ad8d64`，PR 目标 main。以 `git log -1` 为准。 |
| 最近独立任务 | DEMO-V2-57/58/59 DONE：逐项修正、界面重设计与摩擦清理、pose-geometry-v3（原记 17/18/19）。见 [ADR-0025](decisions/0025-usable-demo-and-pose-v3.md)。 |
| 验证 | 见 [STATUS](STATUS.md)“最近验证”（合并后重跑）。 |
| 当前缺口 | 小程序未建工程（需 Bearer 鉴权）；AI 无量表评分/阶段（Q-14/Q-15）；v3 指标无人体视频精度验证；实体手机未测；正式教学视频发布仍 BLOCKED。 |
| 临床与数据阻断 | S3-01 BLOCKED（Q-03/Q-09）；真实数据、影像、部署审批均未记录；Research 默认拒绝。 |
| 下一 Task ID | `DEMO-V2-60`：先实现 Bearer token 鉴权（ADR + 测试），再按 [小程序方案](product/MINIPROGRAM_PLAN.md) 建 `miniprogram/`。并行可做 `DEMO-V2-51` 实体手机验证。 |
| 下一步文件 | `backend/app/api.py`（current_auth/require_csrf）、`backend/app/security.py`、[设计系统](product/DESIGN_SYSTEM.md)、`frontend/lib/api.ts`。 |
| 未提交/推送 | 以实际 `git status` 为准；不删除数据库卷。已有库（main 链，至 0019）升级前先备份，再 `alembic upgrade head`（新增 0020–0023：姿态表、v2/v3、逐项修正、更正原因放宽），然后重跑 `python -m app.seed_demo_actions` 更新动作要领。 |

历史检查点见 [SESSION_LOG](SESSION_LOG.md)、[STATUS_HISTORY](archive/STATUS_HISTORY.md) 与团队 main 的 [HANDOFF 历史](archive/HANDOFF_HISTORY_MAIN.md)。
