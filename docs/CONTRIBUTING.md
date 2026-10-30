# Contributing / PR workflow

1. Choose a single requirement ID and acceptance test; create small PR branch (`feat/FR-006-feedback`, `fix/...`, `docs/...`).
2. Read root and nearest directory `AGENTS.md`; note related open questions. Stop if medical rule is unresolved.
3. Update code, tests, DB migration, API contract and docs in the same PR when affected.
4. Verify lint/typecheck/tests and report commands and real outputs. Use synthetic fixtures only; never paste PHI in issues.
5. PR template: **Problem / Scope / Design / Clinical or privacy impact / Migration / Test evidence / Rollback / Linked FR-AT IDs**.
6. Require product/code reviewer plus appropriate clinical/security approval for clinical logic, deployment/data rules and ML release.

Commit style suggestion: Conventional Commits; not mandatory until team signs off. Avoid large unrelated format churn.
