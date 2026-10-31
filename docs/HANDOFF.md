# 当前交接检查点

> 新 Agent 先运行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline`，核对本文件、任务台账和实际代码。HEAD 是本文件所在提交，哈希不能自写入同一提交。

| 项目 | 当前值 |
|---|---|
| Branch / HEAD | `feat/eng-02a-assessment-trends`；HEAD = 包含本文件的本地检查点提交（运行 `git rev-parse HEAD`）；上一干净检查点 `888d2488c2e12bb47fa58367d256356b87bc2d84`（ENG-01A） |
| 最近完成任务 | `ENG-02A` 合成人工总分对象级趋势；此前 `ENG-01A` 合成复评夹具和 `ENG-04A` 临时数据库门禁。ENG-01/02/04 父任务仍进行中 |
| 本次改动 | 新增按角色/研究/对象授权且审计的只读趋势 API；返回每项评估的最新版本与最新已确认版本。对象详情页用文字、表格及 0–12 图示展示已确认有效总分，草稿、缺失和无效分开；补 API/页面/真实数据库测试、全栈烟测脚本、OpenAPI、设计与交接。无迁移或临床规则变更 |
| 已通过验证 | 后端 Ruff、pytest 27 passed/2 opt-in skipped；临时 PostgreSQL 迁移与 API 3 passed；前端 Node 26/pnpm 10 lint/typecheck/test 15/build；临时 PostgreSQL→FastAPI→Next 页面总分/缺失及跨研究 404 烟测。最终交接/提交检查见 STATUS |
| 失败或未运行 | 首次 Ruff 有 1 处过长行，修复后通过；最终检查无失败。pytest 有 Starlette TestClient 上游弃用警告 1 条。远端 CI、真实数据/临床人工验收未运行 |
| 已知问题 | Q-01/10 真实影像伦理、同意、权限、留存未签核；Q-02 未批准分项 SOP；Q-03/09 未批准适配规则和发布责任人，`S3-01` 继续 `BLOCKED`。无候选分级、训练、周期、导出或临床建议 |
| 尚未完成 | ENG-01 候选/训练反馈/周期/导出；ENG-02 完成率/RPE/周期与研究级汇总；ENG-03 离线框架；ENG-04 完整业务浏览器 E2E 与新会话恢复。S1 完整 CRUD/真实流程、AT-01 CSV/周期、AT-02 分级、AT-14 真实数据准入、远端 PR/CI。原合成数据库卷未操作 |
| 下一任务 | `ENG-03A`，依赖 S1-02/S2-01 已满足：用纯合成数据建立可复现的离线质量报告与对象级 train/val/test 划分，不定义真实疗效标签。`S3-01` 继续等待 Q-03/09 有权人员的版本化签核 |
| 需阅读 | `AGENTS.md`, `docs/ROADMAP.md`, `docs/TASKS.md`, `docs/product/PRD.md`, `docs/product/ACCEPTANCE.md`, `docs/OPEN_QUESTIONS.md`, `docs/research/DATASET_SPEC.md`, `docs/ml/MODEL_LIFECYCLE.md`, `docs/data/DATA_DICTIONARY.md`, `docs/testing/TEST_STRATEGY.md`, `ml/AGENTS.md`, `backend/app/seed_reassessment_demo.py`, `backend/app/models.py` |
| 下一任务验收 | `ENG-03A`：固定合成种子生成可重复的离线数据集；报告缺失与重复、阻止同一对象跨 train/val/test；不凭训练反馈定义疗效标签、不改 SPPB 官方规则；运行实际数据质量和泄漏测试 |
| 未提交修改 / 本地依赖 | 检查点提交时预计工作区干净，若不同以 `git status` 为准。本机无全局 `python`，可用 `uv run --no-project python`；PostgreSQL 检查由唯一命名 tmpfs 容器执行，停止后无持久数据。前端需 Node 26/pnpm 10 容器 |

ENG-02A 的限定范围与证据见 [STATUS.md](STATUS.md)、[TRACEABILITY.md](TRACEABILITY.md)、[ADR-0009](decisions/0009-synthetic-confirmed-trend.md) 与 [测试策略](testing/TEST_STRATEGY.md)。页面只展示合成对象的人工总分记录，不代表真实临床结局。恢复核对见 [RECOVERY_TEST.md](testing/RECOVERY_TEST.md)。
