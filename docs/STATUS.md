# 实施状态

## 2026-11-07 ENG-04G 早期失败的合成诊断附件

审计发现 `scripts/run_eng04b_browser.py` 原在数据库、API 和前端启动后才创建 `exports/eng04b-*/`，早期构建/迁移/启动失败会让 CI 的 `if-no-files-found: ignore` 跳过附件。现在先以随机 ID 创建独立目录，再执行构建；失败时仅追加固定阶段名及 Python 错误类型到 `failure.txt`，不写命令、密码、页面或患者数据，并保留原异常与资源清理。脚本单测 **5 passed**、Ruff 通过；一次未提权的受控运行在 Docker buildx 权限处失败，确实生成 `exports/eng04b-ebdbf7b2d025/failure.txt`（仅 `build backend image` / `CalledProcessError`），资源清理核对成功；获准环境的完整隔离 PostgreSQL→Chromium **10 passed**，清理核对成功。[远端 Actions #26](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/42374281253) 的 5 个作业均通过，脚本 5 tests、浏览器 10 passed、资源清理成功。既有 GitHub `upload-artifact` 在红色运行时是否实际上传仍未验证；绿色运行没有失败附件属预期。无业务 API、数据库、临床规则或原共享卷修改。

## 2026-11-07 ENG-04F 同一合成对象纵向浏览器回归

在现有 `frontend/e2e/real-business.real.ts` 的同一对象流程中，原先通过浏览器内直接 API 调用插入的训练观察改为实际页面表单录入，并通过反馈页面追加 RPE 7。刷新后核对训练观察序列的部分完成、未知时长、已录入反馈和 RPE；随后手工访视关联这条已发生训练、复评缺失、访视更正与历史，以及单对象 CSV 中的训练反馈修订。首轮隔离 Chromium **9 passed/1 failed**：测试错误地要求训练观察序列表显示动作名称，实际表格只呈现状态/时长/反馈/RPE；失败合成附件留在忽略目录 `exports/eng04b-0b034e6b07fb`。改为核对实际列后完整复跑 **10 passed**，脚本确认本次临时容器/网络/镜像消失。Windows 本地 `pnpm --dir frontend typecheck` 因现有 `node_modules` 缺少 `@playwright/test` 和 `@testing-library/react` 失败，未将其记作本地通过；[远端 Actions #24](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/42359796120) 的完整依赖环境中后端/前端/文档/ML/浏览器五项均通过，浏览器 10 passed、资源清理成功、失败附件为空。没有改业务 API、数据库、临床规则或共享服务。

## 2026-11-07 ENG-04E 新会话恢复演练与浏览器范围核对

从干净 `1bfd730` 创建一次性独立本地克隆，只依靠克隆中的 Git、交接文档、台账、问题清单和实际文件恢复状态。克隆分支/HEAD/工作区与交接一致；`python scripts/check_handoff.py` 通过（61 Task ID、本地链接）；实际有 10 项 `.real.ts` 浏览器用例、`ENG-04D` 清理测试和 `0014` 迁移。恢复出 ENG-04D 已完成、ENG-04 父任务仍 IN_PROGRESS、S3-01 因 Q-03/09 阻断；临时克隆已按核对路径清理。覆盖审计确认现有用例分别验证合成建档/评估、训练/反馈、周期、趋势和导出，却未在同一对象的一次浏览器用例中串起整条纵向链；正式临床审核、方案训练、冻结研究快照仍受未决审批。新增 `ENG-04F` 作为可执行的合成纵向浏览器回归；不把未来临床 E2E 目标记作当前已通过。本轮无应用代码、数据库或临床规则修改。

## 2026-11-07 ENG-04D 隔离浏览器资源清理核对

ENG-04C 的远端通过日志只证明脚本走到 `finally`，不能证明本次容器/网络/镜像实际消失。`scripts/run_eng04b_browser.py` 现在逐项查询并按本次唯一名称核对残留；资源仍在或 Docker 查询失败会令作业失败，原浏览器错误仍保留为主错误并附清理说明。`.github/workflows/ci.yaml` 增加清理契约单测。本地 4 项 `unittest` 与 Ruff 通过，一次性 PostgreSQL→FastAPI→Next→Chromium **10 passed**，脚本输出清理核对成功；[远端 Actions #21](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/42357806932) 的 5 个作业均通过，清理 4 tests、浏览器 10 passed 且输出资源已消失，失败附件为空。未操作共享服务或原有数据卷；`ENG-04` 父任务仍有完整业务 E2E 和新会话恢复范围待核对。

## 2026-11-07 ENG-04C 隔离浏览器门禁接入 CI

远端补验：经用户明确授权，仅将功能分支 `codex/real-01b0-synthetic-profile-revisions` 的 `9dc13ef` 推送到 origin；[GitHub Actions push 运行 #19](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/42356649612) 中 backend、frontend、synthetic-browser、docs、ml 五项均通过。浏览器作业日志显示一次性 PostgreSQL 迁移及真实 Chromium **10 passed**，作业成功；失败附件列表为空。脚本的 `finally` 会停止任务容器并移除网络/镜像，但远端日志没有独立的清理后残留核对，因此远端资源清理仅有脚本执行路径证据。本次未创建 PR，未合并或推送 main。下段保留首次本地验收时的原始记录。

核对实际 CI 后确认 `.github/workflows/ci.yaml` 只有后端、前端、ML 和文档任务，虽然 `scripts/run_eng04b_browser.py` 已能启动一次性 PostgreSQL→FastAPI→Next→Chromium 并运行 10 个真实浏览器用例，但之前没有自动执行。新增独立 `synthetic-browser` job，在 push/PR 上运行现有脚本；仅授予仓库读取权限，失败时把 `exports/eng04b-*/` 的合成附件（含隐藏状态文件）保留 7 天。脚本自身在 finally 清理任务容器、网络和镜像；原共享服务不受影响。本地完整脚本复跑 10 passed，核对无残留 `taiji-eng04b` 容器/网络；工作流 YAML 使用临时 PyYAML 解析并核对任务和附件路径。远端 GitHub Actions **尚未运行**，需分支推送或 PR 后才能验收实际 CI 结果。本轮未改业务代码、临床规则或已有数据卷，未推送。

## 2026-11-07 ENG-02C 手工周期关联训练事实展示

核对实际代码后发现 E0 已显示手工周期/最新访视、关联评估当前值、关联训练次数与修订历史；台账原 ENG-02C 范围因此收窄。对象页现在对最新访视逐条展示已关联训练的完成状态、实际分钟、最新反馈状态及 RPE，复用既有同对象授权 `training-timeline` 数据；缺失关联或读取失败明确显示详情不可用，不推断训练发生、完成或安全。旧访视版本不回填当前训练状态，且不计算没有获批计划分母的完成率。无后端 API、数据库或临床规则修改。修改前后端基线 Ruff/53 passed、4 skipped；前端完整依赖容器 build/lint/typecheck/25 tests 通过；隔离 tmpfs PostgreSQL→FastAPI→Next→Chromium 10 passed，含访视创建、更正、刷新、关联训练未知时长/RPE及跨研究拒绝。临时容器、网络和本次门禁镜像已清理，原共享服务保留；未部署共享网站、未推送。

## 2026-11-07 ENG-02B 合成训练观察只读序列

对象页新增 PostgreSQL 支撑的训练观察序列表，按发生时间和 ID 排序，显示已录入会话的完成状态、实际分钟、最新反馈状态与 RPE。无反馈、最新反馈缺失和未录入时长均保留未知；确实记录的 0 分钟显示为 0。接口沿用工作人员角色、研究和对象权限，读取留审计、响应禁缓存；不暴露自由文本，不计算没有计划分母的完成率或临床/疗效结论。见 [ADR-0021](decisions/0021-observed-training-timeline-no-rate.md)。修改前后端基线 Ruff/52 passed、4 skipped；修改后 Ruff/53 passed、4 skipped，API 契约快照同步；一次性 tmpfs PostgreSQL 迁移与 5 项集成测试通过；隔离 Chromium 10 passed，包含 0 分钟、无反馈、RPE 更正/刷新和跨研究 403；前端完整依赖容器 build/lint/typecheck/24 tests 通过。隔离容器、网络和本次门禁镜像已清理，原有共享服务保持运行。未改数据库迁移、共享数据卷、临床规则或真实数据准入；未部署共享网站、未推送。

## 2026-11-07 REAL-01F4 合成模拟同意与筛查历史导出

单对象实时 Demo CSV 增加 `synthetic_consent_record` 与 `synthetic_screening_record`，逐条保留模拟同意决定/编码/照片范围以及筛查条目/yes-no-unknown 原始答案、合成来源、人员和记录时间。更正原因与任何真实签署信息排除；未导出筛查“安全”或入组结论。原有服务器端角色/研究/对象权限、审计、行数/哈希、`live-demo` 标记不变。修改前后端基线 Ruff/52 passed、4 skipped；修改后 Ruff/52 passed、4 skipped；一次性 tmpfs PostgreSQL 迁移及 5 项集成测试通过，核对同意撤回、同条目筛查更正、撤回后写入拒绝、28 行/哈希与脱敏；隔离 Chromium 10 passed，含实际 CSV 下载；前端完整依赖容器 build/lint/typecheck/24 tests 通过。隔离容器、网络和本次门禁镜像已清理；原有共享服务保持运行。未改临床规则、已有共享卷或真实数据准入；未部署共享网站、未推送。

## 2026-11-07 REAL-01C0 人工多指标契约

完成 [录入契约](product/MANUAL_METRICS_CONTRACT.md)，核对当前请求/响应只支持 SPPB 总分、确认耦合 Demo 分级、趋势/CSV 读取旧评估版本。首批设计为四种人工原始观察及追加更正；FRAIL 版本和分项计分继续待批准。本轮仅设计，未新增多指标 API、数据库或页面。后端 Ruff 通过，现有人工评估测试 5 passed；前端/浏览器未运行。下一项 REAL-01C1 实现此合成子集，父任务 REAL-01C 保持 IN_PROGRESS。

## 2026-11-06 REAL-01B0 合成展示资料可追溯更正

从干净 `7369690` 建立 `codex/real-01b0-synthetic-profile-revisions`。原演示档案资料只有一次创建和当前读取，无法更正；新增 `0013_demo_profile_revisions` 与对象页表单，年龄/性别/辅助信息/备注以完整快照追加版本，需预期版本、`SYN-` 更正原因、CSRF、幂等和原有研究/对象写权限。旧初始行保持不变，缺少创建人/时间的旧记录明确标为来源未知；当前读取投影最新版本，修订历史显示全部版本。无真实身份映射、正式同意签署或临床判断；REAL-01B 父任务仍 IN_PROGRESS。见 [ADR-0020](decisions/0020-synthetic-profile-revisions.md)。

验证：后端 Ruff、pytest **51 passed / 4 opt-in skipped**；前端隔离 Docker 生产构建、lint、typecheck、**24 tests** 通过；一次性 PostgreSQL 迁移升/空库降/升、Alembic check 和旧业务 API **5 passed**。隔离 PostgreSQL→FastAPI→Next→Chromium 最终 **10 passed**。浏览器首次运行 9 passed/1 failed，原因是测试定位同时匹配当前值和历史列表项；限定历史列表后完整复测通过。失败附件保留在忽略目录 `exports/eng04b-cef3da0f8cda`，脚本已清理临时容器、网络和镜像。现有共享 Demo 服务及临时外网网址未部署本分支。

## 2026-11-06 REAL-01A0 合成工作人员管理

从干净 `9e9544a` 建立 `codex/real-01a-synthetic-staff-admin`。新增仅 Demo 可用的管理员 API 和中文 `/admin` 页面：建立 `demo-…@example.org` 工作人员、改角色、启停账号、分配/撤销 `SYN-` 研究和编号对象权限。变更写入追加式历史及操作审计；研究撤权连带撤销对象权限，停用/改角色注销现有会话。默认种子不创建管理员，仅显式 `SEED_DEMO_ADMIN=true` 的本地合成环境创建；种子重跑不会恢复有撤权事件的默认分配。没有真实身份导入、临床处方权限或 Research 准入，REAL-01A 父任务仍进行中。见 [ADR-0019](decisions/0019-opt-in-synthetic-staff-admin.md)。

验证：后端 Ruff、pytest **49 passed / 4 opt-in skipped**；新增授权/撤权、活跃会话失效和种子重跑测试通过。前端隔离 Docker 生产构建、lint、typecheck、**24 tests** 通过。一次性 PostgreSQL 迁移升/空库降/升、Alembic check 和旧业务 API **5 passed**。隔离 PostgreSQL→FastAPI→Next→Chromium **9 passed**，包含管理员创建、授权、撤权、停用与刷新持久化；脚本清理了临时容器、网络和任务镜像。浏览器首轮在异步点击后未等待保存，第二轮刷新后误选列表首位账号，均为测试定位问题；修正等待与目标选择后完整复测 9 passed。失败附件保留在忽略目录 `exports/eng04b-8b61b20fb331` 和 `exports/eng04b-962db3f160aa`。现有共享演示服务与临时外网网址未部署本分支。

## 2026-11-06 REAL-01E0 手工合成周期与访视

从干净 `67d3626` 建立 `codex/real-01e0-synthetic-cycles`。新增 `0011_synthetic_cycles` 迁移、手工命名周期与追加式访视版本、对已有评估/训练观察的同对象关联检查；对象页可创建、更正并查看历史和关联评估当前值，刷新从 PostgreSQL 取回。未知、未到、拒测、未测分别显示；不自动生成访视日程、完成率或临床结论。取舍见 [ADR-0018](decisions/0018-manual-synthetic-cycle-grouping.md)。REAL-01E0 合成工程范围完成；Q-05、正式方案/冻结快照和真实数据准入未完成。

验证：后端 Ruff、pytest **47 passed / 4 opt-in skipped**；前端隔离 Docker lint/typecheck/**24 tests**/生产构建；一次性 PostgreSQL 迁移升/空库降/升、Alembic check 与旧业务 API **5 passed**；隔离 PostgreSQL→FastAPI→Next→Chromium 最终 **8 passed**，含评估和训练观察关联、访视更正、关联评估当前值及刷新持久。首次浏览器运行因“修订历史”测试定位歧义而 1 failed/7 passed；新增当前值断言后又因测试按下拉序号选到基线而 1 failed/7 passed。两处测试选择器修正后完整 8 passed。失败附件留在忽略目录 `exports/eng04b-bb46b75cf610` 和 `exports/eng04b-0f4e39d44f59`；测试容器、网络和任务镜像已由脚本清理。共享本机演示服务及临时外网网站尚未部署本分支。

## 2026-11-05 DEMO-V2-13 合成患者训练与不适自报

在 `codex/demo-patient-report` 新增 `0010_demo_patient_report` 追加式修订表，独立于医护 `training_sessions`。活跃合成绑定的患者仅能查看和写入本人记录；新写入需当前模拟同意、CSRF、幂等键和预期版本，更正另需 `SYN-` 原因。训练情况、不适情况明确区分“有/无/未知”，无记录和空时长保持未知。获研究及对象分配的工作人员可只读查看各版本；原编号化 CSV 不包含不适自由文本。没有自动风险分级、通知或处置时限。AT-PAT-03 仅完成合成工程子集；真实患者接入及 Q-04/Q-07/Q-14 继续阻断。

验证：后端 Ruff 与 pytest **46 passed / 4 opt-in skipped**；前端隔离 Docker lint/typecheck/**24 tests**/生产构建；隔离 PostgreSQL→FastAPI→Next→Chromium **8 passed**，患者录入、更正、刷新和工作人员查看在浏览器通过；另一临时 PostgreSQL 迁移升/空库降/升、Alembic check 和旧业务 API **5 passed**。Windows 本机前端依赖目录不完整，故本机 typecheck/test 失败；隔离镜像安装锁文件完整依赖后通过。共享演示服务和临时外网网址未部署本分支。下一独立任务仍为工作人员路线 `REAL-01E0`；患者正式内容/视频与真实试点依赖临床和机构批准。

## 2026-11-05 DEMO-V2-12 合成发布/撤回流程

在 `codex/demo-patient-publication` 新增 `0009_demo_patient_publication` 追加式事件表。获对象授权的医护可以为活跃绑定、当前模拟同意的 `SYN-` 对象发布固定“没有可执行训练计划”的测试卡片，或撤回；要求 CSRF、幂等键、预期版本并审计。患者只见本人当前已发布且模拟同意有效的卡片；视频区域明确待添加，不接受动作、剂量、视频 URL 或临床内容。原工作人员 Demo 方案不会自动投影给患者。真实医护确认计划、审核视频和患者训练/不适录入仍未实现，AT-PAT-02 仅完成合成流程子集，Q-03/Q-09/Q-15 与真实患者准入继续阻断。

验证：后端 Ruff/pytest **45 passed / 4 opt-in skipped**；前端隔离 Docker lint/typecheck/**24 tests**/生产构建；临时 PostgreSQL 迁移升/空库降/升与 Alembic check、旧业务 API **5 passed**；隔离 PostgreSQL→FastAPI→Next→Chromium **8 passed**，含患者本人可见、医护发布/撤回、视频待添加及绑定撤销。首次集成运行揭示三个旧测试硬编码 `0007`，已改为核对当前 Alembic head，复测 5 passed。现有共享演示数据库和临时外网网站未部署本分支。下一项 `DEMO-V2-13` 合成患者训练事实/不适记录；原工作人员路线 `REAL-01E0` 不变。

## 2026-11-05 DEMO-V2-11 合成患者入口

在 `codex/demo-patient-self-scope` 实现合成患者账号、`SYN-001` 单人绑定、独立 `/patient` 页面、本人编号 API 和分配医护撤销 API。患者角色不能进入工作人员研究/对象/导出/Demo 方案 API；撤销立即使现有患者会话失效，种子不会重新激活绑定。页面明确说明经医护发布的计划/视频和患者训练/不适录入尚未实现；没有自动向患者下发 Demo 方案。真实患者身份、数据和临床使用仍受原审批门禁阻断。

验证：后端 Ruff 通过、pytest **44 passed / 4 opt-in skipped**；临时 PostgreSQL `0008` 升/空库降/升和 Alembic check 通过；前端隔离 Docker lint/typecheck/**23 tests**/生产构建通过。独立测试网络中的 Next/FastAPI/PostgreSQL 浏览器手工核对患者登录、本人编号、工作人员页转向；工作人员撤销返回 204，患者原会话刷新回登录页，再次登录显示拒绝。交接脚本通过（49 Task ID、链接完整），`git diff --check` 通过。`frontend/e2e/patient.real.ts` 已写但自动 Chromium 镜像构建时 Debian apt 下载失败，故**自动浏览器用例未运行**。测试容器、网络和本任务镜像已清理；现有本机共享演示站点未部署本分支，原临时网址仍是旧版本。下一合成任务可做 `DEMO-V2-12` 的无临床内容发布骨架，临床内容 Q-03/Q-09 仍阻断；`DEMO-V2-13` 的事实录入也可独立推进。原工作人员路线 `REAL-01E0` 不变。

## 2026-11-05 双端平台产品方向旧检查点（DEMO-V2-10）

用户确认未来为现有工作人员工作台增加患者端，第一版患者只查看医护确认的本人计划/审核视频，并记录训练与不适；不自行填写评估量表、不直接接收系统生成建议。已更新 PRD/SCOPE/ROADMAP、ADR-0015、验收/任务/待决问题。代码检查显示目前只有工作人员角色与研究/对象范围授权；患者账号、本人绑定、患者页面、医护发布计划及实际视频均不存在。本次为文档范围变更，没有实现患者端、没有改变临床分级/安全规则或打开真实数据准入。`scripts/check_handoff.py` 通过（49 Task ID、链接完整），`git diff --check` 通过；代码测试未运行。下一可执行合成工程任务 `DEMO-V2-11`；真实患者试点 `DEMO-V2-14` 阻断。

## 2026-11-05 临时隧道 1033 恢复

原临时地址出现 Cloudflare 1033；本机登录页仍为 200，旧隧道容器日志显示 QUIC 连续超时，外网检查为 530。已停止旧 `taiji-demo-quick-tunnel` 容器（保留容器，不删除），另建固定使用 HTTP/2 的 `taiji-demo-http2-tunnel`，新地址为 `https://shopper-fathers-tunes-irc.trycloudflare.com/login`。修改本机被 Git 忽略的 `.env` 公开地址前，另存可恢复副本 `.env.backup-20261105-http2`；仅重建后端容器以应用新地址。

恢复验证：新外网登录页 200；新外网/本机同源无效测试凭据均 401；后端 ready 200。未提交有效演示密码到外网，完整账号登录仍待使用者实测。Quick Tunnel 仍无持续在线保证，旧链接不应再分发。

## 2026-11-05 DEMO-V2-09 临时分享链接

按用户要求，通过独立 `cloudflare/cloudflared` 容器把当前合成演示前端暴露为临时 HTTPS 链接 `https://typically-playing-seeking-reverse.trycloudflare.com/login`。后端仍在本机 Demo 配置，数据库端口未公开。为避免此前切换公开地址导致本机登录 403，`check_origin` 在 `APP_ENV=local/test` 时仅额外接受显式 `APP_LOCAL_URL`；非 local/test 不接受该额外地址。Compose 明确配置本机 `127.0.0.1:3000`。公开域名保存在本机被 Git 忽略的 `.env`，修改前另存 `.env.backup-20261105-tunnel`，未提交任何密码或配置副本。

验证：后端 pytest 43 passed/4 opt-in skipped（含认证测试 11 passed），Ruff 与 Compose config 通过；外网 `/login` 200，外网同源及本机同源以无效测试凭据均返回 401，后端 ready 200。未用有效账号经过外网测试；临时 Cloudflare 域名依赖本机、Docker 与隧道容器持续运行，且不保证稳定或固定。真实数据及临床审批边界不变。

## 2026-11-05 本机登录来源修复

浅色前端上线后，本机 `127.0.0.1:3000` 登录返回 403，原因是运行中的后端仍将 `APP_PUBLIC_URL` 指向先前临时分享域名；凭据尚未进入校验。将被 Git 忽略的本机 `.env` 中公开地址改为 `http://127.0.0.1:3000`，修改前在同目录保存可恢复副本 `.env.backup-20261105-login`；仅重建后端容器，不改数据库/源代码。验证：API ready 200，本机同源错误测试账号返回 401、异源返回 403。未使用或显示真实演示密码，尚未以有效账号做完整登录验收。旧临时分享域名不再是此后端的允许登录来源。

## 2026-11-05 DEMO-V2-08 明亮界面与练习视频区域

本地分支 `codex/demo-light-video-slot` 将前端统一改为浅米白与鼠尾草绿配色；动作详情弹窗及训练当前动作加入 16:9 视频区域。用户尚未提供视频素材，页面明确显示“动作视频待添加”，不加载虚构视频；原生播放控件仅作为未来接入已审核本地素材的入口。无数据库、后端 API、分级阈值或安全规则变更。正式临床审批仍受 S3-01/Q-03/Q-09 阻断。

验证：隔离 Docker 前端生产构建、lint、typecheck、23/23 组件测试通过；独立预览及本机运行站点登录页经浏览器视觉核对。部署时发现原生产镜像的 Next.js 只监听容器主机名，映射端口返回 502；在前端 Dockerfile 显式设置 `HOSTNAME=0.0.0.0` 后，容器内、本机 `curl --noproxy` 和浏览器均返回 200。PowerShell `Invoke-WebRequest` 经本机代理仍返回 502，不作为站点可用性证据。由于本机 `node_modules` 缺少现有测试依赖，宿主机 typecheck 未通过，故以 Docker 完整依赖环境结果为准。尚未验证真实视频播放，因无视频素材。

## 2026-11-01 DEMO-V2 最新检查点

独立合成、数据库驱动的太极训练演示已实现：账号登录→编号对象/显式模拟同意→人工 SPPB 确认→`demo-rule-v1` 分级→I/II/III 展示方案与 12 条动作库→训练状态→既有训练观察/反馈→完成或中止。IV/缺失无自动自主训练组合；所有结果标记 `DEMO_ONLY`，不解除 S3-01/Q-03/Q-09 的临床阻断。原有 REAL/ENG/S 台账状态不因此升级。详见 [DEMO-V2 用户流程](product/DEMO_USER_FLOW.md)、[ADR-0014](decisions/0014-isolated-demo-rule-and-run.md)。

本次新增 `0006_demo_v2` 和 `0007_demo_completed_actions` 两个增量迁移，未重建数据库或改写旧业务表。本机已有 `infra_pgdata` 在变更前为 4 个 `SYN-` 对象、Alembic `0004_manual_assessments`；先备份到忽略目录 `exports/demo-v2-pre.dump`，再向前迁移、幂等写入 12 条动作。最终本机 head `0007_demo_completed_actions`，旧 4 对象仍在，动作 12 条，新增完成动作列存在。服务 `http://127.0.0.1:3000/login` 和 `http://127.0.0.1:8000/ready` 均实测 200。本机现有 `.env` 演示密码与种子验证一致；不记录密码。Research 服务/库未启动。

验证记录：后端 Ruff 通过、pytest **42 passed / 4 opt-in skipped**、OpenAPI 快照同步；临时 PostgreSQL 迁移升/降/升及旧 API **5 passed**；前端 Node 26 容器 lint/typecheck/**21 tests**/build；临时 PostgreSQL→FastAPI→Next→Chromium **7 passed**（含原有业务、8/5 分映射、动作库、暂停/恢复、实际完成动作/反馈/中止、刷新和越权）。远端 CI 未运行。对现有合成卷仅执行备份、向前迁移及幂等动作种子；未删除数据或触碰 Research。

## 2026-10-31 REAL-01 当前检查点（以下为最新状态）

项目目标现为数据库驱动的医疗研究人员工作台；**开发和自动化验证仍仅使用合成数据**。真实患者数据接入、Research 业务访问及生产部署尚未获仓库内证据批准。REAL-01 纵向闭环尚未完成；旧版 Sprint/ENG 状态记录留在下方作为历史证据，涉及“下一步”的旧叙述已被本节及 [HANDOFF](HANDOFF.md) 取代。

| 范围 | 状态 | 实际证据 / 缺口 |
|---|---|---|
| REAL-01P Demo/Research 准入隔离 | DONE | `APP_PROFILE` 白名单式 Demo 准入；Research 独立 Compose 项目、PostgreSQL 卷/账号/配置/私网；业务 API、ready、演示种子和 Alembic 迁移审批前拒绝。改 `ALLOW_SYNTHETIC_ONLY=false` 不会打开 Research。 |
| REAL-01A/B/C | IN_PROGRESS | REAL-01A0 合成人员授权和 REAL-01B0 合成展示资料更正已完成工程子集；真实身份/同意、完整档案字段与其他量表未完成。 |
| REAL-01D0 | DONE | `0005_training_observations`、训练会话/反馈修订/事件表及 API；对象页、反馈页和可独立上报事件的表单。只记录已发生观察；无周期/规则关联、处方或事件处置闭环，见 [ADR-0012](decisions/0012-training-observation-before-cycle.md)。 |
| REAL-01F0 | DONE | 对象页可下载实时编号化 CSV；按服务器端角色/研究/对象隔离，读取评估和反馈全部修订、训练会话与事件存在事实；不含身份或自由文本，附行数/SHA-256 和审计。不是冻结快照，见 [ADR-0013](decisions/0013-live-coded-demo-export.md)。 |
| REAL-01D/E/F | NOT_STARTED | 正式周期/规则关联训练、研究周期/快照、完整研究工作台与编号化导出尚未实现；已有人工总分趋势及 D0 非临床观察子集。 |
| S3-01 | BLOCKED | Q-03 适配模板/禁忌/剂量及 Q-09 发布责任人未获有权签核。不得把候选建议当临床处方。 |

本检查点实测：`backend: uv run ruff check .` 通过，`uv run pytest -q` **32 passed / 4 opt-in skipped**；`scripts/run_eng04_integration.py` 在临时 PostgreSQL 上执行迁移升/降/升、Alembic check 和 **5 个真实 API 测试**；前端 Node 26 容器 lint/typecheck、**21 tests**、build 通过；`scripts/run_eng04b_browser.py` 临时 PostgreSQL→FastAPI→Next→Chromium **4 passed**，覆盖建档/评估/复评、D0 训练/事件/更正/刷新/越权与 F0 CSV 下载。ENG-04B 旧场景首次运行曾因测试导航竞态失败，补明确 URL 等待后复测通过。Demo 与 Research Compose `config --quiet` 均通过。Research 数据库未启动/迁移，原有数据库卷未操作；远端 CI 未运行。下一任务见 [HANDOFF](HANDOFF.md)。

更新：2026-10-31；当前阶段：Sprint 2 合成手工评估范围 `IN_PROGRESS`，S2-01 与独立 P1 的 S6-01 合成演示壳、S6-02 模拟 API 浏览器验收本地完成。开发负责人授权独立非临床工程任务 ENG-01 至 ENG-04；`ENG-04A` 临时 PostgreSQL/API 门禁、`ENG-01A` 合成复评夹具、`ENG-02A` 对象级人工总分趋势及 `ENG-03A` 离线合成质量/切分本地完成，ENG-01/02/03/04 父任务仍进行中。Sprint 1 完整受试者 CRUD、真实同意和获批准筛查流程仍未完成。本仓库只可用于合成数据开发；临床、伦理、真实数据和生产部署均未获本仓库文件证明批准。

| 范围 | 状态 | 证据与限制 |
|---|---|---|
| Sprint 0 前后端骨架 | DONE | Next.js 构建、lint/typecheck、Vitest 2 tests；FastAPI Ruff、pytest 2 tests；容器 HTTP 冒烟 200 |
| PostgreSQL / Alembic / Compose | DONE | PostgreSQL 17 健康；空库 `upgrade head → current → downgrade base → upgrade head` 成功；`/ready` 返回 ready；Compose config 成功 |
| CI 配置 | DONE | `.github/workflows/ci.yaml` 已配置；同等本地命令已执行。GitHub Actions 远端运行尚未发生，待 PR 验证 |
| 持久交接 | DONE | 任务台账、HANDOFF、追加日志、Prompt、ADR、恢复演练；`scripts/check_handoff.py` 通过 |
| S1-01 身份和编码只读授权 | DONE | Argon2 员工登录、持久会话、CSRF 注销、限流、研究及对象双重分配、审计；本地测试与容器烟测通过 |
| S1-02 合成建档/模拟同意/筛查 | DONE | `SYN-` 编号创建与列表、追加式同意/三态筛查、当前同意门禁、未知/待复核状态、权限和审计；本地测试、PostgreSQL 及页面烟测通过 |
| S2-01 合成人工 SPPB 总分评估 | DONE | 基线/复评草稿、有效/缺失/无效总分、追加历史、更正理由与临床角色确认；权限、模拟同意、CSRF、幂等、审计；本地单测、迁移、PostgreSQL 和页面烟测通过。FR-003/AT-01/02 仅录入部分 |
| S6-01 合成姿态演示壳 | DONE | 已授权对象可打开合成 SVG 预览页；“姿态识别算法尚未接入”；无摄像头、文件选择、上传、保存或评分。AT-12 仅合成部分；真实影像和浏览器手工 E2E 未验收 |
| S6-02 合成姿态页浏览器验收 | DONE | Playwright/Chromium 3 场景通过，覆盖未登录、模拟 API 拒绝未分配对象、合成 SVG 交互和无摄像头/写请求；模拟 API 非真实 PostgreSQL 集成验收 |
| ENG-04A 真实数据库测试门禁 | DONE | 临时 tmpfs PostgreSQL 17 迁移升/check/降/升，合成建档至人工复评真实数据库 API 测试；OpenAPI 快照比较；CI 配置同等隔离数据库序列；交接脚本识别 ENG ID。远端 CI 待 PR |
| ENG-01A 合成复评夹具 | DONE | 两名 SYN-ENG01A 编号对象的模拟同意、未知/未记录筛查、人工基线/复评、缺失和更正历史；重复运行不添加、更改夹具时拒绝覆盖；SQLite 和临时 PostgreSQL API 验证 |
| ENG-02A 人工总分趋势 | DONE | 按对象授权的只读数据库投影，最新已确认与待确认草稿分开；页面显示基线/复评登记顺序、零分、缺失/无效且不画虚假分值；真实 PostgreSQL→API→Next 页面烟测通过 |
| ENG-03A 合成离线质量/切分 | DONE | 固定种子 18 名虚构对象、36 条原始记录；质量报告区分零/空值与缺失原因、拒绝重复/非合成结构错误；对象级三集合隔离、哈希清单与拒绝覆盖；无疗效标签/模型 |
| ENG-01/02/03/04 其余范围 | IN_PROGRESS | 完整 Demo、训练完成率/RPE/周期趋势、V0/候选评估仍未实现；ENG-04 父任务仍需完整业务浏览器 E2E 与新会话实际恢复，详见 TASKS |
| FR-004 至 FR-011 后续业务功能 | NOT_STARTED | 无分级、建议、训练、周期或导出 API；AT-01 导出与 AT-02 分级边界未实现；见 `TASKS.md` |
| 真实数据/临床上线 | BLOCKED | Q-01 至 Q-13 待相应负责人签核；见 `OPEN_QUESTIONS.md` |

## 最近实测结果

- 2026-10-31 ENG-03A：从干净的 `e8eaca1ebdc354e117c7681b3585197de4679a3d` 检查点复核 Git、交接、ENG-02A 趋势代码与设计；该任务相关后端 pytest 3 passed/1 opt-in skipped、交接校验 22 ID 通过。新增独立 `ml/` 锁定项目和纯合成离线生成器，不读取业务数据库；固定种子输出 18 个虚构对象的 36 条记录，`quality.json` 报告 29 valid、3 missing、2 invalid、2 unrecorded，空值 7、确有零分 3、重复 ID 0；`manifest.json` 明示 `target=null`、`clinical_use=false`，记录 SHA-256 `c446f04f23ff0453a28a1426716288f34f5cb3e889ded875f7cfcd4d11e5bd96`。命令行重复导出哈希一致；单测覆盖不同内容拒绝覆盖、缺失/重复/非合成错误和对象跨 train/validation/test 泄漏拒绝。首轮 ML Ruff 有格式问题，修复后 `uv sync --frozen`、`uv run ruff check .` 与 pytest 4 passed；后端 Ruff/pytest 27 passed/2 opt-in skipped；交接脚本 23 ID/仓库链接与 `git diff --check` 通过。新增 CI 作业，远端 CI 尚未运行。无模型训练、真实数据快照、疗效标签、临床规则或数据库迁移。
- 2026-10-31 ENG-02A：从干净的 `888d2488c2e12bb47fa58367d256356b87bc2d84` 检查点复核 Git、交接、现有种子/API 和未决问题后实施。只读 API 在服务端检查角色、研究及对象分配并审计；每项评估同时返回最新版本与最新已确认版本，页面只为确认且有效的人工总分绘制 0–12 图示，草稿、缺失、无效及零分分别显示；按登记时间排序，不推断疗效或批准的周期。首轮 Ruff 有 1 处过长行，修复后 `uv run ruff check .` 通过；`uv run pytest -q` → 27 passed/2 opt-in skipped；独立临时 PostgreSQL 17 迁移升/check/降/升与 API 3 passed；前端 Node 26/pnpm 10 容器 lint/typecheck/test 15/build 通过。独立 tmpfs PostgreSQL→FastAPI→Next 全栈烟测（最终加强图示断言后复跑）：`SYN-ENG01A-001/002` 页面实际显示数据库总分、缺失及 `meter`，跨研究页面 404；所有临时容器/网络已停止，原合成卷未操作。交接脚本通过（22 Task ID、仓库内链接），`git diff --check` 通过。远端 CI、临床人工验收未运行；pytest 有上游 TestClient 弃用警告 1 条。
- 2026-10-31 ENG-01A：从干净的 ENG-04A 检查点 `2357fe7` 接续；新增仅 `local` 且合成模式可运行的可选种子。`SYN-ENG01A-001/002` 两名虚构编号对象含已授予的模拟同意，一人筛查 `unknown`、另一人未筛查；人工基线/复评含有效零分、缺失、追加更正。种子二次运行核验完整既有数据，任何夹具偏离或部分存在均拒绝覆盖；不生成等级、疗效结论或训练建议。后端 Ruff 通过、普通 pytest 25 passed/2 skipped；独立 tmpfs PostgreSQL 17 迁移升→check→降→升后 3 passed（现有工作流 1、夹具 SQLite 1、夹具 PostgreSQL 1），容器停止，未操作原卷。交接脚本通过（22 Task ID、本地链接），`git diff --check` 通过。前端与远端 CI 本任务未运行；Starlette TestClient 上游弃用警告 1 条。
- 2026-10-31 ENG-04A：从干净的 `e5d7a5865a0c6354c57ce857046da347e1aa75d3` 和仓库资料恢复，新增 ENG-01 至 ENG-04 及非临床可验收子任务。临时 PostgreSQL 17 容器使用独立 `taiji_eng04` 库与 tmpfs，`upgrade head → alembic check → downgrade base → upgrade head` 通过；真实 PostgreSQL API 测试通过合成建档、模拟同意/筛查、人工基线/复评、零分与缺失区分、修订持久化、跨研究/同研究未分配对象及分析员拒绝、审计。容器已停止，未触碰原合成数据卷。后端 Ruff 通过（新增同研究权限断言后曾报 1 处过长行，修复后复跑通过）；普通 pytest 24 passed、1 skipped（隔离库测试仅显式启用）；单独 PostgreSQL 测试 1 passed；OpenAPI 快照比较包含于常规 pytest。交接脚本通过：22 Task ID、本地 Markdown 链接完整；`git diff --check` 通过。远端 CI、前端测试、浏览器完整业务 E2E 本任务未运行；pytest 有 Starlette TestClient 上游弃用警告 1 条。
- 2026-10-31 S6-02 后恢复复核：起始工作区干净、HEAD `bf85e3c21f5cfe723be93573ed3c841c713ca781` 与 HANDOFF 一致；核对 AGENTS、继续 Prompt、任务台账、S6-02 浏览器代码/合成夹具、S3-01 相关设计与未决问题。Q-03/09 无签核证据；现有未完成 Task ID 均有未满足依赖。仅在 `docs/recovery-audit-post-s6-02` 分支更新交接文档，不新增任务或临床规则。
- 本轮实测：后端 `uv run ruff check .` 通过、`uv run pytest -q` → 23 passed（Starlette TestClient 上游弃用警告 1 条）；前端 Node 26.13/pnpm 10 容器 lint、typecheck、test → 12 passed、build 成功；`Dockerfile.e2e` 镜像重建、Playwright/Chromium → 3 passed（本地模拟 API）；Compose config 与交接脚本（14 Task ID、本地链接）通过。真实 PostgreSQL/Next HTTP 烟测、手工浏览器 UAT、远端 CI 本轮未运行。
- S6-02：从干净的 `692971f35f585dcfe4eaa3c3309746b5e4dcbf29` 恢复；原台账无可执行 ID，登记独立合成浏览器验收任务 `S6-02`，依赖已完成的 S6-01，未更改产品代码或临床规则。`frontend/e2e/synthetic-pose.pw.ts` 在 Next + 本地模拟 API 的 Chromium 中 3 passed：未登录跳转、未分配对象 404、算法提示/模拟照片范围/合成 SVG 生成切换清除、无摄像头调用或非 GET 请求。模拟 API 只含合成编号数据，不是 PostgreSQL 全链路或真实影像验收。
- S6-02 检查：后端 Windows `uv run ruff check .` 通过、`uv run pytest -q` → 23 passed（上游弃用警告 1 条）；前端 Node 26.13/pnpm 10 容器 `pnpm lint`、`pnpm typecheck`、`pnpm test` → 12 passed、`pnpm build` 成功；Chromium 测试镜像 `docker build -f Dockerfile.e2e -t taiji-s6-02-e2e .` 成功，容器 `pnpm test:e2e` → 3 passed。文档/交接脚本和最终 Git 状态在提交前后复核。
- S6-02 首次尝试 `pnpm exec playwright install --with-deps chromium` 因容器无法解析 `storage.googleapis.com` 未下载浏览器；改用发行版 Chromium。浏览器套件首跑 2 passed/1 failed，失败因过宽的 `getByRole('img')` 匹配 Next 开发工具图标；限定到合成预览区域后 3 passed。未重跑真实 PostgreSQL/Next HTTP 烟测，未运行浏览器手工 UAT、远端 CI 或真实影像测试。
- 2026-10-31 恢复审计：从干净的 `feat/s6-01-synthetic-pose-demo` 工作区与 HEAD `207d8896c295fbca090193198d6037d61d8a1419` 复核 HANDOFF、TASKS、Git 历史、S6-01 代码/测试及相关设计；`git show --check --stat HEAD` 通过。本轮仅更新交接文档，另建 `chore/recovery-audit-2026-10-31` 分支；任务状态不变。
- 本轮实测：后端 `uv run ruff check .` 通过、`uv run pytest -q` → 23 passed（Starlette TestClient 上游弃用警告 1 条）；前端 Node 26.13/pnpm 10 容器 `pnpm lint`、`pnpm typecheck`、`pnpm test` → 12 passed、`pnpm build` 成功；Compose config 与 `scripts/check_handoff.py`（13 个 Task ID、本地链接）通过。S6-01 的临时 PostgreSQL/HTTP 烟测为上一检查点证据，本轮未重跑；浏览器手工 E2E 和远端 CI 仍未运行。
- 依赖核对：S3-01 的 Q-03/09 未签核，保持 `BLOCKED`；S4/S5/S7/S8 均有未满足的前序或审批依赖。台账无下一可执行 Task ID；没有实施或修改任何临床规则。
- S6-01 后端 Windows：`uv run ruff check .` → All checks passed；`uv run pytest -q` → 23 passed、Starlette TestClient 上游弃用警告 1 条。新增测试核对 OpenAPI 无图片/上传路由，两个图片 POST 均 404；没有数据库迁移或后端业务 API 变更。
- S6-01 Node 26.13 / pnpm 10 容器：`pnpm lint`、`pnpm typecheck`、`pnpm test` → 12 passed；`pnpm build` 成功，包含 `/participants/[id]/pose-demo` 动态路由。DOM 交互测试验证生成/切换/清除合成 SVG、无摄像头/网络/存储调用。
- S6-01 临时 tmpfs PostgreSQL 17 + FastAPI + Next HTTP：迁移至 `0004_manual_assessments` 并用 `app.seed_demo` 只建立合成账号与对象；未登录页面 307、已分配对象 200、跨研究对象 API 403/页面 404；页面有完整“姿态识别算法尚未接入”提示，没有文件输入/视频元素；图片 GET/POST 404；写入合成 `photo_scope=true` 后仍无上传端点。服务与临时容器已停止，原数据库卷未操作。
- S6-01 失败/未运行：首次 DOM 测试在 Node 26 的 jsdom 环境中读取不可用的 `localStorage` 全局对象失败；改为注入存储监视器后通过。Windows 浏览器 UI 工具因无法可靠识别当前 Chrome URL 而停止，本轮未执行浏览器手工点击 E2E；使用 DOM 交互测试和本地 HTTP 流程分别验证交互与授权。远端 CI、真实照片准入未运行。
- S2-01 Windows 后端：`uv run ruff check .` → All checks passed；`uv run pytest -q` → 22 passed，Starlette TestClient 上游弃用警告 1 条；`uv run python -m app.export_openapi` 已生成新快照。
- S2-01 Node 26.13 / pnpm 10 容器：`pnpm lint`、`pnpm typecheck`、`pnpm test` → 11 passed；`pnpm build` 成功，动态路由包含 `/assessments/[id]`。本机仍无 pnpm。
- S2-01 独立临时 PostgreSQL 17 `taiji_migration` 空库：`upgrade head → alembic check → downgrade 0003_synthetic_intake → upgrade head → current` 全通过，最终 `0004_manual_assessments`；回退只在空库执行。另一临时库的 API 烟测：无模拟同意和未分配对象写入均 403；创建与同键重放 201 且同 ID；有效零分草稿 200、确认 200；新 TestClient 中读取持久历史 `[3,2,1]`，审计 9 条。Next 开发容器代理：登录 200、对象页 200、复评创建 201、缺失草稿 200、确认 200，评估页 200 显示“缺失（拒测）”与历史版本。临时服务结束后停止，测试数据不随 Git 保存。
- S2-01 首次 Next 烟测脚本受环境 SOCKS 代理影响，设置 `trust_env=False` 直连；后一次文本断言忽略 React 数字节点注释后通过。该脚本没有成为仓库测试套件，实际接口和页面响应已复核。远端 CI、Playwright 浏览器套件与真实数据准入门禁仍未运行。
- S1-02 Windows 后端：`uv run ruff check .` → All checks passed；`uv run pytest -q` → 18 passed，Starlette TestClient 上游弃用警告 1 条；`uv run python -m app.export_openapi` 已生成新快照。
- S1-02 Node 26.13 / pnpm 10.34 容器：`pnpm lint`、`pnpm typecheck`、`pnpm test` → 7 passed、`pnpm build` 成功。本机无 pnpm；首次非交互容器安装因清理旧模块被拒，设置 `CI=true` 后完成。
- S1-02 临时空 PostgreSQL 17：`upgrade head → alembic check → downgrade 0002_auth_scope → upgrade head → current` 全通过，最终 `0003_synthetic_intake`。独立临时库经 tmpfs 容器停止后丢弃，没有对原合成卷回退。
- S1-02 PostgreSQL API：登录 200；跨研究创建及未分配对象读取 403；合成对象创建 201；无同意筛查 403、模拟同意 201、筛查 201 并显示 `needs_review`；照片路由 404；审计 8 条。最终独立临时库复测创建/同键重放 201 且 ID 相同、同键异请求 409、同意和筛查 201。前端 Next 开发容器通过代理登录 200、工作台 200、对象页 200；有筛查显示“待复核”，无记录显示“未评估”且筛查表单关闭。临时服务已停止。
- `docker compose --env-file .env.example -f infra/compose.yaml config --quiet` 通过；远端 GitHub Actions、Playwright、真实数据准入人工门禁未运行。
- S1 Windows 本地：`uv run ruff check .`、`uv run pytest -q` → 14 passed；`pnpm lint/typecheck/test/build` → 4 passed、构建成功。
- S1 PostgreSQL：`0002_auth_scope` 升→降至 `0001_baseline`→再升成功；`alembic check` → No new upgrade operations detected；最终版本 `0002_auth_scope`。
- S1 容器：登录 200（2 个 Cookie）、工作台 200、已授权对象 200、同研究未分配对象 403、CSRF 注销 204；审计包含登录/读取/拒绝/注销。未知账号失败 5 次 401，随后 429；未登录工作台 307 到 `/login`。
- S1 合成密码恢复：本地显式重置后重新登录 200，数据库新增 3 条 `demo_password_reset` 审计；单测验证旧会话撤销。
- S1 不包含导出端点；AT-05 的未授权导出测试仍待 S5-01。GitHub Actions 远端尚未运行。

### Sprint 0 检查点（历史）

- Windows 本地：`uv run ruff check .` → all checks passed；`uv run pytest` → 2 passed（上游 TestClient 弃用警告 1 条）。
- Windows 本地：`pnpm lint`、`pnpm typecheck`、`pnpm test` → 2 passed、`pnpm build` → 成功。
- `docker compose --env-file .env.example -f infra/compose.yaml config --quiet` → 成功；`up --build -d` → 前后端镜像构建、服务启动成功。
- 空的本地合成数据库：Alembic `upgrade head`、`current`、`downgrade base`、再 `upgrade head` → 成功；`SELECT version_num FROM alembic_version` → `0001_baseline`。
- 容器冒烟：`GET /health` → `{"status":"ok"}`，`GET /ready` → `{"status":"ready"}`，前端首页 HTTP 200 且显示 API 正常。
- `uv run --no-project python scripts/check_handoff.py` → 13 个 Task ID、仓库内 Markdown 链接检查通过（最终文档更新后复跑）。

当时 Docker Desktop 在首次迁移后短暂重启，第一次容器 HTTP 复核失败；重启服务后复核通过。Sprint 0 检查点尚无认证业务流程；远端 CI、生产部署与真实数据至今未运行。

## 当前阻断与下一步

S2-01、S6-01、S6-02、`ENG-04A`、`ENG-01A`、`ENG-02A` 和 `ENG-03A` 的限定范围已完成；下一项依赖已满足的独立任务是 `ENG-04B`，在临时 PostgreSQL 和实际 API/Next 上做现有合成建档、人工评估与趋势浏览器 E2E，不扩展临床业务。ENG-01 的训练/周期/导出仍需安全的非临床前置任务另行拆解。Q-02 未决时不能自动计算 SPPB 分项，Q-01/10 未决时不能采集或留存真实影像。`S3-01` 保持 `BLOCKED`，需 Q-03 适配模板/禁忌/剂量和 Q-09 审批/发布权限由授权负责人签核；S4/S5/S7/S8 仍依赖前序或其他批准。S1 完整 CRUD、真实同意/身份/照片、AT-14 人工准入及 AT-01 导出仍未完成。临床问题保持 [OPEN_QUESTIONS](OPEN_QUESTIONS.md) 的未决状态。

## 2026-11-07 REAL-01C1 合成原始观察检查点

新增 0014 追加版本表与 manual-observations API、对象页录入/更正。四种指标固定单位，十进制原值以最长 40 字符字符串保存，拒绝非有限数；按对象权限、当前模拟同意、CSRF、幂等与预期版本核验。独立于 SPPB 和 Demo 分级，旧 CSV 暂不含这些观察，页面明确说明。后端 Ruff/52 passed、4 skipped；前端 build/lint/typecheck/24 tests；临时 PostgreSQL 迁移升/check/空库降/升与旧 API 5 passed；Chromium 10 passed。首次浏览器发现幂等 route_key 超过 PostgreSQL 80 字符限制，缩短后复测通过；失败附件 exports/eng04b-c62151e22521 保留。最终展示文字补充录入人/时间尚待前端复验。REAL-01C1 保持 IN_PROGRESS：需补齐四指标/缺失/无效与撤权边界验收、独立浏览器夹具及完整契约核对；不宣称多指标功能全面验收。共享网站未部署、未推送。

## 2026-11-07 REAL-01C1 完成复验

四指标与单位、小数、有效零、缺失、无效、必填原因/时间、未知指标拒绝和撤权后旧会话拒绝已补 API 测试；原始观察页面显示测量时间、原因、录入人/时间，更正时锁定原指标。浏览器夹具在未有模拟同意时自行建立合成同意，减少对其他测试顺序的依赖。后端 Ruff 全过，pytest 52 passed/4 skipped；临时 PostgreSQL 迁移升/check/空库降/升及旧 API 5 passed（本任务先前检查点）；最终隔离 Chromium 10 passed，实际 API/Next/临时 PostgreSQL，容器、网络与镜像已清理。前端完整依赖容器的 build/lint/typecheck/24 tests 均通过；本机 `pnpm typecheck` 因本地 node_modules 缺少测试依赖而失败，非源码编译失败。REAL-01C1 标记 DONE，父任务 REAL-01C 仍 IN_PROGRESS；正式 FRAIL/SPPB 分项 SOP 和真实数据准入未批准。旧编号化 CSV 不含新增原始观察，后续 REAL-01F1 单独补齐。未部署共享网站、未推送。

## 2026-11-07 REAL-01F1 合成原始观察导出

单对象实时 Demo CSV 现增加 `manual_observation_revision` 行，保留四指标每次修订、原始十进制字符串、零、缺失/无效、单位、来源、侧别与记录者/时间；上下文说明和更正原因不导出。原有服务端对象权限、审计、行数、哈希与 `live-demo` 标记不变；页面明确新增覆盖范围。修改前后端基线 Ruff/52 passed、4 skipped；修改后 Ruff/52 passed、4 skipped；一次性 tmpfs PostgreSQL 迁移升/check/空库降/升及 5 个集成测试通过；实际隔离 Chromium 10 passed，包含新 CSV 内容；完整依赖前端容器 build/lint/typecheck/24 tests 通过。隔离容器、网络和本次门禁镜像已清理。未更改数据库结构、临床规则或真实导出权限，未部署共享站点、未推送。

## 2026-11-07 REAL-01F2 合成周期/访视历史导出

单对象实时 Demo CSV 增加手工周期容器与访视每个修订版本；导出周期/访视 ID、到访与评估状态、同对象已有评估和训练观察关联 ID、操作者和记录时间。无关联评估留空，无关联训练用 `[]`；手工名称与更正原因排除。若数据库中的关联 ID 不属于该对象，导出拒绝生成，避免跨对象泄漏。无新增迁移、日程推断或冻结快照。修改前后端基线 Ruff/52 passed、4 skipped；修改后 Ruff/52 passed、4 skipped；一次性 tmpfs PostgreSQL 升/check/空库降/升及 5 个集成测试通过；隔离 Chromium 10 passed，实际下载含周期/访视修订；前端完整依赖容器 build/lint/typecheck/24 tests 通过。临时容器、网络和本次门禁镜像已清理。未部署共享站点、未推送。

## 2026-11-07 REAL-01F3 合成患者自报结构化导出

单对象实时 Demo CSV 增加 `patient_report_revision`，逐版本保留合成患者自报的发生/登记时间、训练和不适三态、可空时长、来源及账号 UUID；与医护训练观察分开。确实记录的 0 分钟保留，空值与未知状态不被推断为完成或安全；不适描述和更正原因排除。患者角色仍无工作人员导出权限。修改前后端基线 Ruff/52 passed、4 skipped；修改后 Ruff/52 passed、4 skipped；一次性 tmpfs PostgreSQL 升/check/空库降/升及 5 个集成测试通过；隔离 Chromium 10 passed，含医护实际下载及脱敏断言；前端完整依赖容器 build/lint/typecheck/24 tests 通过。临时容器、网络和本次门禁镜像已清理。未改临床规则、真实数据权限或已有卷，未部署共享站点、未推送。
