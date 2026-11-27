# 当前交接检查点

更新时间：2026-11-26。先执行 `git status --short --branch`、`git log -3 --oneline`，再对照 [STATUS](STATUS.md) 与 [TASKS](TASKS.md)。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | `feat/sppb-measure-v1`，基线为 PR #10 合并 main `5ea8c44`；以 `git log -1` 为准。 |
| 最近独立任务 | DEMO-V2-62 DONE：五项 CI、Docker 20 项浏览器验收后合并 PR #10。见 [证据](testing/PR10-MERGE-VALIDATION.md)。 |
| 验证 | 见 [STATUS](STATUS.md)“最近验证”（合并后重跑）。 |
| 当前缺口 | 小程序未建工程（需 Bearer 鉴权）；AI 无量表评分/阶段（Q-14/Q-15）；v3 指标无人体视频精度验证；实体手机未测；正式教学视频发布仍 BLOCKED。 |
| 临床与数据阻断 | S3-01 BLOCKED（Q-03/Q-09）；真实数据、影像、部署审批均未记录；Research 默认拒绝。 |
| 下一 Task ID | `DEMO-V2-63`：独立后端坐站测量算法；`DEMO-V2-60` 保留小程序/Bearer 任务。 |
| 下一步文件 | `backend/app/sppb_measure.py`、`backend/tests/test_sppb_measure.py`、测量验证文档。 |
| 未提交/推送 | 以实际 `git status` 为准；不删除数据库卷。已有库（main 链，至 0019）升级前先备份，再 `alembic upgrade head`（新增 0020–0023：姿态表、v2/v3、逐项修正、更正原因放宽），然后重跑 `python -m app.seed_demo_actions` 更新动作要领。 |

历史检查点见 [SESSION_LOG](SESSION_LOG.md)、[STATUS_HISTORY](archive/STATUS_HISTORY.md) 与团队 main 的 [HANDOFF 历史](archive/HANDOFF_HISTORY_MAIN.md)。
