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
| S7-01 | 7 | 冻结数据离线评估与发布门禁 | P1 | Sprint 5；Q-06/09 | 未分配 | NOT_STARTED | `ml/`, `backend/` | AT-10/11；审批与泄漏测试 | — |
| S8-01 | 8 | 试点加固与部署演练 | P1 | 审批与前序阶段 | 未分配 | NOT_STARTED | `infra/`, `docs/` | AT-13/14；恢复与临床 UAT | — |

下一可执行任务由 [HANDOFF.md](HANDOFF.md) 指定；开始前核对 Git 与真实代码。
