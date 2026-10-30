# 开发会话日志（仅追加）

新会话在文件末尾追加：UTC 日期与 Task ID、目标、完成、决策、测试、commit/PR、遗留问题。不要覆盖旧记录，也不要写入聊天全文或敏感数据。

## 2026-10-30 UTC · S0-01/S0-02/S0-03/S0-04

- 目标：从文档仓库建立可运行的合成数据工程骨架与跨会话交接。
- 完成：Next.js 健康页、FastAPI `/health`/`/ready`、PostgreSQL/Alembic 空基线、Compose、CI、锁文件、README、任务/状态/交接/Prompt、校验脚本。
- 决策：空迁移基线不提前创建临床业务表；合成 fixture 暂不入库。交接文档作为仓库检查点，见 ADR-0004。
- 测试：前端 lint/typecheck/test 2/build；后端 Ruff/pytest 2；Compose config/build/up；迁移升降升；容器 HTTP 冒烟；交接脚本。结果见 `STATUS.md`。
- 提交/PR：本地任务分支 `feat/s0-bootstrap-handoff`；提交哈希以最终 `git log` 为准，未创建 PR。
- 遗留：远端 GitHub Actions 未运行；Q-01 至 Q-13 未关闭；Sprint 1 未开始。

## 2026-10-30 UTC · S1-01

- 目标：按上次交接实现合成环境员工认证和编码对象只读范围授权（FR-001、AT-05 读取部分）。
- 完成：Argon2 密码、持久匿名会话令牌、CSRF 注销、登录限流、角色/研究/对象三重校验、拒绝及允许审计、登录/工作台 UI、合成种子、迁移和 OpenAPI 快照。
- 决策：真实身份映射、同意、业务建档和导出留给后续任务；见 ADR-0005。未知及未分配对象都返回 403。
- 测试：后端 Ruff/pytest 14、前端 lint/typecheck/test 4/build、PostgreSQL 迁移升降升和 Alembic check、容器登录/授权/越权/注销/限流及显式合成密码重置烟测。首次索引漂移检查失败后修复；结果见 `STATUS.md`。
- 提交/PR：本地分支 `feat/s1-01-auth-scope`；最终提交哈希以 `git log` 为准，未创建 PR。
- 遗留：AT-05 导出部分和远端 CI 未运行；Q-01/Q-07/Q-08 等审批未关闭；S1-02 未开始。

## 2026-10-30 UTC · S1-02

- 目标：仅依据仓库检查点接续，完成合成编号对象建档、模拟同意与三态筛查（FR-002、AT-03/14 合成部分）。
- 完成：受研究/对象权限约束的创建与列表；创建者原子对象分配；CSRF 和幂等写入；只追加的同意/筛查及原因代码、操作者和 UTC 时间；无同意或撤回后筛查写入 403；无记录“未评估”、有记录“待复核”；中文工作台/对象页。照片上传、真实身份和临床安全判定均关闭。
- 决策：无获批准筛查项目/规则时不显示安全或入组结论；见 ADR-0006。生产环境即使误设合成标志也不能打开业务数据库路由。
- 测试：后端 Ruff/pytest 18；前端 Node 26/pnpm 10 容器 lint/typecheck/test 7/build；临时空 PostgreSQL 17 迁移升降升及 Alembic check；PostgreSQL API 登录/授权/同意/筛查烟测；前端代理工作台和对象页状态烟测。首次本机 pnpm 缺失，改用容器；首次容器 pnpm 安装因非交互模块清理中止，设置 `CI=true` 后通过。结果见 `STATUS.md`。
- 提交/PR：本地分支 `feat/s1-02-synthetic-intake`；最终 SHA 以 `git log` 为准，未创建 PR。
- 遗留：AT-14 真实数据准入、远端 CI 与临床审批未完成；S2-01 仅可在 PRD 人工总分合成回退路径上推进，Q-02 未决时不得实现分项自动计分。
