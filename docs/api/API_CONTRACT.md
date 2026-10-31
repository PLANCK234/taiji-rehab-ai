# REST API contract (proposed /api/v1)

**Status**: Sprint 1 implements authentication, coded reads and synthetic intake; S2-01 adds synthetic manual SPPB total assessment entry, and ENG-02A adds a read-only trend projection. Other routes remain design proposals. `GET /health` (`{"status":"ok"}`) and DB `GET /ready` (`{"status":"ready"}` or 503) are public. Implemented business routes are prefixed `/api/v1`; use JSON, UUIDs, server-side session/RBAC/study/participant scope. All require authentication except login. Error format is in [ERRORS.md](ERRORS.md).

| Implemented path | Behavior |
|---|---|
| POST `/api/v1/auth/login` | Validates email/password, rate limits, issues opaque HttpOnly session and readable CSRF cookie; generic failure |
| GET `/api/v1/auth/me` | Current staff ID, email, role; 401 if absent/expired/revoked |
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
