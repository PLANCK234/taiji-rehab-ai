# Frontend agent instructions
- Next.js App Router + strict TypeScript. Browser is untrusted; no client-only authorization checks.
- Chinese-first, accessible forms with validation, field units, missingness reasons and explicit draft/submitted/confirmed states.
- Never show unapproved AI suggestions as clinical decisions. Photo demo must display “姿态识别算法尚未接入”.
- Use typed API clients from contracts, avoid duplicating grading/business logic in React.
- Test critical form branches, auth redirects and any emergency event entry that must work before the full form is completed.
- Read `docs/product/PRD.md`, `docs/api/API_CONTRACT.md`, `docs/testing/TEST_STRATEGY.md` before changes.
