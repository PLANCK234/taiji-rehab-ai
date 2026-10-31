# DEMO-V2 合成训练演示用户流程

仅供研究人员操作 `APP_PROFILE=demo` 的合成编号对象。所有展示等级、动作与模式均为 `DEMO_ONLY`，不表示临床许可、处方、运动安全或疗效。正式 FR-004/005 与 S3-01 仍受 Q-03/Q-09 阻断。

| 步骤 | 页面 | 操作与跳转 | 持久化结果 |
|---|---|---|---|
| 1 登录 | `/login` | 邮箱/密码登录后进 `/workspace` | 原有账号与会话 |
| 2 编号对象 | `/workspace` | 搜索已有 `SYN-` 编号；新建时可明确勾选模拟同意并填写 Demo 基础资料 | 原有 `participants`、`consent_records`；新增 `demo_participant_profiles` |
| 3 基础评估 | `/assessments/{id}` 或工作台快速录入 | 人工 SPPB 0–12 与测量日期；确认后进 Demo 方案；缺失/无效仍不可生成自主动作 | 原有 `assessments` 与追加式 `assessment_revisions` |
| 4 分级/方案 | `/participants/{id}/demo` | 后端 `demo-rule-v1` 返回功能等级与独立展示模式；I/II/III 有组合；IV/UNASSESSED 无自动组合 | 新增 `demo_grade_results`，关联确认版本与依据 |
| 5 动作库 | 同方案页 | 搜索、等级/分类筛选、动作详情弹窗 | 12 条 `DEMO_ONLY` 版本化本地种子，不编造医学图片 |
| 6 训练 | `/participants/{id}/demo/run/{runId}` | 开始、暂停/继续、切换动作、结束；刷新恢复状态 | 新增 `demo_runs`；结束后在原有 `training_sessions` 记实际观察 |
| 7 反馈/完成 | 同训练页与原训练记录页 | 实际分钟、完成情况、RPE 6–20/观察；保存反馈后完成；可查看历史、再开始 | 原有 `training_feedback_revisions`；完成要求真实反馈版本，无默认 RPE |

## 字段与规则

- 编号对象：`study_id`、`study_code`；Demo 可选 `age`、`sex`、`needs_assistance`、`note`。这些是虚构展示元数据，不是身份映射。
- 评估：`visit_kind`、`validity`、`raw_value`、`performed_at`、`state`、`revision_no`。未评估、无效、缺失与确有 0 分分离。
- `demo-rule-v1`：有效已确认 SPPB 10–12→I、7–9→II、4–6→III、0–3→IV；否则 `UNASSESSED`。`functional_grade` 与 `demo_training_mode` 分开存储。辅助信息不改写等级。
- I/II/III 分别显示基础、简化站立、坐位/扶椅的演示模板；IV/UNASSESSED 不自动安排自主动作。规则依据、评估版本和 `DEMO_RULE` 标记写入数据库。
- 训练：`status` 为 `in_progress`、`paused`、`awaiting_feedback`、`completed` 或 `stopped`；实际训练观察及反馈仍使用既有业务表。结束表单可选实际完成动作，未勾选时保持未知，不按计划或浏览进度推断。中止可独立保存事实观察且不虚构时长/RPE；“结束并填写反馈”走 `awaiting_feedback`。

## 验收

`AT-DEMO-01` 登录/建档/8 分 II/自动跳转；`AT-DEMO-02` 已有对象及 5 分 III；`AT-DEMO-03` 动作搜索/筛选/详情；`AT-DEMO-04` 开始/暂停/继续/结束/RPE/完成；`AT-DEMO-05` 刷新后数据库恢复；`AT-DEMO-06` 缺失、0、越权、重复提交与旧 API/旧数据兼容。测试与未完成边界见 [验收矩阵](ACCEPTANCE.md)和[追踪](../TRACEABILITY.md)。
