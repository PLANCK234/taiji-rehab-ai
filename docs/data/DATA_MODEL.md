# Logical data model (initial proposal)

2026-11-26 DEMO-V2-15：迁移`0009_pose_geometry_v2`仅将`ck_pose_algorithm`扩大为v1/v2，未改表/历史JSON。新分析的v2平滑/残差结果追加在原result中；旧记录、哈希、复核保留。若v2记录存在，downgrade0008会抛错并保留迁移状态，不能为回退而改写版本。临时数据库验证了带旧数据升级与拒绝破坏性回退；共享卷未操作。

2026-11-26：增量迁移`0008_pose_analyses`新增`pose_analyses`（participant_id、input_data、input_sha256、algorithm_version、result、created_by/at）与`pose_reviews`（analysis_id、revision_no、decision、reason、recorded_by/at）。原AI输入/计算结果追加保存，人工复核独立版本；unique(analysis_id,revision_no)、revision_no>0、decision枚举由数据库约束。对象行锁串行化写入/审核，幂等沿用write_receipts。无原影像存储，无人工量表source更改，无级别/处方关联。迁移仅在独立测试库升降升验证，本机原有卷未迁移。

Use UUID primary keys, UTC timestamps, stable `study_code`, explicit soft-delete/retention policy only after approval. The table below is a **logical target**. Migration `0002_auth_scope` implements users, studies, assignments, coded participants, sessions, rate limits and audit. Migration `0003_synthetic_intake` adds `write_receipts`, `consent_records` and `screening_records`. Migration `0004_manual_assessments` adds only synthetic manual-total assessment headers and append-only revision snapshots. No identity mapping, verified signature, eligibility, grade, recommendation or outcome fields exist yet.

Migration `0005_training_observations` implements a **bounded D0 subset**: `training_sessions` records observed action/time/actual minutes/completion; `training_feedback_revisions` stores append-only missing or recorded feedback, RPE 6–20 where present, text observations and correction reason; `safety_events` stores unclassified factual reports independently of feedback. All three have actor/time and participant scope; none has cycle/rule/prescription/review state. The target rows below describe later full functionality and are not claims about the current physical schema. No existing training data is backfilled into future cycles automatically.

| Entity | Key fields | Integrity and confidentiality |
|---|---|---|
| users | id, role, status, password_hash | never export secrets; participant scope via assignments |
| participant_assignments | user_id, participant_id | explicit object scope in addition to study assignment |
| study_assignments | user_id, study_id, site_id, permissions | authorization on every read/write |
| participants | id, study_id, study_code, eligibility_status | unique(study_id,study_code) |
| identity_mapping | participant_id, encrypted_identity/contact | separate access policy; optional in demo |
| consent_records (implemented synthetic subset) | id, participant_id, document_version, purpose_code, decision, photo_scope, change_reason, recorded_by/at | append-only simulated entries; no verified signature or photo upload |
| screening_records (implemented synthetic subset) | id, participant_id, item_code, answer, change_reason, recorded_by/at | append-only yes/no/unknown; no safe/eligible inference |
| write_receipts (implemented) | user_id, route_key, key, payload_hash, resource_id | atomic idempotency for intake and assessment writes |
| assessments (implemented synthetic subset) | id, participant_id, visit_kind, protocol_version, created_by/at | one participant many baseline/revisit records; no scheduled visit relation yet |
| assessment_revisions (implemented synthetic subset) | id, assessment_id, revision_no, state, metric_code, raw_value, unit, validity, missing_reason, performed_at, source, change_reason, recorded_by/at | one `sppb_total` snapshot per revision; unique(assessment_id, revision_no); append-only API |
| measurements | id, assessment_id, metric_code, raw_value, unit, validity, missing_reason, source | nullable raw; missing_reason when invalid |
| grading_results | id, assessment_id, rule_version_id, candidate_grade, evidence_json, confirmed_grade, reviewer_id, reviewed_at, status | predictions and approvals never conflated |
| tai_chi_recommendations | id, grade_result_id, rule_version_id, proposal_json, approved_json, reviewer_id, status | clinical approval required |
| experiment_cycles | id, study_id, protocol_version, starts_at, ends_at, status | exact dates from approved protocol |
| visits | id, participant_id, cycle_id, planned_at, performed_at, status | configurable schedule |
| training_sessions | id, participant_id, cycle_id, performed_at, planned_minutes, actual_minutes, support_type, completion_status, recommendation_version, idempotency_key | unique(actor/session idempotency scope) |
| post_training_feedback | id, session_id, revision, borg_rpe, difficulty, symptoms_json, observation_json, missing_json, reporter_id | unique(session_id,revision); retain versions |
| adverse_events | id, participant_id, session_id, event_time, reported_at, review_state, clinical_severity, action_json | severity only clinician-entered |
| cycle_outcomes | id, cycle_id, participant_id, baseline_assessment_id, endpoint_assessment_id | require valid linkage |
| rule_versions | id, version, source_refs_json, approval_state, effective_at | immutable after publication |
| image_assets | id, participant_id, consent_id, object_key, captured_at, retention_at, status | private object key; optional |
| dataset_snapshots | id, cycle_id, definition_hash, storage_key, row_count, manifest_json, frozen_at | immutable, reproducible |
| optimization_runs | id, snapshot_id, target_id, model_version, code_commit, metrics_json, safety_review, approval_state | candidate never automatically released |
| audit_logs | id, actor_id, action, object_type, object_id, occurred_at, summary_json | append-only; redact sensitive fields |

## Essential indexes and constraints
- `(participant_id, performed_at)` for longitudinal data; `(cycle_id, participant_id)` for sessions; `(review_state, reported_at)` for safety inbox.
- `borg_rpe BETWEEN 6 AND 20` if non-null; `SPPB_total BETWEEN 0 AND 12` only for **valid** confirmed scores; values outside domain rejected.
- `actual_minutes >= 0` if known; zero means actual observed zero, **null means unrecorded**.
- Foreign keys and organization scoping; do not cascade-delete research outcomes or audits by default.
- Dataset snapshot cannot reference hidden identity columns by default.

## Migration rules
Every schema PR includes Alembic migration + downgrade/rollback considerations + test data migration + dict update + privacy impact. Never silently change meaning of existing columns.

## Physical extension `0006_demo_v2` (2026-10-31)

The additive migration creates `demo_participant_profiles` (one optional synthetic display row per existing participant), `demo_grade_results` (unique confirmed `assessment_revision_id`, version, grade, separate mode and JSON evidence), `demo_actions` (marked local catalog), and `demo_runs` (participant/grade link, action IDs, progress/status, optional link to existing `training_sessions`). `0007_demo_completed_actions` adds nullable `completed_action_ids` so actual completed actions are not inferred from planned IDs. `training_feedback_revisions` and `safety_events` remain unchanged. No old rows are deleted or rewritten; an authorized plan read may create a missing Demo result for a preexisting confirmed assessment. The local existing volume was backed up before forward migration. No downgrade is authorized on a populated database.
