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

## 2026-11-05 北京时间 · DEMO-V2-11 合成患者本人入口

- 从 `codex/demo-light-video-slot` 的干净 `3932090` 建立 `codex/demo-patient-self-scope`。新增 `0008_demo_patient_binding`、Demo 合成患者种子与单对象绑定、`/api/v1/patient/me` 和分配医护撤销 API；患者不能读取工作人员研究/对象/导出/方案。独立 `/patient` 页面只显示本人 `SYN-001` 编号；无已发布计划/视频或患者记录时明确显示未开放。
- 后端 Ruff 通过、pytest 44 passed/4 opt-in skipped；临时 PostgreSQL 升/空库降/升与 Alembic check 通过。前端隔离 Docker 生产构建、lint/typecheck/23 tests 通过。独立测试网络中的真实浏览器成功登录患者、核对本人编号及工作人员路由转向；工作人员撤销返回 204，原患者会话刷新回登录，再登录显示无法访问。
- 新增 `frontend/e2e/patient.real.ts`，但自动 Chromium 镜像构建在 Debian apt 下载处失败，未执行自动浏览器用例。测试容器/网络仅为本任务临时合成环境；现有共享 Demo PostgreSQL 卷、服务和旧临时网址未修改。本分支未推送或合并；真实患者试点继续阻断，医护发布计划/视频和患者训练/不适录入待 DEMO-V2-12/13。

## 2026-11-05 北京时间 · DEMO-V2-12 合成发布流程

- 从干净 `cc2c106` 建立 `codex/demo-patient-publication`。新增 `0009_demo_patient_publication` 追加版本事件，固定 `SYNTHETIC_PROCESS_ONLY` 测试卡片；医护发布/撤回需对象授权、活跃合成绑定、发布时当前模拟同意、CSRF、幂等与预期版本。患者只读本人当前已发布投影，无真实训练内容和视频 URL；视频区域显示待添加。架构取舍见 ADR-0016。
- 后端 Ruff、pytest 45 passed/4 skipped；前端隔离 Docker lint/typecheck/24 tests/build；临时 PostgreSQL 升/空库降/升、Alembic check、旧业务 API 5 passed；完整真实 Chromium 8 passed。首次集成检查仅因三处旧测试将 Alembic 版本固定为 `0007` 失败，改为当前 head 后复测通过。
- 自动浏览器镜像所需 Debian Chromium 本次下载成功，之前 DEMO-V2-11 未跑的患者用例与新发布/撤回流程一并通过。测试脚本停止临时容器、网络并移除其任务镜像；既有共享 Demo 数据库/服务/外网隧道未改动。Q-03/Q-09/Q-15 的临床内容与视频审核继续阻断；下一可执行合成任务 DEMO-V2-13。

## 2026-11-05 北京时间 · DEMO-V2-13 合成患者自报记录

- 从干净 `1e7bd24` 建立 `codex/demo-patient-report`。新增 `0010_demo_patient_report` 追加式版本表、本人与授权医护接口、患者录入/更正页面和工作人员只读修订历史。独立于医护观察；缺失保持未知，当前模拟同意与绑定限制新写入；无自动风险判定、通知或处置承诺。取舍见 ADR-0017。
- 后端 Ruff、pytest 46 passed/4 skipped；前端隔离 Docker lint/typecheck/24 tests/build；临时 PostgreSQL→FastAPI→Next→Chromium 8 passed，含本人填写、不适、更正、刷新、医护查看与绑定撤销。本机前端 `node_modules` 缺少测试依赖，故本机 typecheck/test 不构成可用基线，隔离镜像复验通过。
- 另一临时 PostgreSQL 升/空库降/升、Alembic check 与旧业务 API 5 passed；浏览器脚本清理临时容器、网络和任务镜像。交接脚本与 Git 差异最终检查见提交记录。未部署到现有共享 Demo 服务或临时域名，未推送；真实患者数据与正式异常处置继续阻断。

## 2026-11-06 北京时间 · REAL-01E0 后端检查点

- 从干净 `67d3626` 建立独立分支，新增非临床手工周期表、追加式访视修订及同对象评估/训练观察关联 API；Q-05 未决，不生成正式访视计划。
- 后端 Ruff、pytest 47 passed/4 skipped；OpenAPI 快照更新；临时 PostgreSQL 迁移升/空库降/升、Alembic check 和旧业务 API 5 passed。对象页、新关联的 PostgreSQL 行为与浏览器端到端尚未验收，任务保持 IN_PROGRESS。继续前需复核数据状态组合与关联权限，不得将此检查点用于正式研究。

## 2026-11-06 北京时间 · REAL-01E0 对象页与隔离验收

- 在 `248485f` 后补周期/访视对象页、已有评估和训练观察关联选择、最新版本及修订历史；API 响应模型和跨对象链接/旧版本拒绝测试。没有改变现有评估和训练原始行或自动安排访视。
- 后端 Ruff、pytest 47 passed/4 skipped；前端 Docker lint/typecheck/24 tests/build；一次性 PostgreSQL 迁移升/空库降/升与旧 API 5 passed；Chromium 首跑 7 passed/1 failed，原因是测试“修订历史”文字定位歧义；新增关联评估当前值断言后又因测试按序号选中基线而 7 passed/1 failed。改为按复评名称选择后最终 8 passed。失败附件在 `exports/eng04b-bb46b75cf610` 和 `exports/eng04b-0f4e39d44f59`；脚本清理临时容器、网络与任务镜像。
- ADR-0018 记录手工归组和缺失语义；正式日程、冻结快照和真实数据准入仍需批准。现有共享站点未部署本分支，未推送或合并。下一可执行任务建议 REAL-01A 合成授权管理。

## 2026-11-06 北京时间 · REAL-01A0 合成工作人员管理

- 从干净 `9e9544a` 建立 `codex/real-01a-synthetic-staff-admin`。新增 Demo-only 管理员 API、中文管理页和 `0012` 追加变更历史；仅可管理合成工作人员及 SYN 研究/对象授权。停用/改角色撤销会话，研究撤权连带对象撤权；种子重跑保留撤权，管理员种子默认关闭、仅显式本地开关启用。没有 Research 身份导入、真实患者或临床规则变更，REAL-01A 父任务继续 IN_PROGRESS。取舍见 ADR-0019。
- 后端 Ruff、pytest 49 passed/4 skipped；前端 Docker lint/typecheck/24 tests/build；临时 PostgreSQL 迁移升/空库降/升、Alembic check 与旧 API 5 passed；隔离 Chromium 最终 9 passed。浏览器首轮异步等待不足、第二轮刷新后误选首位账号，两处测试定位修正后完整复跑通过；失败附件及清理见 STATUS。
- 未部署共享 Demo 服务或外网临时站点，未推送/合并。下一独立合成工程任务建议 REAL-01B 的档案更正子集；真实身份、正式同意和机构账号治理等待批准。

## 2026-11-06 北京时间 · REAL-01B0 合成展示资料更正

- 从干净 `7369690` 新建 `codex/real-01b0-synthetic-profile-revisions`。新增 `0013` 追加式展示资料版本表、API 当前/历史投影及对象页录入/更正；原资料行不改写，旧行未知创建人/时间不回填。授权、CSRF、幂等、预期版本和合成更正原因均在服务器核验；无真实身份或正式同意。取舍见 ADR-0020。
- 后端 Ruff、pytest 51 passed/4 skipped；前端 Docker lint/typecheck/24 tests/build；一次性 PostgreSQL 迁移升/空库降/升、Alembic check 与旧 API 5 passed；隔离 PostgreSQL→FastAPI→Next→Chromium 最终 10 passed，含初始值、更正和刷新历史。浏览器首轮历史版本定位歧义导致 9 passed/1 failed，限定历史列表后完整复跑通过；失败附件与资源清理见 STATUS。
- 未部署共享 Demo 服务或外网临时站点，未推送/合并。REAL-01B 父任务仍进行中；下一独立合成任务建议 REAL-01C 的多指标人工原始值录入子集，先核对数据字典，不自动计分。

## 2026-11-07 北京时间 · REAL-01C0 人工多指标契约

- 从干净 f030004 核对数据字典、待决问题、实际 SPPB 请求/响应与 CSV 代码。完成合成原始观察契约，明确字段、单位、未知语义、追加更正、授权、旧流程兼容及验收清单。
- 本轮未实现多指标功能；后端 Ruff 通过，人工评估基线 5 passed。未运行前端/浏览器，未部署或推送。下一任务 REAL-01C1；真实量表 SOP 与准入审批不变。

## 2026-11-07 REAL-01C1 合成原始观察检查点

新增 0014 追加版本表与 manual-observations API、对象页录入/更正。四种指标固定单位，十进制原值以最长 40 字符字符串保存，拒绝非有限数；按对象权限、当前模拟同意、CSRF、幂等与预期版本核验。独立于 SPPB 和 Demo 分级，旧 CSV 暂不含这些观察，页面明确说明。后端 Ruff/52 passed、4 skipped；前端 build/lint/typecheck/24 tests；临时 PostgreSQL 迁移升/check/空库降/升与旧 API 5 passed；Chromium 10 passed。首次浏览器发现幂等 route_key 超过 PostgreSQL 80 字符限制，缩短后复测通过；失败附件 exports/eng04b-c62151e22521 保留。最终展示文字补充录入人/时间尚待前端复验。REAL-01C1 保持 IN_PROGRESS：需补齐四指标/缺失/无效与撤权边界验收、独立浏览器夹具及完整契约核对；不宣称多指标功能全面验收。共享网站未部署、未推送。

## 2026-11-07 REAL-01C1 完成复验

补齐四指标/单位、小数、零值、缺失/无效、必填校验、未知指标和撤权后旧会话 API 测试；页面补测量时间/原因并固定更正指标。浏览器夹具自行建立合成同意，避免依赖测试顺序。Ruff 通过、pytest 52 passed/4 skipped；前次临时 PostgreSQL 迁移/旧 API 5 passed；最终隔离 Chromium 10 passed，脚本清理新建容器、网络与镜像。前端完整依赖容器 build/lint/typecheck/24 tests 通过；本机 typecheck 因 node_modules 缺少测试依赖失败，见 STATUS。REAL-01C1 完成，父 REAL-01C 未完成；旧 CSV 暂不含新观察，下一任务 REAL-01F1。共享网站未部署，未推送/合并。

## 2026-11-07 REAL-01F1 单对象合成原始观察导出

从干净工作区与 `4484472` 继续。确认旧 CSV 未含 0014 的原始观察，保留旧权限/审计/行数/哈希，只增量导出四指标的全部修订及结构化来源/侧别；自由说明和更正原因不导出。前后端基线 Ruff/52 passed、4 skipped；修改后 Ruff/52 passed、4 skipped；临时 tmpfs PostgreSQL 迁移及 5 个集成测试通过；实际 Chromium 10 passed；前端完整依赖容器 build/lint/typecheck/24 tests 通过。临时容器、网络和门禁镜像已清理。未改临床阈值、生产配置和既有数据卷，未部署/推送。任务完成，下一建议 REAL-01F2；父 REAL-01F 与真实数据审批仍未完成。

## 2026-11-07 REAL-01F2 合成周期/访视历史导出

从干净工作区与 `c6a4491` 继续。核对 E0 只实现手工周期与追加式访视状态/关联，新增实时 Demo CSV 的周期行和全部访视修订；仅出结构化状态与同对象关联 ID，不出标签/更正原因，也不把记录时间当计划或到访时间。修改前后端 Ruff/52 passed、4 skipped；修改后 Ruff/52 passed、4 skipped；临时 tmpfs PostgreSQL 迁移及 5 个集成测试通过；实际 Chromium 10 passed；前端完整依赖容器 build/lint/typecheck/24 tests 通过。临时容器、网络及门禁镜像清理；已有共享 Demo 卷未操作，未部署/推送。下一建议 REAL-01F3；父 REAL-01F 与真实数据审批仍未完成。

## 2026-11-07 REAL-01F3 合成患者自报结构化导出

从干净工作区与 `1ffe38e` 继续。确认患者自报为独立追加式事实，新增 CSV 的全部版本、状态、可空时长、发生/登记时间和患者来源；不导出不适描述/更正原因，也不把自报当医护观察。修改前后端 Ruff/52 passed、4 skipped；修改后 Ruff/52 passed、4 skipped；临时 tmpfs PostgreSQL 迁移与 5 个集成测试通过；隔离 Chromium 10 passed，含授权医护实际下载与脱敏；前端完整依赖容器 build/lint/typecheck/24 tests 通过。临时容器、网络和门禁镜像已清理；未改临床规则或已有共享卷，未部署/推送。下一建议 REAL-01F4，真实患者和研究数据审批仍未完成。

## 2026-11-07 REAL-01F4 模拟同意与筛查历史导出

从干净工作区与 `d4cbcbf` 继续。现有模拟同意/筛查仅可在业务页面读取，单对象 CSV 未覆盖；新增两类逐条记录、合成来源、人员和时间，保留 granted→withdrawn 及 unknown→yes/no 原始历史，不输出更正原因、真实签署或安全/资格结论。修改前后端 Ruff/52 passed、4 skipped；修改后同样通过；临时 tmpfs PostgreSQL 迁移与 5 项集成测试、实际 Chromium 10 项含下载、前端 build/lint/typecheck/24 tests 均通过。隔离容器、网络和门禁镜像清理，原有共享服务保持运行；未改临床规则或已有共享卷，未部署/推送。REAL-01F 父任务的研究级导出仍需 Q-07/09 批准。

## 2026-11-07 ENG-02B 合成训练观察序列

从干净工作区与 `534a2d2` 继续。核对 ENG-02 父任务尚缺训练数据视图，而 D0 已有独立的已发生训练与追加式反馈。新增只读对象序列、服务端授权与审计、最新反馈投影及中文页面；保留零/未知、纠正后不沿用旧 RPE。没有批准的计划次数，ADR-0021 明确暂不计算完成率。修改前 Ruff/52 passed、4 skipped；修改后 Ruff/53 passed、4 skipped；临时 PostgreSQL 5 passed；隔离 Chromium 10 passed；前端 build/lint/typecheck/24 tests。临时容器、网络和门禁镜像清理，原有共享服务保持运行；未改临床规则、数据库或共享卷，未部署/推送。ENG-02 父任务的周期级完成率与科研汇总仍未实现，下一任务 ENG-02C。

## 2026-11-07 ENG-02C 手工周期关联观察展示

从干净工作区与 `fad76b8` 继续。核对 E0 周期页已显示最新访视、关联评估当前值、训练次数及旧修订，原任务描述比实际缺口宽；因此只补最新访视的逐条关联训练状态、实际时长、最新反馈/RPE 与详情不可用提示。复用已有服务端同对象授权 API，无新路由或迁移，不将当前训练事实伪作旧访视快照。后端基线 Ruff/53 passed、4 skipped；前端完整依赖容器 build/lint/typecheck/25 tests；隔离 PostgreSQL 浏览器 10 passed，含创建、更正、刷新、未知时长与越权拒绝。临时容器、网络和门禁镜像已清理，原有共享服务保留；未部署/推送。ENG-02 正式完成率仍缺获批计划分母。

## 2026-11-07 ENG-04C 浏览器 CI 门禁

从干净工作区与 `9bbf410` 继续。核对仓库 CI 只有后端/前端/ML/文档任务，已有真实数据库浏览器脚本未在 CI 执行；新增独立 `synthetic-browser` job 调用原脚本，失败时上传 7 天的合成测试附件，包含隐藏状态文件，工作流只授予仓库读取权限。本地完整脚本 10 passed、临时容器和网络已清理；临时 PyYAML 解析工作流并核对附件路径通过。没有改变应用、临床、数据库或原共享服务，未推送。远端 GitHub Actions 尚未触发，下一步需获准发布分支/PR 后实测，不能将本地通过记作远端通过。

## 2026-11-07 ENG-04C 远端 CI 补验

用户明确授权推送当前功能分支运行测试、不合并 main。核对干净工作区、`9dc13ef` 和 `origin/main` 后，仅推送 `codex/real-01b0-synthetic-profile-revisions`；未创建 PR。首次普通推送受本机代理阻断，获得明确授权后推送成功。[GitHub Actions push #19](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/42356649612) 的 backend/frontend/synthetic-browser/docs/ml 均成功；浏览器作业日志 10 passed，失败附件列表为空。脚本 `finally` 负责清理一次性容器、网络和镜像，远端日志未提供独立的清理后残留核对；此前本地已核对清理。未修改业务代码、临床规则或 main。ENG-04 父任务的完整业务 E2E 与新会话恢复仍待核对。

## 2026-11-07 ENG-04D 一次性资源清理核对

从干净的 `80dfdc3` 继续，实际代码发现脚本 `finally` 忽略 Docker 清理命令的返回码，远端作业通过不能证明本次资源消失。新增仅按本次随机名称核对容器、网络和镜像；残留或 Docker 查询失败让作业失败，浏览器原失败仍作为主错误。CI 在完整浏览器前运行 4 项清理契约测试。本地单测 4 passed、Ruff 通过、隔离 PostgreSQL→FastAPI→Next→Chromium 10 passed，随后脚本输出本次临时资源均已消失。共享服务及原卷未触碰；更新后的远端 Actions 待推送实测。ENG-04 父任务的完整业务 E2E 与新会话恢复未由本任务覆盖。

远端补验：[Actions #21](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/42357806932) 在 `c4079c3` 上 5 个作业均成功；浏览器作业先运行清理 4 tests，再运行 Chromium 10 tests，日志输出本次临时容器、网络和镜像均不存在，失败附件列表为空。ENG-04D 因此标记 DONE；完整业务 E2E 和新会话恢复仍属 ENG-04 父任务缺口。

## 2026-11-07 ENG-04E 新会话恢复演练

从干净 `1bfd730` 建一次性 `git clone --local --no-hardlinks` 独立克隆；首次非提权克隆因本机 MSYS 命名对象权限失败且未留下目录，随后在获准环境重试成功。仅凭克隆的 Git、AGENTS、HANDOFF/TASKS/STATUS、OPEN_QUESTIONS、CI 和实际测试文件，恢复出当前分支/HEAD、ENG-04D 的远端通过证据、ENG-04 父任务未完及 S3-01 的 Q-03/09 阻断。克隆中 `check_handoff.py` → 61 Task ID/链接通过；实际 10 项 `.real.ts` 用例、清理测试和 `0014` 迁移存在。临时克隆的绝对路径核对后已清理。测试范围审计确认现有合成流程分散于各用例，未贯通同一对象完整纵向链；未来临床审核/冻结目标不能当作现有 Demo 验收。新增 ENG-04F 合成纵向浏览器子任务；本轮只改交接与测试策略文档，无业务代码、数据库或临床规则变更。

## 2026-11-07 ENG-04F 同一对象浏览器纵向流程

从干净 `f6a4793` 继续，复用现有 `real-business.real.ts` 的建档→模拟同意→人工基线/缺失复评→趋势→手工访视→CSV 流程；把原先浏览器内直接 API 插入的训练观察改为页面表单，随后页面录入 RPE 7 并刷新，核对同对象训练序列、访视关联与 CSV 反馈修订。隔离 PostgreSQL/Chromium 首轮 9 passed/1 failed，原因是新增断言要求训练观察表展示动作名称，而实际表仅显示状态、时长、反馈及 RPE；失败截图/trace 留在忽略的合成目录 `exports/eng04b-0b034e6b07fb`。修正为实际列断言后完整复测 10 passed，临时容器/网络/镜像已由脚本核对消失。本机 typecheck 因现有 `node_modules` 缺少测试依赖失败；远端完整依赖 CI 待验收。未改业务代码、数据库、临床阈值或共享服务。

远端补验：[Actions #24](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/42359796120) 在 `94b7b7b` 上整体成功，后端、前端、文档、ML 与 synthetic-browser 五项通过；浏览器日志 4 项清理测试、10 项 Chromium 用例及本次资源已消失，失败附件为空。ENG-04F 标记 DONE；父任务的正式临床流程和冻结研究导出仍未验收。

## 2026-11-07 ENG-04G 早期失败诊断附件

从干净 `e899641` 继续，发现已有合成浏览器失败截图/trace，但附件目录在全部服务启动后才创建；构建、迁移或启动失败时 CI 的 `if-no-files-found: ignore` 可能跳过附件。脚本改为先建本次唯一目录，失败时写入不含命令/密码/页面数据的阶段与异常类型，原始错误和清理流程保留。单测 5 passed、Ruff 通过；未提权受控运行在 buildx 权限处失败，生成 `exports/eng04b-ebdbf7b2d025/failure.txt`，内容只有固定阶段和异常类型，清理核对通过；获准 Docker 环境的完整 Chromium 10 passed、清理核对通过。更新后的远端 CI 尚未运行，失败时 GitHub 上传动作也尚未直接验收；未改共享服务、数据卷或临床规则。

远端补验：[Actions #26](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/42374281253) 在 `9fae4c7` 上 5 个作业均成功，synthetic-browser 先运行 5 项单测，再运行 Chromium 10 项，资源清理日志成功且无失败附件。ENG-04G 的生成端与正常路径因此标记 DONE；红色运行的 GitHub 附件上传仍未直接验证。

## 2026-11-10 DEMO-V2-15 选择合成患者测试卡片

用户实操确认原固定测试卡片可发布但无法选择内容，并明确希望继续合成 Demo。先核对干净 `f5abe1b` 和 Q-03/09/15，建立 `codex/demo-patient-card-selection`。新增两张服务端白名单的非指导合成卡片、医护页面选择和明确演示确认、`0015` 发布事件标题快照、患者当前标题展示；旧无代码发布历史仍可读。后端拒绝未知卡片、未经确认选择及额外视频地址；原权限、模拟同意、活跃绑定、CSRF、版本、幂等、撤回和审计保留。没有视频素材、审核结论或正式训练计划。

测试：后端 Ruff/53 passed、4 skipped；前端 Docker 完整依赖 build/lint/typecheck/25 tests；一次性 PostgreSQL 升级/API 5 passed；隔离 Chromium 10 passed 且临时资源清理成功。Windows 沙箱下 `uv` 缓存与本机不完整 `node_modules` 曾失败，改用项目 `.venv` 和镜像测试，不计为通过。共享本机合成库先 `pg_dump -Fc` 备份到 `exports/local-demo-pre-card-selection-20261110-232050.dump`（SHA-256 `CACBEBB4613DFE722A6FB98DBDB52E4EA70D6154D6DF7C18C301D9A940A64419`），再向前迁移 `0014→0015` 并部署新镜像；对象 9、评估 4、发布 5 行数不变，登录 200、ready 成功。未触碰 Research 或执行 populated downgrade；新分支未推送，远端 CI 未验收。下一患者任务 DEMO-V2-16 待合成视频素材及审核边界；真实患者与正式视频仍受审批。

## 2026-11-10 DEMO-V2-16A 合成视频工程契约

从干净 `ba9edf6` 核对：患者页只有视频待添加，API 固定 `awaiting_review`，仓库无视频文件。本机 `ffmpeg` 不在 PATH，项目 Python 环境无视频编码库；现有隔离测试镜像有 Playwright 包但缺 Chromium 可执行文件。新增合成素材来源/授权/哈希、实际观看、追加核对、发布快照、患者逐次授权和撤回失效的工程契约，更新验收与交接。没有改应用代码、数据库或临床规则，也没有宣称视频可播放。开始时 `check_handoff.py` 通过（66 Task ID）；最终文档检查与 Git 状态见本次提交。DEMO-V2-16 实现等待可核验授权的非指导性合成视频，正式视频仍受 Q-15 阻断。

## 2026-11-11 DEMO-V2-17 合成发布条件提示

从干净 `d029c12` 建立 `codex/demo-publication-readiness`。用户要求跳过视频继续完善；核对实际页面发现缺模拟同意时发布按钮禁用不够明确，缺活跃绑定时只给笼统错误。新增获分配医护的只读、审计、no-store 条件 API；对象页分别显示模拟同意与活跃合成患者绑定，读取失败单独提示，重新检查使用全页刷新。发布 POST 的原有权限/同意/绑定/CSRF/幂等/版本门禁未变，撤回仍可操作；视频、临床规则、数据库模型与共享数据卷未改。

验证：Ruff 通过，后端 pytest 54 passed/4 skipped；本机前端缺 jsdom、@testing-library/react、@playwright/test，Vitest/typecheck 失败不算通过；复用完整依赖隔离镜像 lint/typecheck/27 tests/build 通过。一次性 PostgreSQL→FastAPI→Next→Chromium 10 passed，脚本核对临时容器/网络/镜像清理成功。本机合成站点仅重建前后端，/login 与 /ready 均 200。未推送或运行远端 CI；视频 DEMO-V2-16 仍待合成素材。

## 2026-11-11 ENG-04H 红色远端附件上传验收

从干净 `979cbf4` 建立 `codex/eng04h-failure-artifact`；本机浏览器清理契约 5 tests、交接检查 67 Task ID 通过。用临时工作流步骤生成仅两行合成文字的 `exports/eng04b-eng04h-probe/failure.txt` 并预期退出 1，提交 `ec20180` 到功能分支。[红色 Actions 42936844446](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/42936844446) 中 synthetic-browser 作业按预期失败、附件上传步骤成功，其余四作业通过；下载附件 ID 13818941730 后核对 ZIP 只有 `eng04b-eng04h-probe/failure.txt`，内容为 `stage: controlled upload probe` 与 `error_type: SyntheticProbe`。附件摘要为 sha256:e1f72b90142d56f2b0872d360b452c05f1cac377470cba857777ffedc84e3c47；忽略目录 `exports/eng04h-probe.zip` 留作本机合成证据。

`fc95f45` 移除探针，最终工作流与任务前相同。[正常 Actions 42937146970](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/42937146970) 五作业均成功，真实 Chromium 10 passed，脚本确认本次容器、网络和镜像清理。未改业务代码、数据库或共享本机服务，未合并或推送 main；本分支已推送以运行测试。ENG-04 父任务仍进行中，正式临床流程受审批。

## 2026-11-11 DEMO-V2-18 患者自报完整更正历史

从干净 `7b27d5a` 建立 `codex/demo-patient-report-history`。实际患者历史原只对当前版本显示发生时间与时长，旧版本省略这些事实和更正原因。现将当前及旧修订分别展示发生时间、训练状态、时长或未知、不适及描述、保存时间和更正原因；旧修订按修订号倒序。仅变更患者端展示和测试，不改后端 API、数据库、视频、临床判断或异常处置。

Docker Desktop 起初未运行，启动已安装程序后以完整依赖隔离镜像运行前端 lint/typecheck/28 tests/build，均通过；一次性 PostgreSQL→FastAPI→Next→Chromium 10 passed，包含患者更正后刷新并展开旧版本核对，脚本确认本次临时容器/网络/镜像清理。本机原 Compose 数据库卷保留并重建前端，/login 与 /ready 均 200。后端未修改，本分支未推送或运行远端 CI。下一患者视频任务 DEMO-V2-16 仍待素材，正式临床与真实患者审批未变。

## 2026-11-11 DEMO-V2-19 患者自报北京时间一致性

从干净 `62dd00a` 建立 `codex/demo-patient-report-time`。核对发现历史展示固定北京时间，原更正预填和提交却依设备时区。表单现明确标注北京时间；更正预填与历史一致，新填时间按北京时间转换为带时区瞬时值，未改发生时间的更正保留原始秒数。仅前端和文档；已有行、API、数据库、权限、临床规则与视频状态均未改变。

验证：隔离镜像前端 lint/typecheck/30 tests/build 通过，`TZ=America/Los_Angeles` 下定向组件 3 passed；一次性 PostgreSQL→FastAPI→Next→Chromium 10 passed，脚本核对本次临时容器/网络/镜像已清理；交接检查 70 Task ID 与链接通过，`git diff --check` 通过。本机仅重建前端，`/login` 与 `/ready` 均 200，原数据库卷保留。后端未改，本功能分支未推送或运行远端 CI。下一步可核对工作人员自报时间标注；视频 DEMO-V2-16 继续待素材，真实患者审批不变。

## 2026-11-11 DEMO-V2-20 医护端自报时间区分

从干净 `6af3b9b` 建立 `codex/demo-staff-report-time`。核对医护对象页发现自报发生时间虽已按北京时间格式化，但未标时区，且未显示每条修订的保存时间。现在为每条返回的合成自报修订分别标明北京时间的发生/保存时间，并保留原始 `datetime` 语义；患者端写入、后端接口、权限、数据库和临床处置未变。

验证：隔离镜像前端 lint/typecheck/30 tests/build 通过；一次性 PostgreSQL→FastAPI→Next→Chromium 10 passed，含患者写入/更正后的工作人员展示，临时容器/网络/镜像清理成功；交接脚本和差异检查见本次检查点。本机仅重建前端，`/login` 与 `/ready` 均 200，数据库卷保留。本功能分支未推送或运行远端 CI。下一独立合成候选是工作人员端多条自报修订的当前/旧版分组；视频仍待素材，真实患者审批不变。

## 2026-11-11 DEMO-V2-21 医护端患者自报修订分组

从干净 `350c28f` 建立 `codex/demo-staff-report-history`。核对发现工作人员对象页将同一患者自报的全部修订平铺。现在以报告 ID 分组，最高修订号为当前版，各组按当前版保存时间倒序；旧版折叠并按修订号倒序。继续保留原始事实、北京时间发生/保存时间、未知与零、修订原因及空/读取失败区别；不把旧版计为独立训练，也不增加临床处置。

验证：隔离镜像前端 lint/typecheck/32 tests/build 通过；一次性 PostgreSQL→FastAPI→Next→Chromium 10 passed，含更正后医护端旧版展开，脚本确认本次临时容器/网络/镜像清理；交接检查及差异检查见本次检查点。本机仅重建前端，`/login` 与 `/ready` 均 200，数据库卷保留。后端/API/数据库/权限未改，本功能分支未推送或运行远端 CI。视频继续待素材，真实患者审批不变。

## 2026-11-11 DEMO-V2-22 患者端多条自报排序一致性

从干净 `0067dc9` 建立 `codex/demo-patient-report-order`。核对患者端多条自报沿接口原顺序展示，新保存直接前插，缺稳定排序规则。现以各记录当前修订的保存时间倒序排列，同时间按报告 ID 稳定排序；旧版继续归属原报告。合成患者与医护端排序含义一致，不把发生时间误作保存先后，也不改变写入、权限、数据库或临床处置。

验证：隔离镜像前端 lint/typecheck/33 tests/build 通过；一次性 PostgreSQL→FastAPI→Next→Chromium 10 passed，包含发生较早但保存较晚的第二条报告在患者保存/刷新及医护端排序，脚本确认临时容器/网络/镜像清理；交接检查与差异检查见本次检查点。本机仅重建前端，`/login` 与 `/ready` 均 200，数据库卷保留。本分支未推送或运行远端 CI。视频继续待素材，真实患者审批不变。

## 2026-11-11 ENG-04I 最新合成双端分支远端 CI 验收

从干净 `ce964bc` 的 `codex/demo-patient-report-order` 分支核对 origin 后，仅推送该功能分支以触发既有 GitHub Actions；未改源代码、工作流、main 或共享本机服务。远端同名分支此前不存在；推送的 commit 为 `ce964bc85b826f8c0da34c84df0dbf3ee44e1ab1`。

[Actions 42953445347](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/42953445347) 整体 completed/success，backend、frontend、synthetic-browser、ml、docs 五作业均成功；后端 58 passed、前端 33 tests、浏览器 10 passed、清理契约 5 tests。浏览器日志确认本次一次性容器、网络、镜像已消失，成功运行无失败附件。该证据只针对上述代码提交与合成数据，不代表正式临床或真实患者准入。本次验收文档检查点将保留在本地，是否同步以最终 Git 状态为准。

## 2026-11-11 ENG-04J GitHub Actions Node.js 24 运行时维护

在 `codex/demo-patient-report-order` 的干净检查点 `a42600f` 核对官方 `action.yml`：`checkout@v5`、`setup-node@v5`、`setup-python@v6`、`setup-uv@v7` 和 `upload-artifact@v6` 均声明 `node24`。只将工作流 Action 升级，`setup-node` 加 `package-manager-cache: false` 保持原缓存行为。工作流提交 `2ba611b` 已推送到该功能分支，未动 main。PyYAML 在本机缺失，本地 YAML 解析未运行；`git diff --check`、交接脚本通过。

[Actions 42954953230](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/42954953230) 对 `2ba611b` 完成且成功，五作业均通过；后端 58 passed、前端 33 tests、ML 4 passed、隔离浏览器 10 passed、清理契约 5 tests。本次临时容器/网络/镜像均已消失，五作业日志无 Node.js 20 Action 弃用提示。前端仍有 `punycode` 弃用提示。绿色运行按预期跳过失败附件上传，`upload-artifact@v6` 红色路径待 ENG-04K 复验。未改应用代码、本机站点、数据库或临床规则；本次文档检查点将保留在本地，以最终 Git 状态为准。

## 2026-11-11 ENG-04K Node.js 24 失败附件复验

从干净 `4039eeb` 的 `codex/demo-patient-report-order` 继续；本地清理契约 5 tests、交接检查通过。在 `b392c21` 临时加入仅写两行合成诊断文字并退出 1 的探针。[红色运行 43029229695](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/43029229695) 的探针按预期失败、`upload-artifact@v6` 上传成功，其余四作业通过。下载附件 ID `13860666093` 后断言 ZIP 只有 `eng04b-eng04k-probe/failure.txt`，内容为 `stage: controlled upload probe` 和 `error_type: SyntheticProbe`；SHA-256 `a067f637ba29c765b5532b5f705a77ade2f47a91f83c64ae16fca842fcc3dc08` 与 GitHub 一致。合成证据保留在忽略目录 `exports/eng04k-probe.zip`。

`713ef45` 移除探针并推送，最终工作流与任务前完全相同。[恢复运行 43029483196](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/43029483196) 五作业全部成功；浏览器 10 passed、清理契约 5 tests，日志确认本次临时容器/网络/镜像消失，失败附件列表为空。该验收只证明受控合成失败下的上传，不证明真实数据附件安全。应用代码、本机站点和临床规则未修改，未合并 main；验收文档检查点保留本地，最终状态以 Git 为准。

## 2026-11-11 DEMO-V2-23 合成双端演示操作说明

核对 `frontend/app/participants/[id]/publication-controls.tsx`、患者页面/表单、`frontend/e2e/patient.real.ts` 及现有 PRD/验收后，新增[双端演示操作说明](product/PATIENT_DEMO_WALKTHROUGH.md)：本机准备、医护选择与发布测试卡片、患者查看/自报/更正、医护查阅/撤回，写明页面应出现的结果和按钮灰色时的检查点。文档明确合成卡片不是训练方案、视频仍待添加、自报不触发处置；没有改页面、API、临床规则或数据库。该任务只补操作说明，不将 AT-PAT-02/03 完整标准标为通过。`scripts/check_handoff.py` 通过（77 Task ID、本地链接完整），`git diff --check` 通过；代码测试未重跑。
