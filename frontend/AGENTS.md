# Frontend agent instructions
- Next.js App Router + strict TypeScript. Browser is untrusted; no client-only authorization checks.
- Chinese-first, accessible forms with validation, field units, missingness reasons and explicit draft/submitted/confirmed states.
- Never show unapproved AI suggestions as clinical decisions. Photo demo must display “姿态识别算法尚未接入”.
- Use typed API clients from contracts, avoid duplicating grading/business logic in React.
- Test critical form branches, auth redirects and any emergency event entry that must work before the full form is completed.
- Read `docs/product/PRD.md`, `docs/api/API_CONTRACT.md`, `docs/testing/TEST_STRATEGY.md` before changes.

## DEMO-V2 interface
- Use one black-hole/Apple-minimal visual language across login and workspace: near-black surfaces, white/gray text, restrained cool-white accents, generous spacing, clear focus states, responsive desktop-to-mobile layout. Avoid dense HIS tables, colorful badges and decorative animation. Reuse existing components and avoid heavy styling dependencies.
- Create participant → assessment; confirmed valid assessment → fetch server Demo grade → plan. Existing participant with grade opens plan; otherwise opens assessment. Plan has current mode/actions and a searchable, filterable action library with working details dialog.
- Training start, pause, resume, end, feedback and completion must use API responses and recover after refresh. Keep errors/unknown states explicit. Lint, typecheck, component tests, build and browser E2E are the target completion gates.
