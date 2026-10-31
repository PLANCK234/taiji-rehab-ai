# Data dictionary and missingness

| Variable | Type / unit | Source | Missingness / cautions |
|---|---|---|---|
| study_code | string | registration | no name/phone in general exports |
| participant.study_code | string | synthetic-only seed | unique within study; no name, phone or eligibility fields in S1 |
| user.email | string | synthetic staff seed | account identifier; never include in participant responses or audit summaries |
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
