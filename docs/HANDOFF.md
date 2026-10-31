# 当前交接检查点

> 新 Agent 先运行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline`，核对本文件、任务台账和实际代码。HEAD 是本文件所在提交，哈希不能自写入同一提交。

| 项目 | 当前值 |
|---|---|
| Branch / HEAD | `feat/eng-03a-synthetic-offline-dataset`；HEAD = 包含本文件的本地检查点提交（运行 `git rev-parse HEAD`）；上一干净检查点 `e8eaca1ebdc354e117c7681b3585197de4679a3d`（ENG-02A） |
| 最近完成任务 | `ENG-03A` 纯合成离线质量与对象级切分；此前 `ENG-02A` 趋势、`ENG-01A` 合成复评和 `ENG-04A` 数据库门禁。ENG-01/02/03/04 父任务仍进行中 |
| 本次改动 | 新增独立锁定的 `ml/` 项目、固定合成记录生成器、缺失/重复质量检查、对象级 train/validation/test 划分、哈希清单与拒绝覆盖逻辑；补单测、CI 作业、研究规格、ADR-0010 与交接。只生成虚构数据，不连接业务库、训练模型或定义疗效标签；无迁移或临床规则变更 |
| 已通过验证 | 起始 ENG-02A 定向后端 3 passed/1 opt-in skipped；ML 锁定依赖、Ruff、pytest 4 passed；CLI 36 条记录两次输出相同 SHA-256 `c446f04f23ff0453a28a1426716288f34f5cb3e889ded875f7cfcd4d11e5bd96`；后端回归 Ruff/pytest 27 passed/2 opt-in skipped、交接 23 ID 与 diff 检查。详见 STATUS |
| 失败或未运行 | 首次 ML Ruff 格式错误，修复后通过。远端 CI、真实数据库数据提取、模型评估、真实数据/临床人工验收未运行 |
| 已知问题 | Q-01/10 真实影像伦理、同意、权限、留存未签核；Q-02 未批准分项 SOP；Q-03/09 未批准适配规则和发布责任人，`S3-01` 继续 `BLOCKED`。无候选分级、训练、周期、导出或临床建议 |
| 尚未完成 | ENG-01 候选/训练反馈/周期/导出；ENG-02 完成率/RPE/周期与研究级汇总；ENG-03 V0/候选评估、真实快照和时点特征；ENG-04 完整业务浏览器 E2E 与新会话恢复。S1 完整 CRUD/真实流程、AT-01 CSV/周期、AT-02 分级、AT-14 真实数据准入、远端 PR/CI。原合成数据库卷未操作 |
| 下一任务 | `ENG-04B`，依赖 S1-02/S2-01/ENG-01A/ENG-02A/ENG-04A 已满足：用临时 PostgreSQL 与实际 API/Next 做已有合成业务浏览器 E2E。`S3-01` 继续等待 Q-03/09 有权人员的版本化签核 |
| 需阅读 | `AGENTS.md`, `docs/ROADMAP.md`, `docs/TASKS.md`, `docs/product/PRD.md`, `docs/product/ACCEPTANCE.md`, `docs/OPEN_QUESTIONS.md`, `docs/testing/TEST_STRATEGY.md`, `frontend/AGENTS.md`, `frontend/e2e/`, `frontend/playwright.config.ts`, `backend/app/seed_reassessment_demo.py`, `scripts/run_eng02a_smoke.py`, `scripts/run_eng04_integration.py` |
| 下一任务验收 | `ENG-04B`：临时真实 PostgreSQL、实际 FastAPI/Next 与浏览器覆盖合成登录、建档、模拟同意、人工评估/确认、缺失复评/趋势和越权拒绝；测试结束清理临时服务，不更改临床流程 |
| 未提交修改 / 本地依赖 | 检查点提交时预计工作区干净，若不同以 `git status` 为准。本机无全局 `python`，可用 `uv run --no-project python`；ML 在 `ml/` 使用自己的 `uv.lock`。合成 CLI 输出在 Git 忽略的 `exports/eng03a-demo`，不是研究快照；不触碰原数据库卷。前端需 Node 26/pnpm 10 容器 |

ENG-03A 的限定范围与证据见 [STATUS.md](STATUS.md)、[TRACEABILITY.md](TRACEABILITY.md)、[ADR-0010](decisions/0010-synthetic-offline-split.md) 与 [测试策略](testing/TEST_STRATEGY.md)。离线记录全部为合成演示，无获批准的结局或模型。恢复核对见 [RECOVERY_TEST.md](testing/RECOVERY_TEST.md)。
