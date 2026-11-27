# 当前交接检查点

更新时间：2026-11-26。先执行 `git status --short --branch`、`git log -3 --oneline`，再对照 [STATUS](STATUS.md) 与 [TASKS](TASKS.md)。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | `feat/sppb-measure-v1`，基线为 PR #10 合并 main `5ea8c44`；以 `git log -1` 为准。 |
| 最近独立任务 | DEMO-V2-62/63 DONE：PR #10 已合并；独立后端坐站候选测量及 CLI。见 [测量验证](testing/SPPB_MEASURE_VALIDATION.md)与 [合并证据](testing/PR10-MERGE-VALIDATION.md)。 |
| 验证 | 本轮后端 Ruff、110 passed/6 opt-in skipped（含15项测量）；A0 Docker 浏览器20项及清理成功。前端/迁移沿用 PR #10 基线，本算法任务未改动它们。 |
| 当前缺口 | 小程序未建工程（需 Bearer 鉴权）；AI 无量表评分/阶段（Q-14/Q-15）；v3 指标无人体视频精度验证；实体手机未测；正式教学视频发布仍 BLOCKED。 |
| 临床与数据阻断 | S3-01 BLOCKED（Q-03/Q-09）；真实数据、影像、部署审批均未记录；Research 默认拒绝。 |
| 下一 Task ID | `DEMO-V2-64`：持久化候选测量及逐项人工复核；新迁移从0024开始。评分配置及草稿闭环另行登记；`DEMO-V2-60` 保留小程序/Bearer任务。 |
| 下一步文件 | `backend/app/sppb_measure.py` 为纯算法；后续新增独立测量/复核 schema、API、models、0024迁移及授权/幂等/追加版本测试。不得改写旧 v3 报告。 |
| 未提交/推送 | 以实际 `git status` 为准；不删除数据库卷。已有库（main 链，至 0019）升级前先备份，再 `alembic upgrade head`（新增 0020–0023：姿态表、v2/v3、逐项修正、更正原因放宽），然后重跑 `python -m app.seed_demo_actions` 更新动作要领。 |

历史检查点见 [SESSION_LOG](SESSION_LOG.md)、[STATUS_HISTORY](archive/STATUS_HISTORY.md) 与团队 main 的 [HANDOFF 历史](archive/HANDOFF_HISTORY_MAIN.md)。
