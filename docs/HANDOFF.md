# 当前交接检查点

更新时间：2026-11-05 北京时间。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 当前分支 `codex/demo-light-video-slot`，从 `main` 的 `1fdd767` 建立；本次检查点提交以实际 `git log -1` 为准。未推送或合并 main。 |
| 最近独立任务 | `DEMO-V2-08`：浅色界面与动作详情/训练页视频区域；尚无素材，页面明确待添加。此前 `DEMO-V2-00..07` 数据库演示及 REAL-01F0/REAL-01D0 状态保持不变。 |
| 验证 | 本次隔离 Docker 前端 lint/typecheck/23 tests/build 通过；本机前端容器仅重建前端，Dockerfile 设置 `HOSTNAME=0.0.0.0` 后本机直连和浏览器登录页 200、浅色视觉核对；后端/数据库未重建。宿主机不完整 node_modules 的 typecheck 失败不作通过证据。此前后端 42 passed/4 opt-in skipped、真实浏览器业务链路 7 passed 属旧检查点，本次未重跑。 |
| 当前缺口 | 尚无视频素材或实际视频播放验收；动作文字/示意内容仍未获临床审核。完成动作可选记录但无单独更正入口。REAL-01A/B/C 仍只有合成子集；E 周期/快照、F 完整研究级导出未完成。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED：Q-03 训练适配模板/禁忌/剂量和 Q-09 发布责任权限缺签核。Q-01/07/08/10 等真实数据/影像/保留/部署条件也未批准。仅用合成数据；Research 默认拒绝。 |
| 下一 Task ID | `REAL-01E0`：手工研究周期容器与人工复评/训练观察显式关联；不自动安排访视、不定义结局或临床规则。若继续 DEMO-V2 优化，先补实际完成动作的更正入口及独立使用测验。 |
| 下一步文件 | [PRD](product/PRD.md)、[Demo 流程](product/DEMO_USER_FLOW.md)、[验收](product/ACCEPTANCE.md)、[数据模型](data/DATA_MODEL.md)、[API](api/API_CONTRACT.md)、[安全](security/SECURITY.md)、[测试策略](testing/TEST_STRATEGY.md)；先检查嵌套 AGENTS 和实际 Git 状态。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
