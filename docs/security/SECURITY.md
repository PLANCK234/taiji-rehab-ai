# Security, privacy and clinical safety requirements

## Core protection
1. Human-only accounts for research staff; secure session cookie (HttpOnly, Secure, SameSite), CSRF protection, rate-limited login, password hash with proven scheme and proper secrets rotation.
2. RBAC **and** participant/study scope checked by backend for each endpoint, CSV export, image read and model report.
3. Separate encrypted identity mapping from coded research records. Minimize collection; do not log secrets, full symptoms/free text, images or identities.
4. HTTPS everywhere; encrypted at rest/backup per institution requirements; private Postgres and object store; expiring authorized downloads and export audit.
5. Consent records specify version, purpose, photo retention and withdrawal; absent/withdrawn consent must block new collection within that scope.
6. Default demo environments contain synthetic data only. Do not send sensitive health data to public GPT, third-party analytics, error reporting or source-control issues.
7. Redaction test for logs, exports and CI fixtures. Backups encrypt and test restore; controlled retention/deletion depends on approved data policy.
8. Clinical safety: symptom report accessible even if full feedback incomplete. Display emergency/stop messages per approved policy; do not autonomously determine SAE or resumption of exercise.

## Implemented S1 synthetic-only boundary

- Staff passwords use Argon2 via `pwdlib`; 32-byte opaque session tokens are hashed in PostgreSQL. Sessions expire after eight hours and are revoked on logout. Cookies are HttpOnly/Strict; `Secure` and `__Host-` prefix apply outside local/test HTTP. Logout requires a matching CSRF header and cookie; browser login origins are checked.
- Login failures are limited per HMAC-hashed email/client-host key in a 15-minute window. Audit events record login, logout and coded-record read outcomes without credentials, raw email/IP or clinical data.
- Coded participant reads require an allowed role, study assignment **and** explicit participant assignment. Unknown and unassigned IDs both return 403. The admin and analyst roles have no individual participant read permission.
- `ALLOW_SYNTHETIC_ONLY=true` and `APP_ENV=local`/`test` are required for protected database routes. Seed creation additionally requires `APP_ENV=local` and an explicit local password. No real data or production permission is implied. Export and identity mapping remain unavailable.

## S1-02 synthetic intake boundary

- Coded creation accepts only `SYN-` codes, checks role and study assignment, then atomically assigns the creator. List/detail and all consent/screening routes require server-side study **and** object assignment. Writes additionally require CSRF and an idempotency key; audit records permitted and denied operations without form contents.
- Consent and screening entries append revisions with staff actor and UTC time. Subsequent consent entries and same-item screening corrections require a synthetic reason code. Without the latest simulated `granted` consent, screening writes return 403. Absent screening returns `not_assessed`; any entries return `needs_review`, never a safety or enrollment clearance.
- No name/contact fields, verified signature, clinical screening questions, identity mapping, file storage or image upload endpoint is implemented. A recorded photo scope does not enable upload. Q-01/Q-07/Q-10 remain unresolved; no real data collection is authorized.

## S2-01 synthetic assessment boundary

- Baseline/revisit assessment reads and writes require role, assigned study and explicit object assignment on the server. Unknown or unassigned assessment IDs return 403. Writes additionally check current simulated `granted` consent, CSRF, idempotency key and expected revision; withdrawal blocks subsequent writes and confirmations.
- Clinician and research assistant can create/revise manual total drafts; clinician and clinical approver can confirm a recorded draft. Every measurement or confirmation appends an attributable snapshot. A correction after a recorded value requires a `SYN-` reason. Audit records allow/deny outcomes without raw values.
- `SYN-MANUAL-V1` is a synthetic engineering marker. No approved SPPB item algorithm, grading, safety determination or treatment recommendation is inferred from a total; no real-data use is authorized. Downgrade `0004_manual_assessments` removes tables and is rehearsed only on a disposable empty database.
- REAL-01D0 training observations and event reports use server-side role/study/participant scope, CSRF, idempotency and audit; feedback corrections append versions. Current simulated consent gates new activity/feedback, while authorized staff can report an event after withdrawal to preserve an observed fact. Free-text fields may contain sensitive content in a future Research deployment, so this Demo-only path cannot be used for real patients. Events are not classified, notified or escalated by this application; use an approved institutional process. Downgrade `0005_training_observations` is rehearsed only on a disposable empty database.
- REAL-01F0 export is a single assigned synthetic participant per request. The API enforces role/study/object scope, audits allowed and denied authenticated attempts, excludes identity and free-text columns, forbids caching and exposes row count/content hash. It is a live Demo query, not approved bulk/real-data export or a frozen snapshot; Q-07/Q-09 and institutional controls are still prerequisites for Research release.

## S6-01 synthetic pose shell boundary

- The Next page `/participants/{id}/pose-demo` checks the logged-in staff member and reads the coded participant through the existing server-side study and object scope. An unknown or out-of-scope object cannot render the page.
- Its client component creates only an inline synthetic SVG held in React state. It contains no camera permission request, file input, upload request, local storage or image persistence. Simulated consent `photo_scope=true` changes only the explanatory text and does not enable image collection.
- The backend publishes no `/images` or `/uploads` route. Real photos, video, pose estimates, object storage and retention remain blocked by Q-01/Q-10 and the deployment gate.

## ENG-02A synthetic trend read boundary

- The read-only assessment trend route reuses server-side role, study assignment and explicit participant assignment checks. Analyst/admin roles cannot directly read a coded participant trend; denied reads are audited through the participant guard, and allowed reads add an `assessment_trend` audit event.
- The response contains only the authorized coded participant ID and existing assessment revisions, with no identity mapping or export. Latest confirmed values and pending drafts remain distinct; missing, invalid and unconfirmed records do not become zero scores or a clinical conclusion. Responses retain `Cache-Control: no-store`.

## Roles (initial recommendation)
- Clinician/therapist: assigned participant assessments and reviews.
- PI/clinical approver: approves clinical adaptation rules and significant changes.
- Research assistant: limited encounter/feedback entry, not treatment approval.
- Analyst: coded exports, no identity mapping by default.
- Admin/operator: manage accounts/backups, not automatic clinical-record viewing.

## Deployment gate (must sign off)
Approved protocol/ethics, purpose and consent language, legal retention, data-controller and hosting jurisdiction, access roster, incident response ownership, image policy, backup/restore test, dependency and vulnerability review. Product claims and potential medical-device status require institutional/regulatory review; this document does not certify compliance.
