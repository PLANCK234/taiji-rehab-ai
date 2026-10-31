# 实施状态

## 2026-10-31 REAL-01 当前检查点（以下为最新状态）

项目目标现为数据库驱动的医疗研究人员工作台；**开发和自动化验证仍仅使用合成数据**。真实患者数据接入、Research 业务访问及生产部署尚未获仓库内证据批准。REAL-01 纵向闭环尚未完成；旧版 Sprint/ENG 状态记录留在下方作为历史证据，涉及“下一步”的旧叙述已被本节及 [HANDOFF](HANDOFF.md) 取代。

| 范围 | 状态 | 实际证据 / 缺口 |
|---|---|---|
| REAL-01P Demo/Research 准入隔离 | DONE | `APP_PROFILE` 白名单式 Demo 准入；Research 独立 Compose 项目、PostgreSQL 卷/账号/配置/私网；业务 API、ready、演示种子和 Alembic 迁移审批前拒绝。改 `ALLOW_SYNTHETIC_ONLY=false` 不会打开 Research。 |
| REAL-01A/B/C | IN_PROGRESS | 现有 Demo 登录/RBAC/审计、编码建档/模拟同意、人工 SPPB 总分/历史为可复用子集；人员授权管理、档案结构/更正及其他量表未完成。 |
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
