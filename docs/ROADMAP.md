# Implementation roadmap / executable milestones

**Principle:** one bounded Codex task/PR at a time; do not ask a model to build the entire site in one message. Actual study deployment has separate institutional gates.

`DEMO-V2` 是当前独立优先工程链：规则/契约 → 入口与评估 → Demo 分级/动作库 → 训练与反馈 → 实库浏览器验证。此链只用合成数据及 `DEMO_ONLY` 映射，不更改下表阶段 3 的正式临床阻断。细节见 [Demo 流程](product/DEMO_USER_FLOW.md)、[任务台账](TASKS.md)和 [ADR-0014](decisions/0014-isolated-demo-rule-and-run.md)。

新增患者端方向先按 [ADR-0015](decisions/0015-separate-patient-portal.md) 与 [任务台账](TASKS.md) 拆分：合成患者账号/本人隔离 → 医护确认计划的发布/撤回边界 → 经审核视频展示 → 患者训练与不适记录、医护查看。真实患者准入须独立完成临床、伦理、隐私及机构部署审批；不得直接复用 `DEMO_ONLY` 方案作为可执行计划。

REAL-01 authorizes independent nonclinical engineering while Stage 3 clinical rules remain blocked. `REAL-01D0` records only already-observed activity, feedback and unclassified events; it is not the Stage 4 protocol-bound prescription/session milestone. `REAL-01F0` now adds single-object live Demo export; `REAL-01E0` remains for a synthetic database-backed cycle/visit link before any frozen dataset or Research activation. See [TASKS](TASKS.md), [ADR-0012](decisions/0012-training-observation-before-cycle.md) and [ADR-0013](decisions/0013-live-coded-demo-export.md).

| Stage | Deliverable | Prerequisite | Exit gate |
|---|---|---|---|
| 0 | monorepo skeleton, package tooling, docker, CI, synthetic seed | docs reviewed | commands run, test DB boots |
| 1 | login/session/RBAC, study assignments, consent, participant CRUD | 0 | deny cross-study and no-consent cases |
| 2 | assessment wizard, validity/missingness, revisit history | 1, measurement SOP scope | raw values persist, draft/confirm separated |
| 3 | V0 rule engine, evidence/version, review UI | 2, clinical rule decision | edge cases and approvals tested |
| 4 | session + structured post-training feedback, AE intake | 3 | aborted event before full feedback; idempotency |
| 5 | cycles/visits, trend, anonymized CSV, immutable frozen snapshot | 4 | full E2E and snapshot reproducibility |
| 6 | optional image capture demo shell | consent/image decision or synthetic only | never shows fake recognition |
| 7 | offline ML experiments, baseline comparison, registry, shadow rollout | complete dataset and target approval | participant-split tests, double review |
| 8 | pilot hardening, documentation and deployment | security/ethics approvals | restore drill and clinical UAT |

Sprint tasks reside in `prompts/`. For each stage write code + migrations + tests + updated docs. Small exploratory dataset may mean Sprint 7 delivers only reproducible statistical analysis, not a model with demonstrated clinical utility.
