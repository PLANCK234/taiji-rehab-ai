# 当前交接检查点

> 新 Agent 先运行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline`，核对本文件、任务台账与实际代码。HEAD 是本文件所在提交，其完整哈希不能自写入同一提交。

| 项目 | 当前值 |
|---|---|
| Branch / HEAD | `feat/s2-01-manual-assessments`；HEAD = 包含本文件的本地检查点提交（运行 `git rev-parse HEAD`）；上一检查点 `0ed1df1fb37608bc39fb51b45d89914977b4e4ed` |
| 最近完成任务 | `S2-01`：仅合成编号对象的人工 SPPB 总分基线/复评草稿、确认、更正、缺失/无效与历史；Sprint 2 合成范围仍 `IN_PROGRESS`，完整量表与临床流程未实现 |
| 本次改动 | `backend/app/assessment.py`、`assessment_api.py`、模型/模式、`0004_manual_assessments` 迁移、OpenAPI、测试；`frontend/app/assessments/[id]/` 详情与录入、对象页评估列表和创建表单、客户端测试；API、数据、产品、验收、安全、测试文档与 ADR-0007 |
| 已通过验证 | 后端 Ruff/pytest 22；前端 Node 26/pnpm 10 容器 lint/typecheck/test 11/build；临时空 PostgreSQL 17 迁移升降升与 Alembic check；另一临时库权限/同意/幂等/零分/确认/重启持久化 API 烟测；Next 代理对象页/复评缺失记录页面烟测；Compose config 与交接脚本结果见 STATUS |
| 失败或未运行 | 首次 Next 烟测因机器 SOCKS 代理缺 `socksio`，`trust_env=False` 后直连；一次 HTML 文本断言因 React 数字节点注释调整后通过。远端 GitHub Actions、Playwright 浏览器套件、真实数据准入均未运行；Starlette TestClient 上游弃用警告 1 条。本机无 pnpm，前端检查用容器 |
| 已知问题 | Q-02 SOP 未决，不能自动计算分项；Q-03/09 未签核，`S3-01` 的已批准规则、适配建议和发布门禁阻断。模拟同意不是真实签署；Q-01/07/10 及其他临床/伦理问题未关闭。没有分级、安全、处方、照片上传、身份映射或导出 |
| 尚未完成 | S1 完整受试者 CRUD/真实流程；FR-003 多量表和 AT-01 导出、AT-02 分级边界；远端 PR/CI、真实研究使用。临时 PostgreSQL tmpfs 容器和开发服务应在交接前停止；原合成数据库卷未操作 |
| 下一任务 | `S6-01`：任务台账中依赖已满足的纯合成演示路径。仅本地/合成姿态照片预览壳，明确“算法尚未接入”，不持久上传或处理真实对象照片。`S3-01` 保持 `BLOCKED` 直到 Q-03/09 获授权签核 |
| 需阅读 | `AGENTS.md`, `docs/ROADMAP.md`, `docs/product/PRD.md`, `docs/product/ACCEPTANCE.md`, `docs/OPEN_QUESTIONS.md`, `docs/security/SECURITY.md`, `docs/api/API_CONTRACT.md`, `docs/data/DATA_MODEL.md`, `docs/decisions/0007-synthetic-manual-total-revisions.md`, `backend/AGENTS.md`, `frontend/AGENTS.md`；S6-01 无独立 Sprint prompt，以任务台账与上述设计为准 |
| 下一任务验收 | AT-12：页面直示“算法尚未接入”；当前无真实摄像/图片授权时不得永久上传。验证合成/本地预览、无上传端点、权限/同意边界与 UI 检查；不得声称真实图片准入已批准 |
| 未提交修改 / 本地依赖 | 检查点提交时预计工作区干净；若实际不同以 `git status` 为准。`.pnpm-store` 不随 Git，同等前端检查可用 Node 26/pnpm 10 容器；临时数据库及密码不随 Git |

S2-01 证据见 [STATUS.md](STATUS.md)、[TRACEABILITY.md](TRACEABILITY.md)、[ADR-0007](decisions/0007-synthetic-manual-total-revisions.md) 与 [迁移](../backend/alembic/versions/0004_manual_assessments.py)。人工总分的“确认”只是工作人员确认记录，不代表临床分级、受试者安全或研究批准。恢复核对见 [RECOVERY_TEST.md](testing/RECOVERY_TEST.md)。
