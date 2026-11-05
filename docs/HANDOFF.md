# 当前交接检查点

更新时间：2026-11-05 北京时间。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 当前分支 `codex/demo-light-video-slot`，从 `main` 的 `1fdd767` 建立；本次检查点提交以实际 `git log -1` 为准。未推送或合并 main。 |
| 最近独立任务 | `DEMO-V2-10`：用户确认双端平台方向，患者端第一版只查看医护确认计划/审核视频、记录训练与不适；本次仅更新产品规范和任务。此前临时链接是合成 Demo，不是患者入口。 |
| 验证 | 本次仅文档与任务拆分，`scripts/check_handoff.py` 通过（49 Task ID、链接完整），`git diff --check` 通过；未运行代码测试。此前后端 pytest 43 passed/4 opt-in skipped、前端 lint/typecheck/23 tests/build 与业务浏览器链路属于旧检查点，本次未重跑。 |
| 当前缺口 | 当前代码没有患者账号、本人绑定、患者页面或医护发布计划；无已审核视频素材。临时域名仅为合成 Demo，不能给真实患者使用。临时域名依赖本机/Docker/隧道，不保证长期可用；有效账号外网登录尚未验收。REAL-01A/B/C 仍只有合成子集；E 周期/快照、F 完整研究级导出未完成。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED：Q-03 训练适配模板/禁忌/剂量和 Q-09 发布责任权限缺签核。Q-01/07/08/10 等真实数据/影像/保留/部署条件也未批准。仅用合成数据；Research 默认拒绝。 |
| 下一 Task ID | `DEMO-V2-11`：仅合成患者账号、本人绑定与独立入口（AT-PAT-01）；服务端权限和撤销测试先行。原工作人员研究路线的下一项仍是 `REAL-01E0`。 |
| 下一步文件 | [PRD](product/PRD.md)、[Demo 流程](product/DEMO_USER_FLOW.md)、[验收](product/ACCEPTANCE.md)、[数据模型](data/DATA_MODEL.md)、[API](api/API_CONTRACT.md)、[安全](security/SECURITY.md)、[测试策略](testing/TEST_STRATEGY.md)；先检查嵌套 AGENTS 和实际 Git 状态。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
