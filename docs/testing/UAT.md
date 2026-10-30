# User acceptance script (clinical/research demonstration)

Before testing, use only SYNTHETIC data; test identities must not correspond to actual patients.

1. Login as therapist in Study A; create participant A-001, register consent, fill screening, and leave one item `unknown`. Verify safety status remains unresolved.
2. Record manually confirmed SPPB 8. Candidate II appears with V0 source/version; clinical reviewer confirms, leaving an audit record. Attempt unauthorized approval as assistant: denied.
3. Add three training sessions: complete RPE 12, partial RPE 14, aborted with near-fall. Report event during aborted session before filling all feedback. Confirm independent safety inbox item.
4. Change partial feedback after correction. Verify original version and edit reason remain; repeat exact idempotency key and verify no duplicate session.
5. Record a valid cycle endpoint SPPB, compare score changes on trend page. Missing outcomes show missing (not no improvement).
6. Freeze cycle as data manager, check counts/missingness; export coded CSV without name/phone. Check checksum and frozen snapshot cannot be overwritten.
7. Register candidate rule, attempt publication without clinical signoff (denied). Complete mock approval, verify only permitted release transition; historical suggestions keep old version.
8. Open photo demo. Verify explicit unavailable label, no fake pose score, and no permanent upload if no consent.
9. Login to Study B and attempt A-001 URL/export: deny. Test backup restore using synthetic DB.

**Signoff fields**: test date, build SHA, test environment, participants (roles not personal data), pass/fail, supporting evidence, blockers, decision owner. A clinician must sign off on rule content separately from UI acceptance.
