# ADR-0004: Repository-based agent handoff

- **Status:** Accepted as an engineering workflow; not a clinical decision
- **Date:** 2026-10-30

## Context
Development spans Codex sessions and computers. Chat context is not durable or independently reviewable, and a crash can occur between tasks.

## Decision
Store task state in `TASKS.md`, measured progress in `STATUS.md`, a concise current checkpoint in `HANDOFF.md`, and append-only summaries in `SESSION_LOG.md`. Check Git and code on entry. Run `scripts/check_handoff.py` for structural and link validation. Create a local commit after a verified task when practical.

## Alternatives considered
Chat-only memory loses cross-device history. A single mutable status file loses prior session summaries. An external task service adds credentials and approval overhead before Sprint 0 needs them.

## Consequences
Every normal task end has a small documentation cost. The script cannot prove test claims or recover work never written to disk; agents must inspect Git and run checks. Changes to clinical rules still require human approval.
