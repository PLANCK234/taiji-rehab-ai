# 当前交接检查点

更新时间：2026-11-01 北京时间。先执行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline` 并核对 [TASKS](TASKS.md)、[STATUS](STATUS.md) 与实际代码。不要把本文件中的预期分支名当作 Git 事实。

| 项目 | 当前状态 |
|---|---|
| Branch / HEAD | 当前分支 `feat/real-01f0-coded-export`；DEMO-V2-08 开始 HEAD `037c60a`，完成检查点以 `git log -1` 为准。本次未推送或合并 main。 |
| 最近独立任务 | `DEMO-V2-08`：修复本地 Demo 在 `127.0.0.1:3000` 登录时的 Origin 403；仅允许同端口的两个回环地址，见 [STATUS](STATUS.md)。七步演示 `DEMO-V2-00..07` 保持完成，旧 REAL/ENG/S 状态不变。 |
| 验证 | 本机真实登录 API：127/localhost 两来源均 200，外部来源 403；后端 Ruff、pytest 43 passed/4 skipped；真实 PostgreSQL→FastAPI→Next→Chromium 8 passed，含新增 127 登录及旧 localhost/越权场景。`APP_PUBLIC_URL=http://localhost:3000`，本机仅重建 backend，无迁移；既有合成卷 head `0007`，原 4 对象和 12 动作保留。上次完整前端 lint/typecheck/21 tests/build 与临时 PostgreSQL 5 API 结果见 STATUS；本轮 Next build 在 Chromium runner 实际通过。 |
| 当前缺口 | DEMO-V2 动作仅文字/占位示意，无临床审核、获批剂量或真实影像；完成动作可选记录但无单独更正入口。REAL-01A/B/C 仍只有合成子集；E 周期/快照、F 完整研究级导出未完成。 |
| 临床与数据阻断 | S3-01 继续 BLOCKED：Q-03 训练适配模板/禁忌/剂量和 Q-09 发布责任权限缺签核。Q-01/07/08/10 等真实数据/影像/保留/部署条件也未批准。仅用合成数据；Research 默认拒绝。 |
| 下一 Task ID | `REAL-01E0`：手工研究周期容器与人工复评/训练观察显式关联；不自动安排访视、不定义结局或临床规则。若继续 DEMO-V2 优化，先补实际完成动作的更正入口及独立使用测验。 |
| 下一步文件 | [PRD](product/PRD.md)、[Demo 流程](product/DEMO_USER_FLOW.md)、[验收](product/ACCEPTANCE.md)、[数据模型](data/DATA_MODEL.md)、[API](api/API_CONTRACT.md)、[安全](security/SECURITY.md)、[测试策略](testing/TEST_STRATEGY.md)；先检查嵌套 AGENTS 和实际 Git 状态。 |
| 未提交/推送 | 以实际 `git status` 为准；不操作其他开发者修改、不推送/合并 main、不删除原有卷。 |

交接恢复：本文件是最新检查点，历史记录见 [SESSION_LOG](SESSION_LOG.md)。新任务完成后更新本表、[STATUS](STATUS.md)、[TASKS](TASKS.md)、[TRACEABILITY](TRACEABILITY.md)，运行实测门禁并保留可恢复 Git 检查点。
