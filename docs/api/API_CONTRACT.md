# REST API contract (proposed /api/v1)

**Status**: Sprint 1 implements authentication, coded reads and synthetic intake; S2-01 adds synthetic manual SPPB total assessment entry below. Other routes remain design proposals. `GET /health` (`{"status":"ok"}`) and DB `GET /ready` (`{"status":"ready"}` or 503) are public. Implemented business routes are prefixed `/api/v1`; use JSON, UUIDs, server-side session/RBAC/study/participant scope. All require authentication except login. Error format is in [ERRORS.md](ERRORS.md).

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
| POST `/api/v1/assessments` | Creates one unrecorded draft for an assigned participant with current simulated consent; clinician/assistant |
| GET `/api/v1/assessments/{id}` | Returns current revision and newest-first full history within assigned scope |
| PUT `/api/v1/assessments/{id}/measurements` | Appends a manual `sppb_total` draft with `expected_revision`; clinician/assistant |
| POST `/api/v1/assessments/{id}/confirm` | Appends a confirmed copy of the current recorded draft; clinician/clinical approver |

These are synthetic-only demo routes. All intake and assessment writes require a matching `X-CSRF-Token` and `Idempotency-Key` (16–128 ASCII letters/digits/`._-`). Repeating a key with the same body returns the same record; using it with another body returns 409. Corrections append a record and require a `SYN-` change reason. Consent `granted` is only a simulated staff entry, not a verified signature or ethics approval. Screening returns `not_assessed` with no entries and `needs_review` with any entries; it never concludes safe/eligible. Photo collection stays unavailable even when `photo_scope=true`. Assessments accept only `baseline`/`revisit`, manual `sppb_total` in points, and protocol marker `SYN-MANUAL-V1`. Valid values are integer 0–12 plus timezone-aware `performed_at`; missing is null value plus reason and no measurement time; invalid can retain a raw value with a reason. An initial unrecorded draft cannot be confirmed. Measurement corrections need a `SYN-` reason. The expected revision yields 409 on stale writes, and all revisions retain actor and UTC time. There is no item scoring, grade, eligibility or advice endpoint. No identity mapping, real patient creation, export or image endpoint exists. See generated [OpenAPI](../../backend/openapi.json).

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
| POST `/training-sessions` | staff | idempotency key; bind current version |
| PUT `/training-sessions/{id}/feedback` | staff | append new revision; allow partial/aborted |
| POST `/training-sessions/{id}/events` | staff | independent urgent safety report |
| GET `/participants/{id}/timeline` | staff | longitudinal authorized view |
| GET `/cycles` | staff | planned visits and outcomes |
| POST `/cycles/{id}/freeze` | data manager | audited immutable snapshot |
| POST `/research/exports` | approved analyst | de-identified CSV, audited access |
| POST `/optimization-runs` | ML/data manager | snapshot + target + experiment version |
| GET `/optimization-runs/{id}` | ML/clinical | evaluation report; no silent deployment |
| POST `/model-versions/{id}/review` | approved clinical/data reviewers | explicit approvals and rollback route |
| POST `/assessments/{id}/images` | image-authorized staff | demo gated by consent, retention policy |

## Example: training feedback
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
