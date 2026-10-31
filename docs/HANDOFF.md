# 当前交接检查点

> 新 Agent 先运行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline`，核对本文件、任务台账和实际代码。HEAD 是本文件所在提交，哈希不能自写入同一提交。

| 项目 | 当前值 |
|---|---|
| Branch / HEAD | `codex/eng-04b-handoff-reconcile`；本文件所在检查点提交可由 `git rev-parse HEAD` 查得；基点 `1f1d977b23e11c8c6f29363e1be9cbae7e20c320`（PR #2 合并） |
| 最近完成任务 | PR #2 已将 ENG-04B 测试代码合入主线；本轮仅核对其实现/执行证据并纠正台账为 `IN_REVIEW`。已验证完成的子任务仍为 ENG-03A、ENG-02A、ENG-01A、ENG-04A；ENG-04B 尚未验收完成 |
| 本次改动 | 只修正 ENG-04B 的 STATUS、TASKS、HANDOFF、TRACEABILITY 和追加 SESSION_LOG；没有更改应用、测试脚本、CI、依赖或锁文件 |
| 已通过验证 | PR #2 的提交 `552bc68` 与当前合并树一致；[GitHub Actions run 41182109102](https://github.com/PLANCK234/taiji-rehab-ai/actions/runs/41182109102) 后端、前端、文档、ML 四作业成功。2026-10-31 本轮现有项目 Python：Ruff 通过、普通 pytest 27 passed/2 skipped；交接脚本 23 Task ID 与本地链接通过；`git diff --check` 通过。上述均不代表 ENG-04B 浏览器流程已跑 |
| 失败或未运行 | ENG-04B 的临时 PostgreSQL + 实际 FastAPI/Next + Chromium 脚本尚无本轮执行证据；CI 也未包含该脚本。两个 PostgreSQL opt-in 测试在普通 pytest 中跳过；本轮未安装依赖、启动 Docker/PostgreSQL 或执行迁移。Starlette/httpx 上游弃用警告 1 条 |
| 已知问题 | Q-01/10 真实影像伦理、同意、权限、留存未签核；Q-02 未批准分项 SOP；Q-03/09 未批准适配规则和发布责任人，`S3-01` 继续 `BLOCKED`。无候选分级、训练、周期、导出或临床建议 |
| 尚未完成 | ENG-04B 真库浏览器验收；ENG-01 候选/训练/周期/导出，ENG-02 完成率/RPE/周期，ENG-03 V0/候选评估及真实快照，ENG-04 其他完整业务与恢复门禁；S1 完整真实流程、AT-01 导出、AT-02 分级、AT-14 真实准入。临床/影像签核仍待相应负责人 |
| 下一任务 | `ENG-04B` 验收续项：在获准的临时 PostgreSQL 环境运行现有 `scripts/run_eng04b_browser.py`，核对实际退出码、测试场景、失败附件和资源清理；当前 Windows 原生环境未准备 PostgreSQL，继续保持 `IN_REVIEW`。不要重写已合入的浏览器流程；`S3-01` 仍因 Q-03/09 阻断 |
| 需阅读 | `AGENTS.md`, `docs/ROADMAP.md`, `docs/TASKS.md`, `docs/product/ACCEPTANCE.md`, `docs/testing/TEST_STRATEGY.md`, `frontend/AGENTS.md`, `frontend/e2e/real-business.real.ts`, `frontend/playwright.real.config.ts`, `scripts/run_eng04b_browser.py`, `scripts/run_eng04_integration.py`；先核对最新主线和实际代码 |
| 下一任务验收 | ENG-04B 实际 PostgreSQL/浏览器流程通过，合成数据及跨研究拒绝符合测试，退出后临时服务清理可核对；失败时保留 trace/截图及原始错误。仅基础 CI 或普通 SQLite pytest 不满足此验收条件 |
| 未提交修改 / 本地依赖 | 本次文档编辑前副本在忽略目录 `test-results/eng04b-reconcile-20261031/`；检查点后以 `git status` 为准。独立工具链仅用于当前项目，已有 `.venv` 适用于本轮 Python 检查；本轮未动原 D 盘旧版 S6-01 检查点。远端主线不直接修改 |

ENG-03A 的限定范围与证据见 [STATUS.md](STATUS.md)、[TRACEABILITY.md](TRACEABILITY.md)、[ADR-0010](decisions/0010-synthetic-offline-split.md) 与 [测试策略](testing/TEST_STRATEGY.md)。离线记录全部为合成演示，无获批准的结局或模型。恢复核对见 [RECOVERY_TEST.md](testing/RECOVERY_TEST.md)。
