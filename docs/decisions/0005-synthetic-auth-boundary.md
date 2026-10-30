# ADR-0005: Synthetic-only auth and coded scope before participant workflow

- **Status:** Accepted for local engineering; not clinical or production approval
- **Date:** 2026-10-30

## Context
S1-01 needs testable session, role and participant authorization before consent, identity policy and export approval are settled. Q-01/Q-07/Q-08 remain unresolved.

## Decision
Create staff sessions, study membership and explicit coded-participant assignments in PostgreSQL. Permit only synthetic local seed data. A participant read requires all three gates: role, study and object assignment. Keep account provisioning, identity mapping, consent and bulk export out of this task. Return uniform 403 for unknown/unassigned object IDs.

## Alternatives considered
A study-only check would expose all objects within a study. Implementing real identity or export now would require unresolved governance decisions. In-memory sessions would not survive process restart or support consistent revocation.

## Consequences
S1-01 verifies the read/scope portion of AT-05; unauthorized export remains for the later export milestone. Session/rate-limit records require an approved retention policy before any real deployment. Downgrade of `0002_auth_scope` destroys its tables and is only tested on empty synthetic data.
