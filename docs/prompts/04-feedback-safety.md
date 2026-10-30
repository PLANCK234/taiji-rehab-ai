# Sprint 4 — Every training session must have feedback pathway

## Prompt to give Codex

> Read `AGENTS.md`, `docs/README.md`, `docs/ROADMAP.md`, and the relevant domain specifications before editing. Implement the following **single bounded milestone**. Use only synthetic data and do not invent clinical rules. First inspect current source and write a short plan. Then implement with migration, auth, audit, tests and docs updates as applicable.

## Scope
Create cycle-linked training sessions, idempotent write API, structured post-training form, RPE 6–20, explicit none vs symptom codes, completion/missingness, versioned corrections, event intake independent from finished form.

## Acceptance / exit
AT-06/07/08; abort with near-fall still reports incident, duplicates not created, UI explicitly shows feedback missing.

## Required final Codex report
- Changes and file paths; FR/AT IDs satisfied.
- Actual commands executed and outputs/pass-fail status (not hypothetical).
- Database/API/privacy impact and rollback.
- Remaining open questions, known limitations, next smallest task.

**Do not move to the next milestone when acceptance fails.**
