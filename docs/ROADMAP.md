# Implementation roadmap / executable milestones

**Principle:** one bounded Codex task/PR at a time; do not ask a model to build the entire site in one message. Actual study deployment has separate institutional gates.

REAL-01 authorizes independent nonclinical engineering while Stage 3 clinical rules remain blocked. `REAL-01D0` records only already-observed activity, feedback and unclassified events; it is not the Stage 4 protocol-bound prescription/session milestone. `REAL-01E0` and `REAL-01F0` will complete a synthetic database-backed cycle/export loop before any Research activation. See [TASKS](TASKS.md) and [ADR-0012](decisions/0012-training-observation-before-cycle.md).

| Stage | Deliverable | Prerequisite | Exit gate |
|---|---|---|---|
| 0 | monorepo skeleton, package tooling, docker, CI, synthetic seed | docs reviewed | commands run, test DB boots |
| 1 | login/session/RBAC, study assignments, consent, participant CRUD | 0 | deny cross-study and no-consent cases |
| 2 | assessment wizard, validity/missingness, revisit history | 1, measurement SOP scope | raw values persist, draft/confirm separated |
| 3 | V0 rule engine, evidence/version, review UI | 2, clinical rule decision | edge cases and approvals tested |
| 4 | session + structured post-training feedback, AE intake | 3 | aborted event before full feedback; idempotency |
| 5 | cycles/visits, trend, anonymized CSV, immutable frozen snapshot | 4 | full E2E and snapshot reproducibility |
| 6 | optional image capture demo shell | consent/image decision or synthetic only | never shows fake recognition |
| 7 | offline ML experiments, baseline comparison, registry, shadow rollout | complete dataset and target approval | participant-split tests, double review |
| 8 | pilot hardening, documentation and deployment | security/ethics approvals | restore drill and clinical UAT |

Sprint tasks reside in `prompts/`. For each stage write code + migrations + tests + updated docs. Small exploratory dataset may mean Sprint 7 delivers only reproducible statistical analysis, not a model with demonstrated clinical utility.
