# System design: modular monolith

## Components and boundaries
| Module | Owns | Must not own |
|---|---|---|
| Auth | sessions, users, roles, assignments | clinical grade logic |
| Participant | study code, consent, demographics mapping | unapproved image retention |
| Assessment | visit measurement, valid/missing/raw, review | hallucinated SPPB scoring |
| Grading | approved versioned rule evaluation, review decisions | real-time model training |
| Training | sessions, feedback, dose, idempotency | endpoint efficacy inference |
| Safety | symptom/event intake, triage workflow | autonomous serious-event diagnosis |
| Research | visits, cycles, exports, snapshots | mutation of confirmed measurements |
| Model Registry | candidate evaluation, approvals, release | direct patient auto-prescribing |
| Audit | actor/time/version/action | secrets or complete original images |

## Request path
Browser → TLS reverse proxy → Next.js → FastAPI route → session auth → participant-scope RBAC → schema validation → domain service → DB transaction → append audit → response. Data export is asynchronous if needed and expires after an approved interval. In MVP, background jobs can use controlled server-side commands instead of new queues.

## Lifecycle boundaries
- Independent objects: assessments, grade candidates, human confirmation, tai chi adaptation proposals, sessions, post-session feedback, adverse events, cycle outcomes, frozen datasets, optimization runs.
- An assessment correction creates a new revision. Recalculate a **new** candidate if needed; never mutate the previously published grade history.
- Model artifact immutable by version. Release pointer changes only after approval and rollback plan.
- Demo-only image upload may remain disabled if explicit consent and image retention rules are not decided.

## Operational design
- Health checks distinguish process health from DB readiness; logs use request ID and pseudonymous identifiers only.
- DB migrations must be backward-compatible on deployment; backups before schema changes and verified rollback.
- Browser-local storage cannot persist participant PHI by default.

## System quality targets (proposed, not contractual)
P95 ordinary read/write ≤2 s in agreed test environment; synthetic load 20 concurrent sessions / 5 staff accounts; restore objectives to be approved. Measure before adopting these as release gates.
