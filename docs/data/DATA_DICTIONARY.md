# Data dictionary and missingness

| Variable | Type / unit | Source | Missingness / cautions |
|---|---|---|---|
| study_code | string | registration | no name/phone in general exports |
| participant.study_code | string | synthetic-only seed | unique within study; no name, phone or eligibility fields in S1 |
| user.email | string | synthetic staff seed | account identifier; never include in participant responses or audit summaries |
| demo_patient_binding.user_id / participant_id | UUID / UUID | synthetic Demo seed | one-to-one coded linkage only; no real identity or patient-created account |
| demo_patient_binding.revoked_at | UTC datetime or null | assigned clinician revocation API | null means binding active; revoked row retained and seed does not reactivate it |
| demo_patient_publication.version / state | positive integer / published or withdrawn | assigned clinician synthetic flow | append-only; latest state controls visibility; never a clinical plan version |
| demo_patient_publication.marker / recorded_by / recorded_at | fixed `SYNTHETIC_PROCESS_ONLY` / staff UUID / UTC | server/audit | no action, dose or video URL; patient projection omits staff identity |
| consent_record.decision | granted/refused/withdrawn | synthetic staff entry | latest entry controls synthetic screening write; no verified consent signature |
| consent_record.photo_scope | boolean | synthetic staff entry | record only; photo upload remains unavailable |
| consent_record.document_version / purpose_code | `SYN-` code | synthetic staff entry | no real protocol, signature or purpose approval implied |
| screening_record.item_code | `SYN-` code | synthetic staff entry | placeholder only; no clinical question or required set approved |
| screening_record.answer | yes/no/unknown | synthetic staff entry | unknown is explicit; no answer implies not assessed |
| screening.review_state | not_assessed/needs_review | API projection | never safe/eligible; even all answered remains needs_review |
| intake.change_reason | `SYN-` code | synthetic staff entry | required for later consent records or same-item screening corrections |
| assessment.visit_kind | baseline/revisit | synthetic staff entry | visit label only; no approved visit schedule inferred |
| assessment.protocol_version | `SYN-MANUAL-V1` | assessment API | synthetic marker, not a signed measurement SOP |
| assessment_revision.state | draft/confirmed | assessment API | confirmation is staff record review, not a clinical grade or completed measurement when missing |
| assessment_revision.validity | unrecorded/valid/missing/invalid | synthetic staff entry | initial draft unrecorded; missing and invalid have no usable total |
| assessment_revision.raw_value | integer points or null | synthetic staff entry | valid manual total 0–12; zero is observed, null is not zero; invalid raw original may be retained |
| assessment_trend.current | assessment revision projection | authorized read-only API | latest revision may be draft; never silently replace the last confirmed value |
| assessment_trend.latest_confirmed | assessment revision or null | authorized read-only API | most recent confirmed revision per assessment; null means no confirmed version, not zero |
| assessment_trend.entries | ordered assessment projections | authorized read-only API | order by assessment registration time/ID, not an approved cycle schedule; missing and invalid are not plotted |
| assessment_revision.missing_reason | enum below or null | synthetic staff entry | required for missing/invalid; valid and unrecorded null |
| assessment_revision.performed_at | timezone-aware UTC instant or null | synthetic staff entry | required for valid; no invented measurement time for missing |
| assessment_revision.recorded_by/at | staff UUID / UTC instant | assessment API | attributable append-only version; `SYN-` correction reason required after first measurement |
| ENG-03A offline row | synthetic coded ID, visit label, state, validity, raw_value, missing_reason, performed_at | `ml/offline_dataset.py` | fictitious generated examples only; null is unknown, observed zero stays zero; no endpoint or efficacy label |
| age_years | integer years | clinician | scoped by protocol; no guessed age |
| sppb_total | integer 0–12 | clinician-confirmed evaluation | missing ≠ 0; score algorithm only after SOP approval |
| sppb_balance | source-defined score | evaluation | unit/formula to approve |
| gait_4m_seconds | decimal seconds | timed evaluation | distinguish not performed, unsafe, technical failure |
| sit_to_stand_5_seconds | decimal seconds | timed evaluation | recording method and support needed |
| frail_total | protocol-defined score | evaluation | need scale version |
| tug_seconds | decimal seconds | timed evaluation | optional by approved protocol |
| grip_strength_kg | decimal kg | dynamometer | record side/device if used |
| training_actual_minutes | decimal minutes | session observer | 0 observed is valid; missing is null |
| training_sessions.session_at / action_label | UTC datetime / text | manual staff observation, D0 | actual activity only, not a planned dose or approved action code |
| training_sessions.actual_minutes | integer minutes or null | manual staff observation, D0 | null unknown; 0 observed zero; no automatic completion inference |
| training_sessions.completion_status | completed/partial/interrupted/not_started | manual staff observation, D0 | descriptive, no clinical clearance |
| training_feedback_revisions.state | recorded/missing; no row = unfilled | manual staff entry, D0 | missing requires explicit reason and cannot contain observed values |
| training_feedback_revisions.missing_reason | declined/interrupted/technical_failure/unknown or null | manual staff entry, D0 | null only for recorded state; not interpreted as no symptoms |
| training_feedback_revisions.rpe | integer 6–20 or null | staff-recorded report, D0 | null unknown; no effectiveness/safety label |
| training_feedback_revisions.difficulty / support / fatigue / discomfort / notes | free text or null | manual staff entry, D0 | no validated Q-12 categories, null = unrecorded; synthetic only |
| training_feedback_revisions.revision_no / change_reason / recorded_by / recorded_at | version/text/UUID/UTC | audit trail, D0 | correction appends; prior versions retained |
| safety_events.event_at / description / session_id | UTC/text/optional UUID | independent staff fact report, D0 | no severity/SAE classification, notification or clinical disposition |
| training_completion | enum | clinician | completed/partial/aborted/not_observed |
| support_type | enum | clinician | sitting/chair_supported/standing/other/unknown |
| borg_rpe | integer 6–20 | participant-reported by staff | subjective, never AI-estimated |
| difficulty | categorical | participant-reported | category anchors need ratification |
| symptoms | multi-select + timing | participant/clinician | “none” is explicit, never default |
| fall_near_fall | event enum | observer | separate actual fall vs near-fall |
| clinician_grade | I/II/III/IV/undetermined | clinician | confirmation vs algorithm candidate separate |
| grade_candidate | same enum | rule/model | source/version mandatory |
| endpoint_sppb_delta | derived score difference | outcome pipeline | only when both measured and eligible |

For every measurement save `source`, `performed_at`, `recorded_at`, `validity`, `missing_reason`, `reviewer`, `unit`, `protocol_version`, and as applicable instrument/assistive device. Proposed missing reasons: `not_scheduled`, `not_attempted`, `declined`, `unsafe_to_attempt`, `technical_failure`, `lost_followup`, `unknown`. Preserve raw original and later corrections as distinct revisions.

**Label/feature policy**: training feedback is candidate feature; objective cycle endpoint or verified expert assessment is target only when precisely defined. See `../research/DATASET_SPEC.md`.

## REAL-01F0 单对象实时 CSV（Demo only）

`study_code,participant_code` 为合成研究/对象编码；`record_type` 为 `assessment_revision|training_session|training_feedback_revision|safety_event`；`record_id,parent_id,revision_no` 保留记录与修订关联；`event_at_utc,recorded_at_utc,recorded_by` 为 UTC ISO 时间及员工 UUID。评估列为 `visit_kind,protocol_version,measurement_state,metric_code,metric_value,metric_unit,validity,missing_reason`；训练/反馈列为 `completion_status,actual_minutes,rpe,feedback_state`。非适用或未知值为空单元格，确实观测到的 0 输出 `0`。所有评估/反馈修订均分行导出；无身份映射、员工邮箱、自由文本、疗效或临床等级。响应行数和 SHA-256 仅验证本次 UTF-8 文件，不构成冻结数据集。真实导出策略待 Q-07/Q-09。

REAL-01F1 扩展：`record_type=manual_observation_revision` 表示一条合成原始观察的一个修订；`parent_id` 是观察 ID，`revision_no` 保留原始版和更正版。沿用 `metric_code,metric_value,metric_unit,validity,missing_reason,event_at_utc,recorded_at_utc,recorded_by`；新增 `measurement_source=manual_staff_entry` 与 `measurement_side=left|right|unknown`。这些列对既有记录为空。缺失值和未测时间为空单元格；观察到的零及小数原始字符串保留。`context_note` 与更正原因不导出，仍不构成临床解释或冻结数据集。

REAL-01F2 扩展：`record_type=synthetic_cycle` 为手工周期容器，`record_id=cycle_id`，`recorded_at_utc/recorded_by` 为创建时间和人员；`synthetic_visit_revision` 为访视的每个修订，`parent_id` 为访视 ID、`cycle_id` 为所属周期。新增 `visit_attendance`（unknown/attended/not_attended）、`visit_assessment_state`（unknown/recorded/declined/not_measured）、`linked_assessment_id` 和 `linked_training_session_ids`（JSON UUID 数组）。无关联评估时单元格为空；无关联训练时为 `[]`。周期/访视手工名称、更正原因不导出；没有正式访视时间，`event_at_utc` 留空。上述 ID 由服务端确认属于同一对象；这是实时分组历史，不是研究方案日程或冻结快照。

REAL-01F3 扩展：`record_type=patient_report_revision` 表示合成患者自报事实的每个版本，`parent_id` 为报告 ID，`event_at_utc` 为本人填报的发生时间，`recorded_at_utc/recorded_by` 为系统登记时间和合成账号 UUID。新增 `patient_activity_state`（performed/not_performed/unknown）、`patient_discomfort_state`（reported/none/unknown）、`report_source=patient_self_report`；沿用 `actual_minutes`，空表示未知，确实填报的 0 保留。`discomfort_note` 和 `change_reason` 不导出；“none”是明确填报，“unknown”不是安全结论。该行独立于医护训练观察，不构成事件严重度或处置判断。

REAL-01F4 扩展：`record_type=synthetic_consent_record` 逐条导出模拟决定 `consent_decision=granted|refused|withdrawn`、`consent_document_version`、`consent_purpose_code`、`consent_photo_scope=true|false`；`record_type=synthetic_screening_record` 逐条导出 `screening_item_code` 和 `screening_answer=yes|no|unknown`。两类行均有 `record_id`、`recorded_at_utc`、`recorded_by` 和 `intake_source=synthetic_demo_record`，非适用列留空。更正原因及任何签署信息不进入 CSV；模拟 granted 与筛查回答均不表示真实同意、入组资格或安全结论。

## DEMO-V2 专用字段

`demo_participant_profiles.age/sex/needs_assistance/note` 为可选虚构展示资料，`null` 为未知；不映射真实身份。`demo_grade_results.functional_grade` 为 `I|II|III|IV|UNASSESSED`，`demo_training_mode` 独立且 IV/UNASSESSED 为空；`rule_version=demo-rule-v1`、`evidence.marker=DEMO_RULE` 及 `assessment_revision_id` 记录依据。`demo_actions.marker=DEMO_ONLY`，不含临床剂量；`demo_runs.status` 为 in_progress/paused/awaiting_feedback/completed/stopped，`current_index` 为浏览进度，`completed_action_ids` 为实际完成动作的可空独立记录，`training_session_id` 关联原有观察。计划动作或浏览进度不得充当实际完成动作。`actual_minutes` 和 RPE 未记录均为 null，绝不默认为 0。
