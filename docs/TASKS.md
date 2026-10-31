# 任务台账

状态仅使用 `NOT_STARTED`、`IN_PROGRESS`、`BLOCKED`、`IN_REVIEW`、`DONE`。`DONE` 必须附实际验证证据。临床与真实数据功能受 [待决问题](OPEN_QUESTIONS.md) 约束。

| Task ID | Sprint | 目标 | 优先级 | 依赖 | 负责人/分支 | 状态 | 预计修改范围 | 验收与测试 | 完成证据 |
|---|---:|---|---|---|---|---|---|---|---|
| S0-01 | 0 | 工程骨架、版本锁定和本地命令 | P0 | 文档基线 | `feat/s0-bootstrap-handoff` | DONE | `frontend/`, `backend/`, 根配置 | 前端构建/检查、后端 lint/pytest | 2026-10-30：前端 lint/typecheck/test 2/build；后端 Ruff/pytest 2；见 STATUS |
| S0-02 | 0 | PostgreSQL、Alembic、Compose、合成种子 | P0 | S0-01 | `feat/s0-bootstrap-handoff` | DONE | `backend/`, `infra/`, `.env.example`, `database/seed/` | 迁移升降级、DB 就绪、Compose config | 2026-10-30：Compose 构建/启动、Postgres 17 健康、迁移升降升、ready 200；合成 fixture 为未来业务测试编号，尚无业务表可入库 |
| S0-03 | 0 | 基础 CI 与复现说明 | P0 | S0-01/02 | `feat/s0-bootstrap-handoff` | DONE | `.github/`, `README.md` | CI 同等本地命令 | 2026-10-30：本地同等检查通过；远端 Actions 待 PR 触发 |
| S0-04 | 0 | 持久交接协议和恢复检查 | P0 | 文档基线 | `feat/s0-bootstrap-handoff` | DONE | `AGENTS.md`, `docs/`, `scripts/` | 交接脚本与新会话恢复问题 | 2026-10-30：check_handoff 通过；恢复问题见 testing/RECOVERY_TEST.md |
| S1-01 | 1 | 登录、会话、RBAC、研究分配与编码对象只读权限 | P0 | Sprint 0 | `feat/s1-01-auth-scope` | DONE | `frontend/`, `backend/`, migration | FR-001；AT-05 读取/角色部分；跨研究与跨对象 403、审计、CSRF/限流、迁移测试 | 2026-10-30：后端 14 tests、前端 4 tests、容器登录/越权/注销与演示密码重置、迁移升降升、Alembic check；导出部分待 S5-01 |
| S1-02 | 1 | 合成对象建档、同意和筛查 | P0 | S1-01；Q-01/07 的合成数据回退边界 | `feat/s1-02-synthetic-intake` | DONE | `frontend/`, `backend/`, migration | FR-002, AT-03/14 合成部分；缺项与同意测试；真实身份/照片关闭 | 2026-10-30：后端 Ruff/pytest 18、前端 Node 容器 lint/typecheck/test 7/build；PostgreSQL 迁移升降升/check、授权/同意/筛查烟测；前端代理页面 200/状态复核。AT-14 真实数据准入待人工签核 |
| S2-01 | 2 | 评估录入、缺失与历史版本 | P0 | S1-01/02；Q-02 未决时仅 PRD 明许的人工确认总分合成路径 | `feat/s2-01-manual-assessments` | DONE | `frontend/`, `backend/`, migration | FR-003, AT-01/02 录入部分；草稿与更正测试；无分项自动计分 | 2026-10-30：Ruff/pytest 22；Node 26/pnpm 10 lint/typecheck/test 11/build；临时 PostgreSQL 17 升降升/check、权限/同意/幂等与重启持久化、Next 代理页面烟测；详见 STATUS |
| S3-01 | 3 | 已批准规则候选和人工审核 | P0 | Sprint 2；Q-03/09 | 未分配 | BLOCKED | `backend/`, `frontend/`, `ml/` | FR-004/005, AT-02/04/10 | Q-03 适配模板/禁忌/剂量及 Q-09 审批/发布责任人未签核；不得发布临床规则或建议 |
| S4-01 | 4 | 训练会话、结构反馈和安全事件 | P0 | Sprint 3；Q-04/12 | 未分配 | NOT_STARTED | `backend/`, `frontend/`, migration | FR-006/007, AT-06/07/08 | — |
| S5-01 | 5 | 周期复评、冻结与去标识导出 | P0 | Sprint 4；Q-05/06/07 | 未分配 | NOT_STARTED | `backend/`, `frontend/`, migration | FR-008/009/011, AT-01/05 导出部分/09 | — |
| S6-01 | 6 | 可选拍照演示壳 | P1 | Q-01/10 或纯合成演示 | `feat/s6-01-synthetic-pose-demo` | DONE | `frontend/`, `backend/` | AT-12 合成部分；明确未接入识别；仅本地预览，不持久上传 | 2026-10-31 检查点：后端 Ruff/pytest 23（无图片 API）；前端 lint/typecheck/test 12/build、DOM 生成/清除；临时 PostgreSQL + Next HTTP 授权/未授权/跨研究及模拟照片范围烟测；浏览器手工 E2E 未运行，详见 STATUS |
| S6-02 | 6 | 合成姿态页浏览器验收 | P1 | S6-01；仅合成 API 夹具 | `feat/s6-02-synthetic-browser-e2e` | DONE | `frontend/e2e/`, 测试依赖/配置、文档 | AT-12 合成浏览器部分：未登录重定向、对象范围拒绝、明示未接入识别、生成/切换/清除，交互不采集或上传 | 2026-10-31：Playwright/Chromium 3 passed（本地合成 API 夹具）；前端 lint/typecheck/test 12/build、后端 Ruff/pytest 23；首轮选择器失败已修复，见 STATUS |
| S7-01 | 7 | 冻结数据离线评估与发布门禁 | P1 | Sprint 5；Q-06/09 | 未分配 | NOT_STARTED | `ml/`, `backend/` | AT-10/11；审批与泄漏测试 | — |
| S8-01 | 8 | 试点加固与部署演练 | P1 | 审批与前序阶段 | 未分配 | NOT_STARTED | `infra/`, `docs/` | AT-13/14；恢复与临床 UAT | — |

## 独立非临床工程任务（2026-10-31 开发负责人授权）

这些任务只使用合成数据；不解除 `S3-01` 对 Q-03/Q-09 的阻断，也不把演示标签、训练反馈或描述性变化解释为临床疗效。父任务的完整验收依赖其子任务及下游能力，子任务可独立检查点。

| Task ID | Sprint | 目标 | 优先级 | 依赖 | 负责人/分支 | 状态 | 预计修改范围 | 验收与测试 | 完成证据 |
|---|---:|---|---|---|---|---|---|---|---|
| ENG-01 | 工程 | 合成数据 Demo 全链路：建档、评估、候选状态、训练反馈、复评、导出 | P0 | S1-02/S2-01；ENG-04A；非临床会话/周期/导出子任务；临床候选分级仍受 S3-01/Q-03/09 阻断 | `feat/eng-01a-synthetic-reassessment` | IN_PROGRESS | `backend/`, `frontend/`, `database/seed/`, `docs/` | 仅合成对象端到端；未实现项按现有需求补齐并单独验收；任何训练适配建议仅明确标注为不生效的演示草稿；不能把缺失当零或生成临床处方 | ENG-01A 子范围完成；候选/训练/周期/导出未实现 |
| ENG-01A | 工程 | 可重放的合成建档至人工复评 Demo 夹具 | P0 | S1-02/S2-01；ENG-04A | `feat/eng-01a-synthetic-reassessment` | DONE | `backend/app/seed_reassessment_demo.py`, `backend/tests/`, `README.md`, `docs/` | 基于真实迁移库创建编码对象、同意/筛查、基线与复评；可重复、可隔离，展示缺失和历史；不生成候选等级 | 2026-10-31：普通 pytest 25 passed/2 opt-in skipped；临时 PostgreSQL 升降升和相关 3 passed；Ruff；见 STATUS |
| ENG-02 | 工程 | 研究工作台指标与周期趋势 | P0 | ENG-02A；训练完成率/RPE 依赖 ENG-01 的非临床会话记录；周期汇总依赖非临床周期数据 | `feat/eng-02a-assessment-trends` | IN_PROGRESS | `backend/`, `frontend/`, `docs/` | 按研究/对象服务端权限，从数据库记录展示功能指标、完成率、RPE、缺失及复评趋势；不硬编码科研结果 | ENG-02A 对象级人工总分子范围完成；完成率/RPE/周期未实现 |
| ENG-02A | 工程 | 已有人工 SPPB 记录的研究趋势与缺失视图 | P0 | S1-02/S2-01；ENG-04A | `feat/eng-02a-assessment-trends` | DONE | `backend/`, `frontend/`, tests, `scripts/`, `docs/` | 只读、按对象授权、从已确认数据库版本计算基线/复评序列；草稿和缺失分别呈现，缺失不当零；数据库/API/页面测试 | 2026-10-31：后端 Ruff/pytest 27 + 2 opt-in；临时 PostgreSQL 3 passed；前端 lint/typecheck/test 15/build；临时 PostgreSQL→API→Next 页面/跨研究烟测；见 STATUS |
| ENG-03 | 工程 | 离线数据质量、患者级隔离、V0 基线及候选评估框架 | P1 | ENG-03A；真实疗效标签/发布仍受 Q-06/09 和 S7-01 阻断 | 未分配 | NOT_STARTED | `ml/`, `docs/`, tests | 合成数据集可复现；同一对象不得跨 train/val/test；V0/候选评估有版本、泄漏检查及缺失报告；无已确认标签时仅描述分析或显著标注的合成演示标签；SPPB 官方标准不改 | — |
| ENG-03A | 工程 | 合成离线数据集、质量报告及对象级划分基础 | P1 | S1-02/S2-01 | 未分配 | NOT_STARTED | `ml/`, tests, `docs/` | 固定合成种子可重复；校验缺失/重复/跨对象泄漏；不推导临床疗效标签或阈值 | — |
| ENG-04 | 工程 | 自动化质量门禁与可恢复交接 | P0 | S1-02/S2-01/S6-02；完整业务 E2E 随 ENG-01/02 能力完成 | `feat/eng-04a-postgres-contract` | IN_PROGRESS | `backend/tests/`, `frontend/e2e/`, `.github/`, `scripts/`, `docs/` | 后端/前端、权限与隔离、迁移、API 契约、核心业务浏览器流程和新会话恢复均有可执行证据；每个子任务单独验证 | — |
| ENG-04A | 工程 | 临时 PostgreSQL 核心 API、迁移和契约门禁及 ENG ID 交接校验 | P0 | S1-02/S2-01/S6-02 | `feat/eng-04a-postgres-contract` | DONE | `backend/tests/`, `.github/workflows/`, `scripts/`, `docs/` | 临时数据库升降升/check；真实 PostgreSQL 合成建档、同意、筛查、人工基线/复评、缺失/历史和跨对象/角色拒绝；OpenAPI 快照一致；交接脚本接受 ENG Task ID；本地与 CI 可复现 | 2026-10-31：临时 tmpfs PostgreSQL 17 升→check→降→升与真实 API 测试通过；后端 Ruff/pytest 24 + 1 opt-in；交接校验通过；远端 CI 待 PR，详见 STATUS |

下一可执行任务由 [HANDOFF.md](HANDOFF.md) 指定；开始前核对 Git 与真实代码。
