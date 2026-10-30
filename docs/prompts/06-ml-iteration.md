# Sprint 7 — Offline optimization and governed release

## Prompt to give Codex

> Read `AGENTS.md`, `docs/README.md`, `docs/ROADMAP.md`, and the relevant domain specifications before editing. Implement the following **single bounded milestone**. Use only synthetic data and do not invent clinical rules. First inspect current source and write a short plan. Then implement with migration, auth, audit, tests and docs updates as applicable.

## Scope
Implement feature/label registries, freeze-only dataset loading, patient-group and time-aware holdouts, simple baseline comparisons, metrics/errors by subgroup, immutable runs, approvals and shadow release. Small N must lead to honest uncertainty.

## Acceptance / exit
AT-10/11: unapproved model cannot publish, no leakage, results reproducible; never change official SPPB cutoff from exploratory fitting.

## Required final Codex report
- Changes and file paths; FR/AT IDs satisfied.
- Actual commands executed and outputs/pass-fail status (not hypothetical).
- Database/API/privacy impact and rollback.
- Remaining open questions, known limitations, next smallest task.

**Do not move to the next milestone when acceptance fails.**
