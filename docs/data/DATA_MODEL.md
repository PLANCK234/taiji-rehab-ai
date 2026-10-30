# Logical data model (initial proposal)

Use UUID primary keys, UTC `created_at`/`updated_at`, stable `study_code`, explicit soft-delete/retention policy only after approval. The following is a **logical contract**, not an implemented migration.

| Entity | Key fields | Integrity and confidentiality |
|---|---|---|
| users | id, role, status, password_hash | never export secrets; participant scope via assignments |
| study_assignments | user_id, study_id, site_id, permissions | authorization on every read/write |
| participants | id, study_id, study_code, eligibility_status | unique(study_id,study_code) |
| identity_mapping | participant_id, encrypted_identity/contact | separate access policy; optional in demo |
| consents | id, participant_id, version, signed_at, photo_scope, revoked_at | no photo without valid scope |
| screening_items | id, participant_id, code, answer, rationale, assessed_at | tri-state yes/no/unknown |
| assessments | id, participant_id, visit_id, type, status, performed_at, assessor_id | one participant many assessments |
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
