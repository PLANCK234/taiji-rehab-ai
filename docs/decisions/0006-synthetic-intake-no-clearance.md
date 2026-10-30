# ADR-0006: Synthetic intake without clinical clearance

- **Status:** Accepted for local engineering only; not clinical or production approval
- **Date:** 2026-10-30

## Context

S1-02 needs a testable coded create → consent → screening workflow. Q-01/Q-07/Q-10 provide no approved ethics, real identity, photo or screening policy. Existing authentication already enforces study and participant assignment on reads.

## Options

Store a guessed eligibility/safety result; postpone all intake; or record only synthetic, attributable observations while withholding clinical conclusions. The first would invent a clinical rule and the second would leave S1-02 untestable.

## Decision

Permit `SYN-` coded creation in assigned studies and append-only simulated consent and screening entries. Require CSRF and idempotency for writes, study/object scope for all reads and writes, and the latest simulated granted consent before a screening write. No item catalogue or threshold is approved; the only screening projections are `not_assessed` and `needs_review`. Keep identity mapping and photo upload absent even when a synthetic photo scope is recorded.

## Consequences and revisit trigger

The UI can demonstrate FR-002/AT-03 without declaring anyone safe or eligible. A real consent workflow needs approved forms, evidence of signature, purpose and withdrawal rules, and privacy review. A clinical screening workflow needs approved items, interpretation and review authority. Revisit only after Q-01/Q-07/Q-10 decisions are signed and versioned. Migration `0003_synthetic_intake` adds synthetic records and write receipts; downgrade deletes those tables and must run only on an empty disposable database or with an approved backup/rollback plan.

## Approvers

Engineering decision only. No clinical, ethics or privacy approver is recorded.
