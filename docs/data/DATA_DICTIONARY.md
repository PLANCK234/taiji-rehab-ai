# Data dictionary and missingness

| Variable | Type / unit | Source | Missingness / cautions |
|---|---|---|---|
| study_code | string | registration | no name/phone in general exports |
| participant.study_code | string | synthetic-only seed | unique within study; no name, phone or eligibility fields in S1 |
| user.email | string | synthetic staff seed | account identifier; never include in participant responses or audit summaries |
| age_years | integer years | clinician | scoped by protocol; no guessed age |
| sppb_total | integer 0–12 | clinician-confirmed evaluation | missing ≠ 0; score algorithm only after SOP approval |
| sppb_balance | source-defined score | evaluation | unit/formula to approve |
| gait_4m_seconds | decimal seconds | timed evaluation | distinguish not performed, unsafe, technical failure |
| sit_to_stand_5_seconds | decimal seconds | timed evaluation | recording method and support needed |
| frail_total | protocol-defined score | evaluation | need scale version |
| tug_seconds | decimal seconds | timed evaluation | optional by approved protocol |
| grip_strength_kg | decimal kg | dynamometer | record side/device if used |
| training_actual_minutes | decimal minutes | session observer | 0 observed is valid; missing is null |
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
