# 当前交接检查点

更新时间：2026-11-25 北京时间。实际 Git 状态优先于文档。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | `feat/patient-four-step-shell`；基于 main `8a7b4e7`（ENG-05 PR #7 已合并）；四步/视频检查点 `3de2925` 已保存；DEMO-V2-40已保存第二个本地检查点（具体提交号见 `git log -1`），未推送。 |
| 最近独立任务 | `DEMO-V2-40` 本机摄像头准备；[证据与实机步骤](testing/DEMO-V2-40-CAMERA-PREVIEW.md)。 |
| 验证 | 最新lint/typecheck、89项前端测试、构建、18项隔离Chromium回归、2项fake-camera浏览器专项通过。用户已报告电脑画面、切步关闭和返回不自动开启正常；目标手机待测。 |
| 当前缺口 | 四步只供浏览，不产生任务或训练状态；已有独立本机教学试播；已有主动本机摄像头预览；未接正式审核视频发布/算法/疲劳疼痛字段/任务关联。反馈沿用本人独立事实记录。刷新不保留草稿。 |
| 临床与数据阻断 | S3-01、真实影像/真实患者及临床发布批准不变；团队已提供自录教学片，仅供本机试播，未完整人工审核音画，不伪造已审核。 |
| 下一 Task ID | `DEMO-V2-16` 正式非指导性流程发布仍 BLOCKED（新增教学片不满足原契约）；接续 B-01 前与 A/C 组对齐任务/素材/摄像头接口，再登记细分任务。 |
| 下一步文件 | `frontend/app/patient/journey.tsx`、`report-form.tsx`、[产品基线](product/PRD.md)、[视频契约](product/SYNTHETIC_VIDEO_REVIEW_CONTRACT.md)。 |
| 未提交/推送 | 四步及视频检查点为3de2925；摄像头前端、测试及文档已纳入第二个本地检查点，未推送。未创建PR，无数据库/媒体变更。 |

本机新版项目已保留原 `infra_pgdata` 并升级到 `0015_demo_patient_card_selection`，旧评估训练反馈核对一致；数据库升级属前一项本机运行准备，不属于本次前端代码变更。自动备份任务已指向新版项目，仍每24小时/失败5分钟重试。

历史任务、临床阻断和研究任务状态保留在 [STATUS](STATUS.md)、[TASKS](TASKS.md) 与 [SESSION_LOG](SESSION_LOG.md)。
