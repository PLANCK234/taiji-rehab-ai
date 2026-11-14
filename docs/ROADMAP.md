# Implementation roadmap / executable milestones

**Principle:** one bounded Codex task/PR at a time; do not ask a model to build the entire site in one message. Actual study deployment has separate institutional gates.

`DEMO-V2` 是当前独立优先工程链：规则/契约 → 入口与评估 → Demo 分级/动作库 → 训练与反馈 → 实库浏览器验证。此链只用合成数据及 `DEMO_ONLY` 映射，不更改下表阶段 3 的正式临床阻断。细节见 [Demo 流程](product/DEMO_USER_FLOW.md)、[任务台账](TASKS.md)和 [ADR-0014](decisions/0014-isolated-demo-rule-and-run.md)。

新增患者端方向先按 [ADR-0015](decisions/0015-separate-patient-portal.md) 与 [任务台账](TASKS.md) 拆分：合成患者账号/本人隔离 → 医护确认计划的发布/撤回边界 → 经审核视频展示 → 患者训练与不适记录、医护查看。真实患者准入须独立完成临床、伦理、隐私及机构部署审批；不得直接复用 `DEMO_ONLY` 方案作为可执行计划。

合成卡片选择/发布已实现；视频下一步依[DEMO-V2-16A 契约](product/SYNTHETIC_VIDEO_REVIEW_CONTRACT.md)与实际可核验授权的非指导性素材推进。当前无视频文件，患者端只显示待添加；正式视频审核与真实患者使用继续等待 Q-15 等批准。

在视频素材等待期间，可继续推进不改变权限和临床含义的中文演示易用性。DEMO-V2-26 已统一工作人员、患者和管理员的当前账号/中文角色显示，内部角色代码与服务端授权保持不变。

DEMO-V2-27 已把患者入口的无有效绑定、会话失效和服务故障分开提示；这是现有 `/patient/me` 状态契约的前端表达，不新增绑定或真实患者能力。

DEMO-V2-28 已为无有效绑定和服务故障状态补充只读重新检查操作；它只重新执行服务端页面读取，不写入或恢复任何绑定，也不改变授权边界。

DEMO-V2-29 已为患者自报读取故障补充同样的只读重新检查操作；失败时不把不可用误作空记录，也不展示可写表单，正常空记录继续保持“未知”语义。

S6-03 已在阶段 6 原合成壳之外增加默认关闭的浏览器本地姿态可行性原型：单人视频可得到 33 点骨架、描述性角度范围、二维轨迹和时间并导出，不上传或持久化，也不形成临床评分。下一步 S6-04 只有在合成/公开或明确授权的五次坐站与太极样本、人工标注方案就绪后，才验证阶段/次数、误差、缺失率和失败模式；真实影像治理及评分发布继续等待 Q-01/Q-10 和临床审批。

REAL-01 authorizes independent nonclinical engineering while Stage 3 clinical rules remain blocked. `REAL-01D0` records only already-observed activity, feedback and unclassified events; it is not the Stage 4 protocol-bound prescription/session milestone. `REAL-01F0` adds single-object live Demo export; `REAL-01E0` adds manual synthetic cycle/visit grouping of existing observations. Approved visit scheduling, frozen datasets and Research activation remain separate. See [TASKS](TASKS.md), [ADR-0012](decisions/0012-training-observation-before-cycle.md) and [ADR-0018](decisions/0018-manual-synthetic-cycle-grouping.md).

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
