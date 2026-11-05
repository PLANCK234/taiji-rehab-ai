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

## 2026-10-31 UTC · ENG-02A

- 目标：从干净的 `888d2488c2e12bb47fa58367d256356b87bc2d84` 检查点恢复，完成现有人工 SPPB 总分的合成对象级只读趋势与缺失视图。
- 完成：新增服务端授权/审计的趋势 API，按评估登记时间返回最新修订和最新已确认修订；对象页用可访问表格及总分图示展示已确认有效记录，将草稿、缺失、无效和实际零分分开。更新 OpenAPI、PRD/验收、数据字典、API/安全合同与 ADR-0009。没有新迁移、临床规则、疗效标签、训练或导出。
- 测试：后端 Ruff/pytest 27 passed/2 opt-in skipped，临时 PostgreSQL 迁移升/check/降/升与真实 API 测试 3 passed；前端 Node 26/pnpm 10 lint/typecheck/test 15/build；独立 tmpfs PostgreSQL→FastAPI→Next 页面烟测显示两名合成对象的数据库总分/缺失，跨研究页面 404，临时容器/网络均停止。首轮 Ruff 一处过长行修复后通过。远端 CI、真实数据和临床人工验收未运行。
- 提交/PR：本地分支 `feat/eng-02a-assessment-trends`；最终 SHA 以 `git log` 为准，未推送或创建 PR。
- 接续：`ENG-03A` 为下一依赖已满足任务；只做合成离线数据质量和对象级切分。`S3-01` 仍因 Q-03/09 未签核 `BLOCKED`，ENG-01/02/04 父任务未完成。

## 2026-10-31 UTC · ENG-03A

- 目标：从干净的 ENG-02A 检查点 `e8eaca1` 接续，交付纯合成离线质量报告与对象级划分（AT-11 切分部分）。
- 完成：独立锁定的 `ml/` 项目固定生成 18 个虚构编号对象、36 条人工总分示例；报告缺失/无效/未记录、真实零分和重复；拒绝非合成或结构错误；按对象分配 train/validation/test，阻止交叉/遗漏；导出 JSONL/质量/划分/哈希清单，同种子可重放、异内容拒绝覆盖。CI 加入 ML 检查；ADR-0010、数据集规格、验收与交接同步。没有业务数据库读取、疗效标签、模型训练或临床规则变更。
- 测试：上次 ENG-02A 定向后端 3 passed/1 opt-in skipped，交接校验 22 ID；ML Ruff 与 4 项 pytest 通过，CLI 两次产出相同 36 行和 SHA-256 `c446f04f23ff0453a28a1426716288f34f5cb3e889ded875f7cfcd4d11e5bd96`。首次 Ruff 格式失败，修正后通过。远端 CI 未运行；最终检查见 STATUS。
- 提交/PR：本地分支 `feat/eng-03a-synthetic-offline-dataset`；最终 SHA 以 `git log` 为准，未推送或创建 PR。
- 接续：`ENG-04B` 在临时真实 PostgreSQL + API + Next 上补合成业务浏览器 E2E；`S3-01` 因 Q-03/09 未签核继续 `BLOCKED`。

## 2026-10-31 UTC · REAL-01P

- 目标：在 REAL-01 医疗研究工作台方向下，先建立 Demo 与未激活 Research 的数据库/配置/准入隔离；仅以合成数据验证。
- 基线核对：起点 9ea36c8（origin/main 合并检查点）；旧 HANDOFF 指向 ENG-03A 已过时，ENG-04B 浏览器文件已合并但本次未证明浏览器通过；工作区原有 .vscode/ 未触碰。
- 实施：新增 APP_PROFILE 门禁和独立 Research Compose/配置；Research 业务 API、ready、演示种子、Alembic 迁移保持关闭。Demo 旧流程仍可用。拆解 REAL-01P/A-F，S3-01/Q-03/Q-09 继续阻断。
- 验证：后端 Ruff 通过、pytest 30 passed/2 opt-in skipped；临时 PostgreSQL 迁移/API 3 passed；两个 Compose config --quiet 通过。Research 数据库未启动或迁移，原有卷未修改；前端、浏览器和远端 CI 未在本切片运行。
- 下一步：REAL-01D 非临床训练会话与反馈持久化；不得自动制定处方或解释风险。提交/检查点 SHA 以 git log 为准；未推送主分支。

## 2026-10-31 UTC · REAL-01D0

- 目标：在 S3-01/Q-03/09 未签核、周期未实现时，先实现非临床“已发生训练观察”及反馈/事件的合成数据库闭环。PRD FR-006/007 完整周期和临床处置部分仍未完成。
- 实施：Alembic 0005 建训练会话、追加式反馈修订和无严重度分类的独立事件表；后端 API 采用角色/研究/对象隔离、模拟同意、CSRF、幂等、审计和更正版本；前端对象页/反馈页可实际录入与查看。事件可在无反馈时独立记录，平台不发通知或处置建议。OpenAPI、数据字典/API/安全/验收/ADR-0012 更新。
- 测试：后端 Ruff 通过、pytest 32 passed/3 opt-in skipped；临时 PostgreSQL 迁移升/降/升、Alembic check、API 4 passed；前端 Node 容器 lint/typecheck/21 tests/build；真实 Chromium→Next→FastAPI→PostgreSQL 浏览器测试 4 passed。首轮旧 ENG-04B 用例因点击返回后未等导航就 reload 失败；加 URL 等待后复测 4 passed。未触碰原有数据库卷，未接入真实数据。
- 取舍：D0 不伪造周期/规则版本，不对 RPE/疲劳推断疗效或安全。事件仅存事实，不能替代机构处置流程。下个 Task ID 为 REAL-01E0（手工周期容器与复评关联），随后 REAL-01F0 合成编号化导出。检查点 SHA 以 git log 为准；未推送 main。

## 2026-10-31 UTC · REAL-01F0

- 目标：利用既有合成人工评估/复评/训练反馈完成纵向浏览器链路中的编号化导出；不依赖尚未批准的研究周期日程。
- 实施：新增单对象实时 Demo CSV API 和对象页下载链接。服务器按角色、研究和对象范围授权，输出评估与反馈全部修订、训练会话和事件存在记录，显式保留零/空/缺失/版本；排除身份、邮箱和自由文本。响应有行数、SHA-256、no-store、live-demo 标记，允许/拒绝下载留审计。ADR-0013 和 API/字典/安全/验收/追踪更新。
- 验证：后端 Ruff/pytest 32 passed/4 opt-in skipped；临时 PostgreSQL 迁移升降升、Alembic check、5 API passed，核对 CSV 行数/哈希/内容、跨对象及分析员 403、审计；真实 Chromium 4 passed，包含对象页下载与越权拒绝。前端最终 lint/typecheck/unit/build 和交接检查以本次最终执行记录为准。无真实数据、批量导出或原有卷操作。
- 取舍：实时文件不是冻结快照；Q-07/Q-09 的真实字段/发布权限未签核。下个 Task ID 为 REAL-01E0：手工周期容器、复评/训练关联和缺失历史；随后扩展指标与冻结数据集。检查点 SHA 以 git log 为准；未推送 main。

## 2026-10-31 北京时间 · DEMO-V2-00..07

- 从干净分支 `feat/real-01f0-coded-export` / `b81aa58` 复核所有现存 AGENTS、权威规范、现有模型/API/前端/迁移/任务台账。复用账号会话/RBAC、`participants`、`assessments`/追加修订、`training_sessions`/反馈/事件、PostgreSQL/Alembic 和合成种子。
- 更新全仓 6 个 AGENTS 文件及 PRD、独立七步流程、验收、任务/路线图、API/数据契约、README、ADR-0014、追踪和交接。`0006_demo_v2` 只新增 Demo 专用资料/等级/动作/训练状态表。确认评估时保存 `demo-rule-v1`；动作 12 条幂等种子。前端统一暗色视觉并接入真实 API，从建档/8 或 5 分到方案、动作库、训练、反馈/中止可操作。
- 后端 Ruff、pytest 42 passed/4 opt-in skipped；临时 PostgreSQL 升/降/升和 Alembic check、旧 API 5 passed；前端 Node 26 容器 lint/typecheck/21 tests/build；真实浏览器首轮 5/6 因 E2E 选择器歧义，修复后 6/6，新增中止后最终 7/7。尚未运行远端 CI。
- 本机原合成卷迁移前 4 个 `SYN-` 对象、head `0004`；备份到忽略目录 `exports/demo-v2-pre.dump` 后向前迁移到 `0006`、动作 12，旧对象仍 4。`http://127.0.0.1:3000/login` 200，ready 200。Research 没有启动或迁移；没有临床审批或真实患者数据。
- 保留 REAL/ENG/S 状态和 S3-01/Q-03/Q-09 阻断。下个 Task ID `REAL-01E0`；如继续 Demo，先完善实际完成动作独立字段/修订与训练反馈易用性。检查点提交见 Git 日志，不推送或合并 main。

补充：最终核对发现计划动作不等于实际完成动作，追加 `0007_demo_completed_actions`，结束表单可选已完成动作 ID；null 表示未知，后端拒绝不属于本次组合或重复的 ID。最终验证和本机迁移结果以 [STATUS](STATUS.md) 最新记录为准。

## 2026-11-01 北京时间 · DEMO-V2 最终复测与本机演示启动

- 后端 Ruff 通过、pytest 42 passed/4 opt-in skipped；OpenAPI 快照同步。临时 PostgreSQL 迁移升/降/升及原 API 5 passed。前端 Node 26 容器 lint/typecheck/21 tests/build 通过。完整浏览器链路 7 passed，含完成动作刷新持久化、旧业务和跨对象拒绝。
- 本机既有合成卷备份后从 `0006` 增量迁移至 `0007_demo_completed_actions`；核对 head、原 4 个 `SYN-` 对象、12 条动作和新列。重建后 API ready、登录页均 200；Research 未启动。本次未推送/合并 main。下一 Task ID `REAL-01E0`。

## 2026-11-05 北京时间 · DEMO-V2-08

- 用户要求降低黑色界面的压抑感，并先为练习添加播放区域；暂无视频素材。独立分支 `codex/demo-light-video-slot` 从 `main` 的 `1fdd767` 开始。
- 前端改为浅米白/绿色；方案动作详情与训练当前动作共用 16:9 视频区域。无素材时明确显示待添加；保留 `DEMO_ONLY` 提示。不修改业务规则、数据库或权限。
- 隔离 Docker 生产构建、lint、typecheck、23/23 前端测试通过；浏览器视觉核对浅色登录页。更新本机前端容器时发现镜像只监听容器主机名，映射端口 502；Dockerfile 设置 `HOSTNAME=0.0.0.0` 后，本机直连及浏览器均 200，后端与数据库保持运行。宿主机已有 `node_modules` 缺依赖，故宿主机 typecheck 结果不作通过证据。真实视频播放待素材审核与提供。
- 下一任务仍为 `REAL-01E0`；如优先完善演示，可在拿到经审核的视频后接入本地素材，并补真实浏览器播放验收。

补充本机登录修复：用户在 `127.0.0.1:3000/login` 看到“登录失败”；后端日志为 403，运行时 `APP_PUBLIC_URL` 仍是先前临时外链。备份忽略的本机 `.env` 后，将其公开地址改为当前本机入口，仅重建后端容器。ready 200；同源错误测试账号返回 401、异源返回 403，说明请求已进入凭据校验且来源防护未关闭。未读取或输出实际密码，未完成有效账号登录测试；旧临时外链的登录来源不再被允许。

## 2026-11-05 北京时间 · DEMO-V2-09

- 用户要求重新生成临时外网链接。启动独立 Cloudflare quick tunnel 容器，转发当前合成演示前端，得到随机 HTTPS 域名；未开放数据库端口。
- 后端允许 `APP_PUBLIC_URL`，且只在 `APP_ENV=local/test` 时额外允许显式 `APP_LOCAL_URL`；Compose 本机地址为 `127.0.0.1:3000`，使外网与本机登录并存。未放宽其他来源或临床/真实数据门禁。
- 本机 `.env` 修改前另存忽略的可恢复副本。后端 pytest 43 passed/4 opt-in skipped（含认证 11 passed）、Ruff/Compose config 通过；外网登录页 200，两种同源无效凭据均 401，ready 200。有效账号外网登录未测试；临时域名需要本机 Docker/隧道运行。

补充 1033 恢复：旧 Quick Tunnel 容器虽运行，QUIC 连接持续超时；旧域名外网返回 530，本机页面 200。停止但保留旧容器，新建固定 HTTP/2 隧道并取得新随机域名。修改忽略的 `.env` 前备份，之后仅重建后端容器。新域名登录页 200；外网及本机无效测试凭据均 401，ready 200。旧域名不再分发；未以有效密码跨网测试。

## 2026-11-05 北京时间 · DEMO-V2-10 双端产品方向

- 用户明确希望平台未来同时供工作人员与患者使用；重新确认首版患者范围为查看医护确认的本人计划/审核视频、记录训练与不适。先前误选的“患者自行填写量表”已由用户撤回，不纳入第一版。
- 核对当前代码仅有工作人员角色、研究/对象授权与合成 Demo；患者账号、本人绑定、患者页面、医护发布计划、已审核视频均未实现。
- 更新 PRD/SCOPE/ROADMAP、ADR-0015、验收、问题、任务与交接，拆出合成患者入口等后续任务。`scripts/check_handoff.py` 通过（49 Task ID、链接完整），`git diff --check` 通过；仅文档变更，未运行代码测试。没有修改临床阈值、真实数据准入或服务配置；真实患者试点继续阻断。
