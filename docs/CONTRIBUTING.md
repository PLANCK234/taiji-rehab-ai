# Contributing / PR workflow

1. Choose a single requirement ID and acceptance test; create small PR branch (`feat/FR-006-feedback`, `fix/...`, `docs/...`).
2. Read root and nearest `AGENTS.md`, scope and evidence. For the CKLL-20260904 clinical-AI development authorization, proceed with the documented configuration/algorithm tasks; missing numeric inputs do not block building the framework. Record unsupported facts and changes outside that scope separately.
3. Update code, tests, DB migration, API contract and docs in the same PR when affected.
4. Verify lint/typecheck/tests and report commands and real outputs. Use synthetic fixtures only; never paste PHI in issues.
5. PR template: **Problem / Scope / Design / Clinical or privacy impact / Migration / Test evidence / Rollback / Linked FR-AT IDs**.
6. Require product/code reviewer plus appropriate clinical/security approval for clinical logic, deployment/data rules and ML release.

Commit style suggestion: Conventional Commits; not mandatory until team signs off. Avoid large unrelated format churn.

## Cross-developer workflow

2026-11-26用户要求：代码、文档、参数与证据更新均须通过功能分支提交PR；不得只留本地检查点。当前临床AI范围更新与公开批件副本进入PR #11；后续每个独立任务保留验收和提交记录。

- `main` is the stable integration branch. Use `feat/<task-id>-<description>`, `fix/<task-id>-<description>` or `docs/<description>` for local work; merge by reviewed PR.
- Agents may commit their scoped local changes. Do not force push, push to remote `main`, merge a PR or discard another person's uncommitted work without explicit developer authorization.
- Inspect `git status` before editing. When tasks run in parallel, agree on file ownership and migration order; do not create two competing Alembic heads.
- A new developer starts at [HANDOFF](HANDOFF.md), verifies it against Git and code, then uses [TASKS](TASKS.md). Each completed task gets a checkpoint, test evidence and an appended [session log](SESSION_LOG.md).
- A checkpoint is the latest successfully written Git commit and documentation state. Unexpected termination may lose later uncommitted work; inspect the worktree and resume from the last consistent checkpoint.
