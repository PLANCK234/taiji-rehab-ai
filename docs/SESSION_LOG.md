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

## 2026-10-30 UTC · S2-01

- 目标：仅依据仓库检查点接续，在 Q-02 未决的合成回退路径实现手工 SPPB 总分评估（FR-003、AT-01/02 录入部分）。
- 完成：基线/复评草稿；有效整数 0–12、缺失、无效与未记录状态；只追加版本、工作人员确认、更正原因、操作者和 UTC 时间；模拟同意、角色/研究/对象授权、CSRF、幂等与版本冲突；中文对象页及评估时间线；迁移和 OpenAPI。
- 决策：完整快照版本保留历史，`SYN-MANUAL-V1` 不是临床 SOP；无分项自动计分、分级、安全或建议，见 ADR-0007。S3-01 因 Q-03/09 未签核阻断，下一可执行任务 S6-01 仅纯合成本地预览。
- 测试：后端 Ruff/pytest 22；前端 Node 26/pnpm 10 容器 lint/typecheck/test 11/build；临时空 PostgreSQL 17 迁移升降升及 Alembic check；另一临时库 API 权限/同意/零分/幂等/重启持久化；Next 代理页面复评缺失流程。首次烟测脚本受本机 SOCKS 代理影响，直连后执行；React 数字节点注释造成的文本断言调整后通过。结果见 `STATUS.md`。
- 提交/PR：本地分支 `feat/s2-01-manual-assessments`；最终 SHA 以 `git log` 为准，未创建 PR。
- 遗留：AT-01 CSV/周期、AT-02 分级、完整量表、远端 CI/Playwright、真实数据准入和所有临床审批均未完成。

## 2026-10-31 UTC · S6-01

- 目标：从仓库与 Git 检查点接续，在 Q-01/10 未决的纯合成路径完成姿态演示壳（AT-12 合成部分）。
- 完成：已授权编号对象可进入姿态页；页面持续显示“姿态识别算法尚未接入”；按钮仅生成、切换、清除浏览器内存中的合成 SVG；无摄像头、文件选择、上传/保存、姿态估计或评分。模拟照片范围只显示状态，不解锁采集。
- 决策：采用页面内生成的合成线条人物，避免真实影像处理及样例来源问题，见 ADR-0008；没有数据库迁移或后端图片 API。
- 测试：后端 Ruff/pytest 23、前端 Node 26/pnpm 10 容器 lint/typecheck/test 12/build；DOM 交互无摄像/网络/存储调用；临时 PostgreSQL + Next HTTP 登录/对象范围/照片范围及图片 API 404 烟测。首次 DOM 测试因 Node 26 `localStorage` 全局不可用失败，改用测试监视器后通过。浏览器 UI 工具因无法可靠识别当前 Chrome URL 而停止，本轮未运行浏览器手工 E2E。结果见 `STATUS.md`。
- 提交/PR：本地分支 `feat/s6-01-synthetic-pose-demo`；最终 SHA 以 `git log` 为准，未创建 PR。
- 遗留：Q-01/10 真实影像审批、AT-12 真实影像/手工浏览器验收、远端 CI 均待后续；台账无依赖已满足的下一 Task ID，S3-01 待 Q-03/09 签核。

## 2026-10-31 UTC · 无可执行 Task ID（恢复审计）

- 目标：只依据仓库资料恢复检查点，复核 S6-01 的实际代码与测试，寻找依赖已满足的下一 Task ID。
- 完成：确认起始工作区干净，HEAD `207d8896c295fbca090193198d6037d61d8a1419` 与 HANDOFF 一致；复核 AGENTS、继续 Prompt、STATUS/HANDOFF/TASKS、Git、S6-01 实现及相关设计。另建 `chore/recovery-audit-2026-10-31`，只更新交接文档；任务状态不变。
- 决策：Q-03/09 仍未由有权负责人签核，S3-01 保持 BLOCKED；其他未完成任务依赖前序阶段或审批。未添加新 Task ID，未修改临床规则或真实影像处理。
- 测试：后端 Ruff 通过、pytest 23 passed（上游弃用警告 1 条）；前端 Node 26.13/pnpm 10 容器 lint/typecheck/test 12/build 通过；Compose config、交接脚本（13 Task ID/链接）和上次提交 `git show --check --stat` 通过。上一检查点的临时 PostgreSQL/HTTP 烟测未重跑；浏览器手工 E2E 与远端 CI 未运行。
- 提交/PR：本地文档分支 `chore/recovery-audit-2026-10-31`；最终 SHA 以 `git log` 为准，未创建 PR。
- 遗留：需 Q-03 的适配模板/禁忌/剂量及 Q-09 的审批/发布责任人与版本证据完成签核，方可启动 S3-01；浏览器手工 E2E、远端 CI 和其他审批仍待后续。

## 2026-10-31 UTC · S6-02

- 目标：从干净的 `692971f35f585dcfe4eaa3c3309746b5e4dcbf29` 检查点恢复，补齐已记录的 AT-12 合成姿态页浏览器验收缺口，不触及真实影像或临床规则。
- 完成：登记 `S6-02`，新增 Playwright/Chromium 测试、本地合成 API 夹具、可复用的发行版 Chromium 测试镜像与锁定依赖；验证未登录跳转、未分配对象拒绝、算法提示、模拟照片范围不解锁采集、合成 SVG 生成/切换/清除以及无摄像头调用和非 GET 请求。无产品业务代码、后端接口或迁移变更。
- 决策：浏览器测试只使用 `SYN-001` 等合成夹具；模拟 API 的页面验收不代表真实 PostgreSQL 全链路。Playwright 浏览器 CDN 在本机容器 DNS 中不可达，测试镜像改用发行版 Chromium；这只是测试工具选择，不改变影像政策。
- 测试：后端 Ruff/pytest 23；前端 Node 26/pnpm 10 lint/typecheck/test 12/build；Chromium 浏览器 3 passed；测试镜像构建、Compose config、交接脚本。首轮浏览器测试 2/3，过宽图片选择器误匹配 Next 开发工具图标，限定到合成预览区域后全部通过。浏览器手工 UAT、远端 CI、真实影像与临床验收未运行。
- 提交/PR：本地分支 `feat/s6-02-synthetic-browser-e2e`；最终 SHA 以 `git log` 为准，未创建 PR。
- 遗留：S3-01 仍待 Q-03/09 签核；S4/S5/S7/S8 有前序或审批依赖。AT-12 真实影像待 Q-01/10；真实 PostgreSQL/Next HTTP 烟测本轮未重跑。

## 2026-10-31 UTC · 无可执行 Task ID（S6-02 后恢复复核）

- 目标：只依据仓库和 Git 恢复最新检查点，复核 S6-02 结果并选择依赖已满足的下一 Task ID。
- 完成：确认起始工作区干净、HEAD `bf85e3c21f5cfe723be93573ed3c841c713ca781` 与 HANDOFF 一致；核对任务台账、实际浏览器代码、合成夹具、S3-01 设计及未决问题。另建 `docs/recovery-audit-post-s6-02`，只更新交接文档；任务状态不变。
- 决策：Q-03/09 仍无有权签核与版本证据，S3-01 保持 BLOCKED；其余未完成任务依赖前序阶段或其他审批。未自行新增 Task ID 或启用临床规则。
- 测试：后端 Ruff/pytest 23、前端 Node 26/pnpm 10 lint/typecheck/test 12/build、Playwright/Chromium 3、Compose config、交接脚本 14 Task ID/链接及上次提交检查均通过；pytest 有上游弃用警告 1 条。真实 PostgreSQL/Next HTTP 烟测、手工浏览器 UAT 与远端 CI 未运行。
- 提交/PR：本地文档分支 `docs/recovery-audit-post-s6-02`；最终 SHA 以 `git log` 为准，未创建 PR。
- 遗留：需 Q-03 的适配模板/禁忌/剂量与 Q-09 的审批/发布权限签核和版本证据，才可启动 S3-01；真实影像仍待 Q-01/10。

## 2026-10-31 UTC · ENG-04A

- 目标：依据开发负责人明确授权，在不改变临床规则的前提下登记 ENG-01 至 ENG-04，并交付首个独立的真实数据库自动化质量门禁。
- 起点：从干净的 `e5d7a5865a0c6354c57ce857046da347e1aa75d3` 复核 AGENTS、继续 Prompt、HANDOFF/STATUS/TASKS、Git、代码和测试；确认 Q-03/09 仍未签核，`S3-01` 继续 `BLOCKED`。
- 完成：`ENG-04A` 的临时 PostgreSQL 17 tmpfs 迁移/API 测试、OpenAPI 快照测试、CI 隔离库顺序与 ENG Task ID 交接校验；更新任务依赖与验收、测试策略、追踪和恢复演练。真实 API 覆盖合成建档、模拟同意/筛查、人工基线/复评、零分/缺失、追加更正、持久化、跨研究/同研究未分配对象和角色拒绝。无业务 API、临床阈值、建议或真实数据修改。
- 测试：后端 Ruff 通过、普通 pytest 24 passed/1 skipped；临时库 `upgrade head → alembic check → downgrade base → upgrade head` 与 opt-in PostgreSQL 测试 1 passed；交接脚本与最终 Git 检查另在 STATUS 留痕。直接 `python` 在本机不可用，改用 `uv run --no-project python`。pytest 有上游弃用警告 1 条。远端 CI、前端与完整浏览器业务 E2E 未运行。
- 提交/PR：本地分支 `feat/eng-04a-postgres-contract`；最终 SHA 以 `git log` 为准，未推送或创建 PR。
- 接续：`ENG-01A` 可开始纯合成可重放夹具；ENG-01 全链路的候选分级仍受 S3-01/Q-03/09 阻断，训练/周期/导出另需非临床前置实现。

## 2026-10-31 UTC · ENG-01A

- 目标：从干净的 ENG-04A 检查点 `2357fe7` 接续，交付现有合成建档至人工复评能力的可重放 Demo 夹具。
- 完成：新增可选 `app.seed_reassessment_demo`，基于本地基础合成账号/研究创建两名 SYN-ENG01A 编号对象、模拟同意、未知或未记录筛查、人工总分基线/复评、缺失及有原因的更正历史；记录种子审计。二次运行核验已有夹具，不增加记录；遇部分或被改动的夹具拒绝覆盖。无新 API、迁移、临床等级、疗效标签或训练建议。
- 测试：后端 Ruff 通过、普通 pytest 25 passed/2 skipped；临时 PostgreSQL 17 空库迁移升/check/降/升后，既有真实 API 工作流和夹具 SQLite/PostgreSQL 测试 3 passed；容器停止。`README.md` 给出本地命令。前端和远端 CI 未运行；pytest 有上游弃用警告 1 条。
- 提交/PR：本地分支 `feat/eng-01a-synthetic-reassessment`；最终 SHA 以 `git log` 为准，未推送或创建 PR。
- 接续：`ENG-02A` 可基于真实数据库中的合成评估记录实现权限受控的已确认趋势与缺失视图；ENG-01 父任务仍缺候选状态、训练、周期和导出，临床候选仍受 S3-01/Q-03/09 阻断。
