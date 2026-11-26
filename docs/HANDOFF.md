# 当前交接检查点

更新时间：2026-11-26（America/Chicago）。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 分支 `feat/real-01f0-coded-export`；开始HEAD `80993bf418065fb9dd472c0a8ba9fa5ac2cb2963`。本轮09文档与10/11代码形成本地检查点，具体提交与剩余修改核对git log/status；未推送/合并。 |
| 最近独立任务 | `DEMO-V2-10` DONE；11已接入真实模型、视频/测试摄像、骨架/指标/数据库报告和观察复核。入口`/participants/{id}/ai-assessment`。11实体手机未验，13/14为子范围进行中，不宣称临床评分完成。 |
| 验证 | 后端Ruff、52 passed/5 skipped；独立tmpfs PostgreSQL迁移/check/升降升与6 API；前端lint/typecheck/21 tests/生产build；本机Chrome真实Worker模型+数据库+复核刷新及旧Demo/训练8 passed。含空画面、摄像拒绝、模型缺失、合成摄像流停止/释放。证据exports/pose-browser-23fa682926/browser/；原共享卷未迁移，测试服务已停止。 |
| 当前缺口 | 量表仍仅人工SPPB总分；AI没有动作规范评分、SPPB自动总分、康复阶段或计划关联。静态合成素材不能证明连续太极/老年人群精度，静态模型抖动约0.69–3.28°。Q-14评分表与Q-15阶段/模板待输入；实体手机/遮挡/辅具/连续片段待验。Next构建提示现有版本有安全漏洞，依赖升级未做；见STATUS。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED：Q-03 训练适配模板/禁忌/剂量和 Q-09 发布责任权限缺签核。Q-01/07/08/10 等真实数据/影像/保留/部署条件也未批准。仅用合成数据；Research 默认拒绝。 |
| 下一 Task ID | `DEMO-V2-11`剩余：实体手机安全上下文/帧率/摄像权限，合成连续动作、多角度/遮挡/辅助场景及噪声/重复性验证；补任务12的评分表接口前先核对Q-14，不编造临床分。`REAL-01E0`仍未开始。 |
| 下一步文件 | [验证目标](testing/AI_POSE_VALIDATION.md)、[ADR-0016](decisions/0016-local-pose-geometry-evidence.md)、[API](api/API_CONTRACT.md)、[字典](data/DATA_DICTIONARY.md)，实际pose代码/模型锁与相关AGENTS。模型资源准备运行frontend的prepare:pose；本地既有卷升级0008前需备份。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
