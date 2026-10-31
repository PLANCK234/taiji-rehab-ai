# 当前交接检查点

> 新 Agent 先运行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline`，核对本文件、任务台账和实际代码。HEAD 是本文件所在提交，哈希不能自写入同一提交。

| 项目 | 当前值 |
|---|---|
| Branch / HEAD | `feat/eng-04a-postgres-contract`；HEAD = 包含本文件的本地检查点提交（运行 `git rev-parse HEAD`）；起始干净检查点 `e5d7a5865a0c6354c57ce857046da347e1aa75d3` |
| 最近完成任务 | `ENG-04A` 临时 PostgreSQL 核心 API/迁移/契约门禁；此前 `S6-02` 浏览器合成页、`S2-01` 人工总分子范围。ENG-04 父任务仍进行中 |
| 本次改动 | 开发负责人授权后在 TASKS 登记 ENG-01 至 ENG-04 及非临床子任务；新增独立 PostgreSQL API 测试、OpenAPI 快照比较、临时 tmpfs 测试脚本、CI 隔离数据库迁移序列与 ENG ID 交接校验；更新测试策略、追踪、恢复演练与交接。没有业务/临床规则改动 |
| 已通过验证 | 后端 Ruff、普通 pytest 24 passed/1 opt-in skipped；临时 PostgreSQL 17 升→check→降→升与真实 API 测试 1 passed；OpenAPI 快照在 pytest 中相等；交接脚本、Git diff/状态见 STATUS |
| 失败或未运行 | 起初直接 `python` 命令在本机缺失，改用 `uv run --no-project python`；无最终检查失败。pytest 有 Starlette TestClient 上游弃用警告 1 条。前端检查、完整浏览器业务 E2E、远端 CI、真实数据/临床人工验收本任务未运行 |
| 已知问题 | Q-01/10 真实影像伦理、同意、权限、留存未签核；Q-02 未批准分项 SOP；Q-03/09 未批准适配规则和发布责任人，`S3-01` 继续 `BLOCKED`。无候选分级、训练、周期、导出或临床建议 |
| 尚未完成 | ENG-01 完整 Demo、ENG-02 研究可视化、ENG-03 离线框架、ENG-04 前端/全链路 E2E 与新会话恢复；S1 完整 CRUD/真实流程、AT-01 CSV/周期、AT-02 分级、AT-14 真实数据准入、远端 PR/CI。原合成数据库卷未操作 |
| 下一任务 | `ENG-01A`，依赖 S1-02/S2-01/ENG-04A 均已满足：建立可重放的纯合成建档、同意/筛查、人工基线及复评夹具。`S3-01` 继续等待 Q-03/09 有权人员的版本化签核 |
| 需阅读 | `AGENTS.md`, `docs/ROADMAP.md`, `docs/TASKS.md`, `docs/product/PRD.md`, `docs/product/ACCEPTANCE.md`, `docs/OPEN_QUESTIONS.md`, `docs/research/DATASET_SPEC.md`, `docs/testing/TEST_STRATEGY.md`, `docs/api/API_CONTRACT.md`, `docs/security/SECURITY.md`, `backend/AGENTS.md`, `backend/app/seed_demo.py`, `backend/app/assessment_api.py` |
| 下一任务验收 | `ENG-01A`：在迁移后的隔离合成库中可重复建立编码对象、模拟同意/筛查、人工基线与复评；覆盖缺失和追加历史、幂等或安全重跑；不生成候选等级、疗效标签或临床建议；运行实际数据库和 API 测试 |
| 未提交修改 / 本地依赖 | 检查点提交时预计工作区干净，若不同以 `git status` 为准。本机无全局 `python`，可用 `uv run --no-project python`；PostgreSQL 检查由唯一命名 tmpfs 容器执行，停止后无持久数据。前端需 Node 26/pnpm 10 容器 |

ENG-04A 的限定范围与证据见 [STATUS.md](STATUS.md)、[TRACEABILITY.md](TRACEABILITY.md) 与 [测试策略](testing/TEST_STRATEGY.md)。S6-01/02 的页面线条人物和浏览器模拟 API 不代表真实拍照、识别质量或临床判定。恢复核对见 [RECOVERY_TEST.md](testing/RECOVERY_TEST.md)。
