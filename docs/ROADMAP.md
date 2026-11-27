# Implementation roadmap / executable milestones

DEMO-V2-64完成0024坐站计时持久化及人工版本；65把测量/复核/恢复/分页接入现有AI页。后续优先66可选worldLandmarks/3D角度对照，降低图像平面视角限制；不把相对3D骨架坐标作为地面四米标定。评分表、临床阶段和人工SPPB草稿仍独立实现。

2026-11-26 下一阶段：DEMO-V2-62 完成 PR #10 验收及合并 main `5ea8c44`；DEMO-V2-63 先独立实现 `sppb-measure-v1`，DEMO-V2-64 再接服务端持久化/逐项复核。评分表批准和人工确认→草稿→分级仍为独立环节；太极动作质量分不预置权重。参见 [测量验证](testing/SPPB_MEASURE_VALIDATION.md)。

2026-11-26接续：独立工程任务`DEMO-V2-15`补原始/平滑信号、残差噪声、固定媒体时间采样、保存恢复与v1/v2兼容，未改变临床任务状态。11实体手机/真实多样化动作与12评分表仍待后续；最新验证见[STATUS](STATUS.md)与[ADR-0017](decisions/0017-pose-signal-and-retry.md)。

同日`DEMO-V2-16`完成Next16.4.5修复补丁、全量/生产audit0与识别链路回归；不再因16.4.3提醒重复构建，后续仍优先11多场景/实体机及12专家评分表。

2026-11-26 新增 AI 视频主线：`DEMO-V2-09` 方案 → `10` 合成关键点/数据库分析（DONE）→ `11` 姿态模型/采集（已接入，实体手机待验）→ `12` 版本评分 → `13` 人工审核/计划关联（观察复核已实现）→ `14` 专家标注验证。详见 [方案](product/AI_VIDEO_ASSESSMENT_PROPOSAL.md)与[验证](testing/AI_POSE_VALIDATION.md)；原 REAL/ENG/S 状态不变。下一优先任务为 `DEMO-V2-11`剩余实机/多场景验证；评分表依Q-14，`REAL-01E0`保留。

**Principle:** one bounded Codex task/PR at a time; do not ask a model to build the entire site in one message. Actual study deployment has separate institutional gates.

`DEMO-V2` 是当前独立优先工程链：规则/契约 → 入口与评估 → Demo 分级/动作库 → 训练与反馈 → 实库浏览器验证。此链只用合成数据及 `DEMO_ONLY` 映射，不更改下表阶段 3 的正式临床阻断。细节见 [Demo 流程](product/DEMO_USER_FLOW.md)、[任务台账](TASKS.md)和 [ADR-0014](decisions/0014-isolated-demo-rule-and-run.md)。

新增患者端方向先按 [ADR-0015](decisions/0015-separate-patient-portal.md) 与 [任务台账](TASKS.md) 拆分：合成患者账号/本人隔离 → 医护确认计划的发布/撤回边界 → 经审核视频展示 → 患者训练与不适记录、医护查看。真实患者准入须独立完成临床、伦理、隐私及机构部署审批；不得直接复用 `DEMO_ONLY` 方案作为可执行计划。

合成卡片选择/发布已实现；视频下一步依[DEMO-V2-16A 契约](product/SYNTHETIC_VIDEO_REVIEW_CONTRACT.md)与实际可核验授权的非指导性素材推进。当前无视频文件，患者端只显示待添加；正式视频审核与真实患者使用继续等待 Q-15 等批准。

在视频素材等待期间，可继续推进不改变权限和临床含义的中文演示易用性。DEMO-V2-26 已统一工作人员、患者和管理员的当前账号/中文角色显示，内部角色代码与服务端授权保持不变。

DEMO-V2-27 已把患者入口的无有效绑定、会话失效和服务故障分开提示；这是现有 `/patient/me` 状态契约的前端表达，不新增绑定或真实患者能力。

DEMO-V2-28 已为无有效绑定和服务故障状态补充只读重新检查操作；它只重新执行服务端页面读取，不写入或恢复任何绑定，也不改变授权边界。

DEMO-V2-29 已为患者自报读取故障补充同样的只读重新检查操作；失败时不把不可用误作空记录，也不展示可写表单，正常空记录继续保持“未知”语义。

S6-03 已在阶段 6 原合成壳之外增加默认关闭的浏览器本地姿态可行性原型：单人视频可得到 33 点骨架、描述性角度范围、二维轨迹和时间并导出，不上传或持久化，也不形成临床评分。下一步 S6-04 只有在合成/公开或明确授权的五次坐站与太极样本、人工标注方案就绪后，才验证阶段/次数、误差、缺失率和失败模式；真实影像治理及评分发布继续等待 Q-01/Q-10 和临床审批。

S6-05 已先补齐样本验证基础设施：逐关键点/关节角覆盖率、连续漏检采样数和按采样时间对齐的空白人工标注模板。它没有替代 S6-04 的真实对照，也没有设置“可用”阈值。

S6-06 将空白模板变为浏览器本地可操作的时间点标注助手：可自定义事件、重复、阶段和参考关节，下载已填写 CSV；不预置动作定义或自动计次。它降低未来 S6-04 人工对照录入成本，但人工标注方案仍需由研究团队确定。

S6-07 修正人工对照字段语义：人工参考角、同一时刻模型角及绝对差值独立保留，未知不补零，也不设置误差合格线。这使未来 S6-04 可以据获批人工方案做描述性误差报告，但没有替代样本、标注一致性或临床审批。

S6-08 在浏览器内对当前标注做总体/分关节描述性汇总，并导出不含自由文本和视频信息的聚合 JSON。统计只使用人工/模型角同时存在的行，不产生 pass/fail；真实误差结论仍属于有样本和协议后的 S6-04。

S6-04 的首段侧面样本人体检出 99.4%，远侧左肢和末段足部存在遮挡。S6-15 已在网页中输出 5 个与 3 个候选站起，并与两段开发样本的离线输出一致。人工标注规程、独立计次与计时验证、误差报告及太极样本仍待完成。

S6-19 补齐五次坐站本地计时复核流程。使用人工标记的起点与第五次站直计算用时，由工作人员选择程序候选比较终点差异，支持记录无法判定和下载经确认的 CSV。正式 SPPB 计分规程继续由 Q-02 跟踪。

S6-09 将各关节派生角显示为可切换的时间曲线，并严格在未知采样处断开。它用于观察缺失和辅助后续人工标注，不插值、不自动计次，也不定义坐/站阶段或动作质量。

S6-10 将视频当前时刻与角度曲线游标、时间滑块和骨架叠加双向联动，降低人工选择标注时刻的操作成本。它仍只做本地定位，不产生阶段或次数标签。

S6-11 将人工时间点以曲线标记和可点击定位按钮呈现，便于核对人工事件与角度序列的相对位置。事件内容仍由人工协议决定，界面不生成动作语义或真值。

S6-12 支持把本系统导出的人工标注 CSV 重新载入当前视频；导入严格校验且不覆盖现有内存标注，模型派生值按当前分析重算。它用于恢复人工工作，不把文件中的事件解释为批准的动作协议。

S6-13 在导入前增加不含文件名的数量/时段/人工角/关节预览，必须明确确认后才改变内存标注，也可取消。预览只降低误导入风险，不审核事件语义。

S6-14 允许在保留原时刻的前提下编辑已有人工字段；保存替换原记录并重算新关节模型角，取消不改变记录。它减少删除重录，但不审核人工事件定义。

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
