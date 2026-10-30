# Release/PR quality checklist

- [ ] Requirements and scope linked; no invented medical rules.
- [ ] API shape, database model, data dictionary and docs synchronized.
- [ ] No clinical outcome is generated solely from training RPE/adherence.
- [ ] Consent/role/participant-scope checks added server-side.
- [ ] Missing/unknown/unsafe data remain distinct from zero/normal.
- [ ] Error paths and aborted-session safety event intake tested.
- [ ] Idempotency, concurrency, audit and immutable historical versions verified.
- [ ] New snapshot/model has provenance, split/temporal checks and approval gate.
- [ ] Secrets/PHI absent from logs, fixtures, PRs, external LLMs and exports.
- [ ] Migrations, backup, restore and rollback assessed.
- [ ] Tests actually run with evidence; unresolved blockers documented.
- [ ] Product/clinical/security approvals completed where needed.
