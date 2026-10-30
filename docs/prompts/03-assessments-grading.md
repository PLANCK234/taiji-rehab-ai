# Sprints 2–3 — Assessment and human-approved V0 grading

## Prompt to give Codex

> Read `AGENTS.md`, `docs/README.md`, `docs/ROADMAP.md`, and the relevant domain specifications before editing. Implement the following **single bounded milestone**. Use only synthetic data and do not invent clinical rules. First inspect current source and write a short plan. Then implement with migration, auth, audit, tests and docs updates as applicable.

## Scope
Implement draft assessment wizard, measurement validity/unit/missingness, manually confirmed SPPB total, V0 pure rule engine and grade review workflow. Tai Chi adaptation templates cannot become active without approved source metadata.

## Acceptance / exit
AT-02 boundary tests, AT-03 safety/unknown, AT-04 review audit; do not infer SPPB item scoring if SOP unavailable.

## Required final Codex report
- Changes and file paths; FR/AT IDs satisfied.
- Actual commands executed and outputs/pass-fail status (not hypothetical).
- Database/API/privacy impact and rollback.
- Remaining open questions, known limitations, next smallest task.

**Do not move to the next milestone when acceptance fails.**
