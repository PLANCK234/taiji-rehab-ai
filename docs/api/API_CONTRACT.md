# REST API contract (proposed /api/v1)

**Status**: Sprint 1 implements the authentication and coded-read subset below. Other routes remain design proposals. `GET /health` (`{"status":"ok"}`) and DB `GET /ready` (`{"status":"ready"}` or 503) are public. Implemented business routes are prefixed `/api/v1`; use JSON, UUIDs, server-side session/RBAC/study/participant scope. All require authentication except login. Error format is in [ERRORS.md](ERRORS.md).

| Implemented path | Behavior |
|---|---|
| POST `/api/v1/auth/login` | Validates email/password, rate limits, issues opaque HttpOnly session and readable CSRF cookie; generic failure |
| GET `/api/v1/auth/me` | Current staff ID, email, role; 401 if absent/expired/revoked |
| POST `/api/v1/auth/logout` | Requires matching CSRF header and cookie; revokes session |
| GET `/api/v1/studies` | Lists only assigned synthetic study codes |
| GET `/api/v1/participants/{id}` | Returns code only when role, study assignment and participant assignment all permit it; otherwise 403 |

These are synthetic-only demo routes. No account provisioning, patient creation, identity mapping, consent, assessment, export or image endpoint exists yet. See generated [OpenAPI](../../backend/openapi.json).

| Method and path | Authorized purpose | Critical behavior |
|---|---|---|
| POST `/auth/login` | staff | secure HttpOnly cookie, rate limit, safe error |
| POST `/auth/logout` | staff | revoke session |
| GET/POST `/participants` | assigned staff | future list/create study-code record, consent checks |
| PATCH `/participants/{id}` | assigned staff | future scoped update and optimistic version checks |
| POST `/participants/{id}/screenings` | clinician | tri-state and source |
| POST `/assessments` | assessor | base / revisit, draft first |
| PUT `/assessments/{id}/measurements` | assessor | per-metric missingness + units |
| POST `/assessments/{id}/confirm` | clinician | immutable confirmed revision |
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
