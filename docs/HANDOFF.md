# 当前交接检查点

更新时间：2026-11-26。先执行 `git status --short --branch`、`git log -3 --oneline`，再对照 [STATUS](STATUS.md) 与 [TASKS](TASKS.md)。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | `feat/sppb-measure-v1`，基线为 PR #10 合并 main `5ea8c44`；以 `git log -1` 为准。 |
| 最近独立任务 | DEMO-V2-64/65 DONE：0024及追加式计时复核接口已接AI网页；[接口](testing/SPPB_SERVICE_VALIDATION.md) / [网页](testing/SPPB_UI_VALIDATION.md)。 |
| 验证 | 后端Ruff、125 passed/8 opt-in skipped；临时PG9项含并发/迁移；前端141项/lint/typecheck/生产构建、全套真实浏览器25项通过；1366/390截图亲检。 |
| 当前缺口 | 小程序未建工程（需 Bearer 鉴权）；AI 无量表评分/阶段（Q-14/Q-15）；v3 指标无人体视频精度验证；实体手机未测；正式教学视频发布仍 BLOCKED。 |
| 临床与数据阻断 | S3-01 BLOCKED（Q-03/Q-09）；真实数据、影像、部署审批均未记录；Research 默认拒绝。 |
| 下一 Task ID | `DEMO-V2-66`：可选worldLandmarks/3D角度对照与2D兼容；SPPB评分配置及人工草稿仍后续独立登记；`DEMO-V2-60`保留小程序/Bearer任务。 |
| 下一步文件 | `frontend/workers/pose-worker.js`、`frontend/lib/pose.ts`、`backend/app/pose_schemas.py`及版本化3D分析；不改写现有2D/sppb-measure-v1结果，不把3D相对坐标当作地面四米标定。 |
| 未提交/推送 | 64功能提交`8ef9f03`、65功能提交`22f9891`均已推送并更新[草稿 PR #11](https://github.com/PLANCK234/taiji-rehab-ai/pull/11)标题/说明，尚未合并；最终HEAD与工作区以git log/status为准。0024仅在隔离测试库验证，共享数据库未升级。 |

历史检查点见 [SESSION_LOG](SESSION_LOG.md)、[STATUS_HISTORY](archive/STATUS_HISTORY.md) 与团队 main 的 [HANDOFF 历史](archive/HANDOFF_HISTORY_MAIN.md)。
