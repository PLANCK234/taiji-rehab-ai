# 当前交接检查点

更新时间：2026-11-26。先执行 `git status --short --branch`、`git log -3 --oneline`，再对照 [STATUS](STATUS.md) 与 [TASKS](TASKS.md)。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | `feat/sppb-measure-v1`，基线为 PR #10 合并 main `5ea8c44`；以 `git log -1` 为准。 |
| 最近独立任务 | DEMO-V2-67 DONE：记录CKLL-20260904及用户授权，新增[临床AI待开发计划](product/CLINICAL_AI_DEVELOPMENT_BACKLOG.md)及68–71；[验收](testing/CLINICAL_SCOPE_VALIDATION.md)。公开副本遮盖电话，原件保留；64/65应用功能保持。 |
| 验证 | 本轮仅文档/证据：PDF原件/副本哈希、页面视觉、文档链接及diff检查；应用125/8skip、PG9、前端141、浏览器25为上一检查点，本轮未重跑。 |
| 当前缺口 | 小程序未建工程（需 Bearer 鉴权）；AI 无量表评分/阶段（Q-14/Q-15）；v3 指标无人体视频精度验证；实体手机未测；正式教学视频发布仍 BLOCKED。 |
| 临床与数据阻断 | 研究伦理及临床AI开发授权已记录，S3-01改为待实施；具体参数待专家调参，不阻断配置框架。真实数据接入和部署仍是未交付工程范围，运行开关本轮不变。 |
| 下一 Task ID | `DEMO-V2-68`：临床分级/剂量/禁忌参数注册、版本及专家调参；随后69自动方案、70回归、71评测。66的3D对照保留，不是68前置。 |
| 下一步文件 | `backend/app/`临床参数schema及版本存储、`frontend/`专家编辑、`ml/`seed/参数契约；按[待开发计划](product/CLINICAL_AI_DEVELOPMENT_BACKLOG.md)先登记最小实施范围与验收。 |
| 未提交/推送 | 67范围更新提交`8e30bf8`已推送，[PR #11](https://github.com/PLANCK234/taiji-rehab-ai/pull/11)已更新并转为可审核（open，非draft），尚未合并；用户原始PDF含电话，保留本地未跟踪，公开副本已入PR。最终HEAD以git log为准；本轮无数据库改动。 |

历史检查点见 [SESSION_LOG](SESSION_LOG.md)、[STATUS_HISTORY](archive/STATUS_HISTORY.md) 与团队 main 的 [HANDOFF 历史](archive/HANDOFF_HISTORY_MAIN.md)。
