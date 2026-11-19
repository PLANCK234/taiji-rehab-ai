# ADR-0019: Opt-in synthetic staff administration

Date: 2026-11-06. Status: engineering proposal; no institutional approval.

## Context

REAL-01A needs a usable administrator workflow while Research access and real identity handling remain closed. The existing seed can rerun and recreate missing assignments, which would undo a deliberate revocation.

## Decision

Expose administration only in the synthetic Demo profile. The seed creates `demo-admin@example.org` only with explicit `SEED_DEMO_ADMIN=true` in local mode; it uses the locally supplied Demo password. The admin may create only `demo-…@example.org` staff in the four non-admin staff roles, then change role, active state, and `SYN-` study/object assignments. Writes require CSRF, idempotency and expected current state. Each change creates an append-only `synthetic_staff_changes` record and an audit event. Study revocation removes dependent object assignments; a seed rerun checks the latest change history before restoring any marked default assignment. Deactivation and role change revoke live sessions.

## Consequences

There is no real identity import, self-service signup, password reset workflow, or admin access to individual clinical records. The seed flag must remain off on a publicly shared local Demo unless an operator explicitly intends to test administrator access. Admin changes on a populated database must use forward migrations and a backup; downgrade is only for an empty disposable database.

## Revisit

Revisit when the institution approves a real staff roster, identity provider, administration policy and production hosting. No clinical rule or protocol is established here.
