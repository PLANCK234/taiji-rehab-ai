# S6-01 本地检查点与远端主线差异

日期：2026-10-31。此记录解释为什么暂停原计划的推送/PR，不改变临床决策或远端代码。

## 核实结果

本地实现及浏览器验收基于 `a69aac8673289101ffa761008060fe35c62e0001`。提交前执行 `git ls-remote --heads origin main codex/s6-01-synthetic-pose-demo` 及 `git fetch origin main` 后，确认远端主线已经是 `1f1d977b23e11c8c6f29363e1be9cbae7e20c320`，多出 10 个提交：

```text
207d889 feat(s6-01): add synthetic pose preview shell
692971f docs: verify recovery checkpoint and blocked dependencies
bf85e3c test(s6-02): cover synthetic pose page in Chromium
e5d7a58 docs: reverify S6-02 handoff and blocked task dependencies
2357fe7 test: add ENG-04A PostgreSQL workflow gate
888d248 feat: add ENG-01A synthetic reassessment cohort
e8eaca1 feat(eng-02a): show scoped synthetic assessment trends
adf019a feat(eng-03a): add synthetic offline dataset QA and splits
552bc68 1
1f1d977 Merge pull request #2 from PLANCK234/test/eng-04b-real-browser-flow
```

上述标题仅是历史标识，不替代代码审查或完成证明。`git diff --stat a69aac8..origin/main` 显示 60 个文件变化；本轮没有执行新版测试或认定所有远端功能完成。

| 范围 | 本地已验收实现 | 远端实际代码 |
|---|---|---|
| 入口 | 在对象详情页展开预览 | 对象页链接 `/participants/{id}/pose-demo` |
| 交互 | 固定 SVG 展开/收起 | 两帧合成 SVG 生成/切换/清除 |
| 浏览器证据 | CUA 可见浏览器 + 实际 API + 内存 SQLite；10 项 | 已有 `frontend/e2e/synthetic-pose.pw.ts`，使用合成 API 夹具；另有真实业务浏览器测试文件，本轮未运行 |
| 后续功能 | 不含趋势或离线数据模块 | 新增趋势 API/UI、合成复评夹具、离线数据模块及数据库/契约门禁代码 |
| 依赖 | 对旧锁文件的本地安装和检查 | `frontend/package.json`、`pnpm-lock.yaml` 已变更，不能直接沿用旧环境通过结论 |
| 交接 | 13 个任务 ID 的旧基线快照 | 新增 S6-02 和 ENG 台账；远端 HANDOFF 仍指向 ENG-04B，最新合并提交已包含其相关文件，需再次对照代码判断，不能照抄下一任务 |

复核命令包括 `git show origin/main:docs/HANDOFF.md`、远端对象页和预览组件、ADR-0008、任务台账与 Playwright 测试。远端预览目录自 `207d889` 至此次远端 HEAD 没有差异。未修改任何远端文件。

## 保留方式与下一步

1. 本地分支 `codex/s6-01-local-acceptance-checkpoint` 保存原有 12 个未提交文件、新增验收摘要/截图以及本差异记录，作为可恢复检查点；不推送或创建重复功能 PR。
2. 旧版[验收报告](S6-01-VERIFICATION.md)继续有效，但仅适用于旧本地实现，不能声称远端版本通过了同一浏览器测试。完整原始日志及副本仍在忽略的 `test-results/`，不是 Git 中的文件。
3. 接续时先在隔离检出中阅读最新 AGENTS、STATUS、TASKS、HANDOFF、设计及测试，确认远端实际状态和依赖。当前工作区及旧依赖目录保持不动；不自行安装新依赖、Docker/PostgreSQL 或执行迁移。
4. 仅在确认有独立增量且不重复远端实现时，才准备最小的证据或修正 PR。不得直接把此旧分支的代码和台账合入最新 main，不回退远端新增工作。

本轮没有调整临床规则、安全边界或研究方案，没有 reset/clean、变基、强制推送或数据删除。
