# Codex task cards and prompt workflow

These are reusable **human-approved tasks**, not commands executed by this package.

### Recommended one-task prompt template
```text
Work on [one FR ID] in this repository.
Read AGENTS.md, docs/README.md, relevant design, ROADMAP and current implementation.
Scope: [explicit inclusions/exclusions].
Deliverables: [files and behavior].
Constraints: synthetic data only; no new clinical cutoffs; review authorization/audit/missingness.
Acceptance: [AT IDs] and commands actually executed.
First briefly propose an implementation plan; then make the smallest complete patch.
Finish with changed files, tests+results, risks, unresolved decisions, next PR.
```

Execute in order: [01 bootstrap](01-bootstrap.md) → [02 auth](02-auth-patients.md) → [03 assessment](03-assessments-grading.md) → [04 feedback](04-feedback-safety.md) → [05 cycles](05-cycles-export.md) → [06 ML](06-ml-iteration.md) → [07 hardening](07-hardening.md). Review each stage before continuing.

For a fresh session, use [continue](continue.md). To close and persist a checkpoint, use [handoff](handoff.md); normal task completion should trigger the same handoff without an extra reminder.
