# 当前交接检查点

> 新 Agent 先运行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline`，核对本文件、任务台账和实际代码。HEAD 是本文件所在提交，哈希不能自写入同一提交。

| 项目 | 当前值 |
|---|---|
| Branch / HEAD | `feat/eng-01a-synthetic-reassessment`；HEAD = 包含本文件的本地检查点提交（运行 `git rev-parse HEAD`）；上一干净检查点 `2357fe7`（ENG-04A） |
| 最近完成任务 | `ENG-01A` 可重放合成复评夹具与 `ENG-04A` 临时 PostgreSQL/API 门禁。ENG-01/04 父任务仍进行中 |
| 本次改动 | 新增可选 `app.seed_reassessment_demo`，依托基础合成种子创建两名编号对象的模拟同意、未知/未记录筛查、人工基线/复评、缺失和追加更正；重跑核验且不覆盖偏离记录。增加 SQLite/真实 PostgreSQL API 测试与本地运行说明，更新状态和追踪。无公开 API、迁移或临床规则变更 |
| 已通过验证 | 后端 Ruff、普通 pytest 25 passed/2 opt-in skipped；临时 PostgreSQL 17 升→check→降→升及 3 passed；交接脚本和 Git 检查见 STATUS。种子重复运行不增加记录，修改既有夹具后拒绝覆盖 |
| 失败或未运行 | 本任务无最终检查失败；pytest 有 Starlette TestClient 上游弃用警告 1 条。前端检查、完整浏览器业务 E2E、远端 CI、真实数据/临床人工验收未运行 |
| 已知问题 | Q-01/10 真实影像伦理、同意、权限、留存未签核；Q-02 未批准分项 SOP；Q-03/09 未批准适配规则和发布责任人，`S3-01` 继续 `BLOCKED`。无候选分级、训练、周期、导出或临床建议 |
| 尚未完成 | ENG-01 候选/训练反馈/周期/导出、ENG-02 研究可视化、ENG-03 离线框架、ENG-04 前端/全链路 E2E 与新会话恢复；S1 完整 CRUD/真实流程、AT-01 CSV/周期、AT-02 分级、AT-14 真实数据准入、远端 PR/CI。原合成数据库卷未操作 |
| 下一任务 | `ENG-02A`，依赖 S1-02/S2-01/ENG-04A 均已满足：从真实数据库合成记录做按对象授权的已确认 SPPB 总分趋势及缺失视图。`S3-01` 继续等待 Q-03/09 有权人员的版本化签核 |
| 需阅读 | `AGENTS.md`, `docs/ROADMAP.md`, `docs/TASKS.md`, `docs/product/PRD.md`, `docs/product/ACCEPTANCE.md`, `docs/OPEN_QUESTIONS.md`, `docs/data/DATA_MODEL.md`, `docs/api/API_CONTRACT.md`, `docs/security/SECURITY.md`, `backend/AGENTS.md`, `frontend/AGENTS.md`, `backend/app/assessment_api.py`, `backend/app/seed_reassessment_demo.py`, `frontend/app/participants/[id]/page.tsx` |
| 下一任务验收 | `ENG-02A`：只读、按研究/对象授权，从已确认数据库版本展示基线/复评总分序列及缺失情况；草稿、缺失、无效分别呈现，缺失不当零；运行数据库/API/页面测试，不推断疗效 |
| 未提交修改 / 本地依赖 | 检查点提交时预计工作区干净，若不同以 `git status` 为准。本机无全局 `python`，可用 `uv run --no-project python`；PostgreSQL 检查由唯一命名 tmpfs 容器执行，停止后无持久数据。前端需 Node 26/pnpm 10 容器 |

ENG-01A/ENG-04A 的限定范围与证据见 [STATUS.md](STATUS.md)、[TRACEABILITY.md](TRACEABILITY.md) 与 [测试策略](testing/TEST_STRATEGY.md)。S6-01/02 的页面线条人物和浏览器模拟 API 不代表真实拍照、识别质量或临床判定。恢复核对见 [RECOVERY_TEST.md](testing/RECOVERY_TEST.md)。
