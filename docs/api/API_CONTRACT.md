# REST API contract (proposed /api/v1)

**Status**: Sprint 1 implements authentication, coded reads and synthetic intake; S2-01 adds synthetic manual SPPB total assessment entry, and ENG-02A adds a read-only trend projection. Other routes remain design proposals. `GET /health` (`{"status":"ok"}`) and DB `GET /ready` (`{"status":"ready"}` or 503) are public. Implemented business routes are prefixed `/api/v1`; use JSON, UUIDs, server-side session/RBAC/study/participant scope. All require authentication except login. Error format is in [ERRORS.md](ERRORS.md).

| Implemented path | Behavior |
|---|---|
| POST `/api/v1/auth/login` | Validates email/password, rate limits, issues opaque HttpOnly session and readable CSRF cookie; generic failure |
| GET `/api/v1/auth/me` | Current account ID, email, role; 401 if absent/expired/revoked |
| POST `/api/v1/auth/logout` | Requires matching CSRF header and cookie; revokes session |
| GET `/api/v1/studies` | Lists only assigned synthetic study codes |
| GET `/api/v1/participants/{id}` | Returns code only when role, study assignment and participant assignment all permit it; otherwise 403 |
| GET `/api/v1/participants` | Lists coded objects only when role, study and object assignments permit them |
| POST `/api/v1/participants` | Creates a `SYN-` coded object in an assigned study and assigns its creator; clinician/assistant only |
| GET/POST `/api/v1/participants/{id}/consents` | Reads/adds append-only simulated consent records; document/purpose codes must start `SYN-` |
| GET/POST `/api/v1/participants/{id}/screenings` | Reads/adds append-only `yes`/`no`/`unknown` synthetic item records; writing requires latest consent decision `granted` |
| GET `/api/v1/participants/{id}/assessments` | Lists baseline/revisit manual-total assessments within assigned study and object scope |
| GET `/api/v1/participants/{id}/assessment-trend` | Read-only, audited manual-total sequence for clinician/clinical approver/research assistant with both study and object assignment; unknown/unassigned/analyst return 403 |
| POST `/api/v1/assessments` | Creates one unrecorded draft for an assigned participant with current simulated consent; clinician/assistant |
| GET `/api/v1/assessments/{id}` | Returns current revision and newest-first full history within assigned scope |
| PUT `/api/v1/assessments/{id}/measurements` | Appends a manual `sppb_total` draft with `expected_revision`; clinician/assistant |
| POST `/api/v1/assessments/{id}/confirm` | Appends a confirmed copy of the current recorded draft; clinician/clinical approver |
| GET/POST `/api/v1/participants/{id}/training-sessions` | Scoped list / idempotent creation of **observed** activity only; current simulated consent required to create; no cycle or prescription yet |
| GET `/api/v1/training-sessions/{id}` | Scoped, audited observation detail |
| GET/PUT `/api/v1/training-sessions/{id}/feedback` | Ordered append-only feedback history / expected-revision write; first revision 0, later corrections require reason; missing vs recorded mutually exclusive |
| GET/POST `/api/v1/participants/{id}/safety-events` | Scoped list / independent idempotent fact report, possible before feedback; no clinical severity, escalation SLA or notification |
| GET `/api/v1/participants/{id}/research-export.csv` | Audited, single-object live Demo CSV for existing read roles only; all assessment/feedback revisions, training sessions and event existence, no identity/free text; response has `X-Row-Count`, `X-Content-SHA256`, `X-Export-Mode: live-demo` and `Cache-Control: no-store` |
| GET `/api/v1/patient/me` | Demo-only patient role with active binding; returns own synthetic `study_code` and optional current non-actionable publication card; audit; no staff data, Demo plan or clinical advice |
| POST `/api/v1/participants/{id}/demo-patient-binding/revoke` | Assigned clinician with CSRF revokes the active synthetic patient binding and its active sessions; audited; 404 if no active binding |
| GET `/api/v1/participants/{id}/demo-patient-publications` | Assigned staff reads append-only synthetic publication/withdrawal versions; patient role denied |
| POST `/api/v1/participants/{id}/demo-patient-publications` | Assigned clinician only; fixed non-actionable card, `publish|withdraw`, `expected_version`, literal synthetic acknowledgement, CSRF and idempotency key; no client plan/video content accepted |

`DEMO-V2-11` adds one seed-only synthetic patient binding and an independent `/patient` page. Patient role is denied staff study/object lists, object reads, exports and Demo plan routes by backend role checks. Revoked bindings are never silently reactivated by seed. There is no patient self-registration, real identity binding, published plan/video or patient feedback write API.

`DEMO-V2-12` adds only a versioned `SYNTHETIC_PROCESS_ONLY` test card. The patient response contains `{study_code, publication}`; `publication` is null unless the latest event is `published` and current simulated consent is granted. The card contains version, state, fixed non-actionable message and `video_status=awaiting_review`; it contains no action list, dose, video URL or clinician-confirmed plan. Publishing requires an active binding and current simulated consent; withdrawing remains possible after consent changes. A stale `expected_version` returns 409. See [ADR-0016](../decisions/0016-synthetic-patient-publication-card.md).

`DEMO-V2-13` adds synthetic-only `GET/POST /api/v1/patient/reports`, `POST /api/v1/patient/reports/{report_id}` and assigned-staff `GET /api/v1/participants/{id}/patient-reports`. Reads return all revisions (empty means unknown). Writes require active patient binding, current simulated consent, CSRF, idempotency key and `expected_revision` (0 for new, current revision for correction); a correction needs a `SYN-` reason, stale versions return 409. The body has `observed_at` (timezone-aware), `activity_state=performed|not_performed|unknown`, optional `actual_minutes` only when performed, `discomfort_state=reported|none|unknown`, and `discomfort_note` only when reported. Responses include `report_id`, revision, actor and timestamps. No completion, risk category, notification or clinical action is inferred. See generated [OpenAPI](../../backend/openapi.json) and [ADR-0017](../decisions/0017-synthetic-patient-self-report.md).

These are synthetic-only demo routes. All intake and assessment writes require a matching `X-CSRF-Token` and `Idempotency-Key` (16–128 ASCII letters/digits/`._-`). Repeating a key with the same body returns the same record; using it with another body returns 409. Corrections append a record and require a `SYN-` change reason. Consent `granted` is only a simulated staff entry, not a verified signature or ethics approval. Screening returns `not_assessed` with no entries and `needs_review` with any entries; it never concludes safe/eligible. S6-01 adds only the server-guarded Next page `/participants/{id}/pose-demo` with a browser-local synthetic SVG preview; photo collection stays unavailable even when `photo_scope=true`, and there is no image API. Assessments accept only `baseline`/`revisit`, manual `sppb_total` in points, and protocol marker `SYN-MANUAL-V1`. Valid values are integer 0–12 plus timezone-aware `performed_at`; missing is null value plus reason and no measurement time; invalid can retain a raw value with a reason. An initial unrecorded draft cannot be confirmed. Measurement corrections need a `SYN-` reason. The expected revision yields 409 on stale writes, and all revisions retain actor and UTC time. There is no item scoring, grade, eligibility or advice endpoint. No identity mapping, real patient creation or export endpoint exists. See generated [OpenAPI](../../backend/openapi.json).

ENG-02A trend response is `{participant_id, entries}` ordered by assessment `created_at` and ID. Each entry has `assessment_id`, `visit_kind`, `created_at`, `current` (latest revision, including a pending draft) and `latest_confirmed` (most recent confirmed revision or `null`). The UI charts only `latest_confirmed` with `validity=valid` and non-null total; a later draft is shown separately. Missing, invalid and unconfirmed entries have no plotted value. This is descriptive history without a cycle schedule, clinical grade, efficacy label or result aggregation. A failed read is not an empty `entries` array.

| Method and path | Authorized purpose | Critical behavior |
|---|---|---|
| POST `/auth/login` | staff | secure HttpOnly cookie, rate limit, safe error |
| POST `/auth/logout` | staff | revoke session |
| GET/POST `/participants` | assigned staff | implemented synthetic coded list/create; real enrollment still future |
| PATCH `/participants/{id}` | assigned staff | future scoped update and optimistic version checks |
| POST `/participants/{id}/screenings` | assigned clinician/assistant | implemented synthetic tri-state; no clinical item or safety decision |
| POST `/assessments` | clinician/assistant | implemented synthetic manual-total baseline/revisit draft |
| PUT `/assessments/{id}/measurements` | clinician/assistant | implemented append-only SPPB total, validity and missingness |
| POST `/assessments/{id}/confirm` | clinician/clinical approver | implemented immutable confirmed revision |
| POST `/assessments/{id}/grade-candidates` | clinician | published rule candidate only |
| POST `/grading-results/{id}/review` | clinician | approve/revise/reject + reason |
| POST `/training-sessions` | staff | future protocol-bound training plan/version; D0 observation endpoint above does not publish a plan |
| POST `/training-sessions/{id}/events` | staff | future clinically reviewed event workflow; D0 uses participant-scoped fact reports above |
| GET `/participants/{id}/timeline` | staff | longitudinal authorized view |
| GET `/cycles` | staff | planned visits and outcomes |
| POST `/cycles/{id}/freeze` | data manager | audited immutable snapshot |
| POST `/research/exports` | approved analyst | de-identified CSV, audited access |
| POST `/optimization-runs` | ML/data manager | snapshot + target + experiment version |
| GET `/optimization-runs/{id}` | ML/clinical | evaluation report; no silent deployment |
| POST `/model-versions/{id}/review` | approved clinical/data reviewers | explicit approvals and rollback route |
| POST `/assessments/{id}/images` | image-authorized staff | future proposal only; absent until ethics, consent, storage and retention approvals |

## REAL-01D0 observation payload

REAL-01F0 CSV columns are enumerated in [DATA_DICTIONARY](../data/DATA_DICTIONARY.md). A download is a live query, not a frozen cycle snapshot. The SHA-256 verifies only emitted UTF-8 bytes. Missing numeric values are empty CSV cells; an observed zero remains `0`. Historical revisions remain separate rows, with `parent_id` and `revision_no`. Free text, names, contact details, staff email and passwords are omitted. The endpoint is unavailable under the Research profile.

Session POST: `{"session_at":"2026-10-01T01:30:00Z","action_label":"SYN-OBSERVED-ACTION","actual_minutes":0,"completion_status":"interrupted","notes":null}`. `actual_minutes=null` means unknown; `0` is an observed zero. Feedback PUT: `{"expected_revision":0,"state":"missing","missing_reason":"interrupted"}` or `{"expected_revision":0,"state":"recorded","rpe":6,"fatigue":"SYN-OBSERVED"}`. A correction sends `expected_revision=1` plus `change_reason`; 409 on stale revision. RPE is an input domain from the PRD, not an efficacy or safety judgment. Event POST uses `event_at`, optional `session_id`, and required factual `description`. All writes need CSRF and idempotency; role plus study and participant assignments are checked server-side.

## Future protocol-bound training feedback example (not the D0 endpoint)
```json
{
  "session_id": "<uuid>",
  "revision_reason": "initial_entry",
  "borg_rpe": 12,
  "actual_minutes": 16,
  "completion_status": "partial",
  "support_type": "chair_supported",
  "symptoms": ["none"],
  "difficulty": "moderate",
  "missing": {},
  "recorded_source": "clinician_interview"
}
```
`<uuid>` is a placeholder, not an actual identifier. Symptoms `none` cannot co-exist with symptom codes. Actual minutes can also live on the session model; a transaction must keep these consistent or choose one authoritative field in implementation.

## Idempotency, concurrency and error handling
- POST writes involving sessions/events require `Idempotency-Key`; enforce a uniqueness scope by actor + route + key.
- `If-Match` or explicit revision required on sensitive changes; 409 on conflict.
- 401 no login, 403 out of scope, 422 invalid/unknown medical input, 409 conflict, 423 locked snapshot, 503 dependency unavailable.
- Audit actor, timestamp, object version and reason for clinical modifications and exports.

## API documentation generation
Once backend exists, commit its OpenAPI spec export and compare to this contract in CI. Amend this file deliberately whenever a public endpoint changes.

## DEMO-V2 synthetic display and training API (implemented)

All endpoints use the existing staff session and server-side study/participant scope; writes require CSRF. `APP_PROFILE=research` still rejects business access. These are `DEMO_ONLY` display records, not FR-004/005 clinical publication.

| Method/path | Meaning |
|---|---|
| `POST /api/v1/participants/{id}/demo-profile` / `GET .../demo-profile` | Create once/read optional synthetic `age`, `sex`, `needs_assistance`, `note`; conflicting second create 409 |
| `GET /api/v1/participants/{id}/demo-plan` | Latest confirmed assessment revision, persisted `demo-rule-v1` result/evidence, current run and planned actions; no confirmed assessment → `grade:null` |
| `GET /api/v1/demo-actions` | Enabled marked `DEMO_ONLY` action cards from PostgreSQL |
| `POST /api/v1/participants/{id}/demo-runs` | `{}` with `Idempotency-Key`; replays or an existing active run return same run; only I/II/III with actions and current simulated consent |
| `GET /api/v1/demo-runs/{runId}` | Persisted run state, scoped to participant |
| `POST /api/v1/demo-runs/{runId}/step` | `{expected_status,action}`; pause/resume/next/previous; stale state 409 |
| `POST /api/v1/demo-runs/{runId}/end` | `{actual_minutes,completion_status,notes?,completed_action_ids?}`; actual completed IDs must belong to this run, null means unknown; creates one original `training_sessions` observation and moves to `awaiting_feedback`; same payload repeat returns same record, differing repeat 409 |
| `POST /api/v1/demo-runs/{runId}/complete` | `{}`; requires existing `training_feedback_revisions` row for linked session; repeated completion returns same run |
| `POST /api/v1/demo-runs/{runId}/stop` | `{}`; persists `stopped` plus interrupted observation with unknown actual minutes; feedback/event can be added through existing endpoints |

Assessment confirmation (`POST /assessments/{id}/confirm`) additionally persists one `demo_grade_results` per confirmed revision. Existing assessment/training response shapes and endpoints remain valid. The generated OpenAPI snapshot is `backend/openapi.json`.
