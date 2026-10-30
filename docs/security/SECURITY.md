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

## Roles (initial recommendation)
- Clinician/therapist: assigned participant assessments and reviews.
- PI/clinical approver: approves clinical adaptation rules and significant changes.
- Research assistant: limited encounter/feedback entry, not treatment approval.
- Analyst: coded exports, no identity mapping by default.
- Admin/operator: manage accounts/backups, not automatic clinical-record viewing.

## Deployment gate (must sign off)
Approved protocol/ethics, purpose and consent language, legal retention, data-controller and hosting jurisdiction, access roster, incident response ownership, image policy, backup/restore test, dependency and vulnerability review. Product claims and potential medical-device status require institutional/regulatory review; this document does not certify compliance.
