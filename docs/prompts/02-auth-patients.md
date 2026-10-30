# Sprint 1 — Authentication, consent and participants

## Prompt to give Codex

> Read `AGENTS.md`, `docs/README.md`, `docs/ROADMAP.md`, and the relevant domain specifications before editing. Implement the following **single bounded milestone**. Use only synthetic data and do not invent clinical rules. First inspect current source and write a short plan. Then implement with migration, auth, audit, tests and docs updates as applicable.

## Scope
Implement session cookies + CSRF, users/role/scope assignments, participant coded IDs, optional separated identity mapping, consent and tri-state safety screening.

## Acceptance / exit
Cross-study IDOR and unauthorized export tests return 403, missing consent blocks photo capture, audit and synthetic seeds verified.

## Required final Codex report
- Changes and file paths; FR/AT IDs satisfied.
- Actual commands executed and outputs/pass-fail status (not hypothetical).
- Database/API/privacy impact and rollback.
- Remaining open questions, known limitations, next smallest task.

**Do not move to the next milestone when acceptance fails.**
