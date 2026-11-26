# 当前交接检查点

更新时间：2026-11-26（America/Chicago）。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 分支 `feat/real-01f0-coded-export`；任务15开始HEAD `f5b58d8`、工作区干净。本轮本地检查点具体SHA以git log -1核对；不推送/合并。 |
| 最近独立任务 | `DEMO-V2-15` DONE：v2原始/平滑曲线、残差噪声、固定200ms文件采样、保存响应丢失/详情读取失败恢复、旧报告兼容。11/13/14仍仅已记工程子范围，未完成临床评分。 |
| 验证 | Ruff、后端59 passed/6 skipped；独立PostgreSQL迁移/check/升降升与7场景（含带旧数据升级/危险回退拒绝）；前端lint/typecheck/25 tests/build；真实Chrome模型/数据库/故障恢复/旧Demo训练9 passed(39.6s)。证据exports/pose-browser-34c0eb4513/browser/，截图已看；共享卷未操作，测试服务已停止。 |
| 当前缺口 | 量表仍仅人工SPPB总分；AI没有动作规范评分、SPPB自动总分、康复阶段或计划关联。静态合成素材不能证明连续太极/老年人群精度，静态模型抖动约0.69–3.28°。Q-14评分表与Q-15阶段/模板待输入；实体手机/遮挡/辅具/连续片段待验。Next构建提示现有版本有安全漏洞，依赖升级未做；见STATUS。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED：Q-03 训练适配模板/禁忌/剂量和 Q-09 发布责任权限缺签核。Q-01/07/08/10 等真实数据/影像/保留/部署条件也未批准。仅用合成数据；Research 默认拒绝。 |
| 下一 Task ID | `DEMO-V2-11`剩余：实体手机安全上下文/帧率/摄像权限，合成连续动作、多角度/遮挡/辅助场景及噪声/重复性验证；补任务12的评分表接口前先核对Q-14，不编造临床分。`REAL-01E0`仍未开始。 |
| 下一步文件 | [验证目标](testing/AI_POSE_VALIDATION.md)、[ADR-0017](decisions/0017-pose-signal-and-retry.md)、[API](api/API_CONTRACT.md)、[字典](data/DATA_DICTIONARY.md)，pose/capture/曲线代码与模型锁。当前迁移头0009，已有卷升级前备份；有v2数据时禁止强行降级。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
