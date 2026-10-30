# 当前交接检查点

> 新 Agent 请先运行 `git status --short --branch` 和 `git rev-parse HEAD`，核对本文件与实际代码。HEAD 是本交接文件所在提交；其哈希不能自写入同一提交。

| 项目 | 当前值 |
|---|---|
| Branch / HEAD | `feat/s1-01-auth-scope`；HEAD = 包含本文件的本地检查点提交（运行 `git rev-parse HEAD`）；上一检查点 `b472a04` |
| 最近完成任务 | S1-01：合成账号登录/会话、研究和编码对象只读授权；Sprint 1 仍 `IN_PROGRESS` |
| 本次改动 | `backend/app/` 用户/会话/权限/审计、合成种子与 OpenAPI；`backend/alembic/versions/0002_auth_scope.py`；后端测试；`frontend/app/login/`、`frontend/app/workspace/`、代理配置；Compose/CI、README 与相关 API/数据/安全文档 |
| 已通过验证 | 后端 Ruff/pytest 14；前端 lint/typecheck/test 4/build；PostgreSQL 迁移升降升、Alembic check；容器登录/授权/拒绝/注销/限流；合成密码显式重置并产生 3 条审计；交接检查 |
| 失败或未运行 | 首次 Alembic check 指出 ORM 索引缺失，修复后通过；首次本地脚本生成随机密码失败，修正脚本后种子和烟测成功；GitHub Actions 远端 CI、Playwright 未运行 |
| 已知问题 | Q-01/Q-07/Q-08 等审批未关闭；真实身份/照片/导出不可用。FastAPI TestClient 上游弃用警告 1 条 |
| 尚未完成 | S1-02 建档/同意/筛查及后续业务；AT-05 导出部分待 S5-01；远端 PR/CI；任何真实研究使用 |
| 下一任务 | `S1-02`：仅合成对象的建档、同意和三态筛查；按 Q-01/Q-07 回退边界继续关闭身份映射、真实患者和照片 |
| 需阅读 | `AGENTS.md`, `docs/ROADMAP.md`, `docs/product/PRD.md`, `docs/product/ACCEPTANCE.md`, `docs/research/PROTOCOL_INTERFACE.md`, `docs/data/DATA_MODEL.md`, `docs/data/DATA_DICTIONARY.md`, `docs/security/SECURITY.md`, `docs/api/API_CONTRACT.md`, `backend/AGENTS.md`, `frontend/AGENTS.md` |
| 下一任务验收 | FR-002 / AT-03/14：未筛查不得显示安全通过；无同意/照片授权不得上传；创建与读取均检查研究及对象范围；迁移、审计、前后端测试 |
| 未提交修改 / 本地依赖 | 检查点提交时预计工作区干净；若实际不同以 `git status` 为准。Node.js 26、pnpm 10 的临时本地安装不随 Git 同步；Compose 合成数据库卷及临时演示密码也不随 Git 同步。若保留卷但丢失密码，按 README 用显式重置选项恢复 |

下一任务预计修改 `backend/app/`、`backend/alembic/versions/`、`backend/tests/`、`frontend/app/` 及相关 API/数据/安全文档。先核对未决问题与 Git 状态，不扩展到临床规则。恢复演练见 [RECOVERY_TEST.md](testing/RECOVERY_TEST.md)。
