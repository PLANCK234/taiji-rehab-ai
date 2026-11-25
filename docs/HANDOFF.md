# 当前交接检查点

更新时间：2026-11-25 北京时间。实际 Git 状态优先于文档。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | `feat/patient-four-step-shell`；基于 main `8a7b4e7`（ENG-05 PR #7 已合并）；四步/视频检查点 `3de2925` 已保存；摄像头检查点 `6e1eb81` 已保存；反馈检查点 `3a51059` 已保存；播放器检查点 `499dd7e` 已保存；第五个检查点为 `b758f69`，五个功能检查点已推送并创建 [PR #9](https://github.com/PLANCK234/taiji-rehab-ai/pull/9)，未合并。 |
| 最近独立任务 | `DEMO-V2-43` 未保存反馈离开保护；[证据](testing/DEMO-V2-43-UNSAVED-FEEDBACK.md)。 |
| 验证 | 本次lint/typecheck、111项前端测试、构建及19项隔离Chromium通过（含取消刷新/退出保留草稿）；摄像头和教学片的先前证据保留。用户已截图并确认取消退出后登录和输入均保留；目标手机仍待测。 |
| 当前缺口 | 四步只供浏览，不产生任务或训练状态；已有独立本机教学试播；已有主动本机摄像头预览；未接正式审核视频发布/算法/疲劳疼痛字段/任务关联。反馈沿用本人独立事实记录。刷新不保留草稿。 |
| 临床与数据阻断 | S3-01、真实影像/真实患者及临床发布批准不变；团队已提供自录教学片，仅供本机试播，未完整人工审核音画，不伪造已审核。 |
| 下一 Task ID | `DEMO-V2-16` 正式非指导性流程发布仍 BLOCKED（新增教学片不满足原契约）；接续 B-01 前与 A/C 组对齐任务/素材/摄像头接口，再登记细分任务。 |
| 下一步文件 | `frontend/app/patient/journey.tsx`、`report-form.tsx`、[产品基线](product/PRD.md)、[视频契约](product/SYNTHETIC_VIDEO_REVIEW_CONTRACT.md)。 |
| 未提交/推送 | 五个功能检查点已推送 `origin/feat/patient-four-step-shell` 并创建 [PR #9](https://github.com/PLANCK234/taiji-rehab-ai/pull/9)；本次另补充交接链接，远端CI结果以GitHub为准。未合并main，无媒体/密码/数据库上传。 |

本机新版项目已保留原 `infra_pgdata` 并升级到 `0015_demo_patient_card_selection`，旧评估训练反馈核对一致；数据库升级属前一项本机运行准备，不属于本次前端代码变更。自动备份任务已指向新版项目，仍每24小时/失败5分钟重试。

历史任务、临床阻断和研究任务状态保留在 [STATUS](STATUS.md)、[TASKS](TASKS.md) 与 [SESSION_LOG](SESSION_LOG.md)。
