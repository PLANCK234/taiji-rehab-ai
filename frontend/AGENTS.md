# Frontend agent instructions
- Next.js App Router + strict TypeScript. Browser is untrusted; no client-only authorization checks.
- Chinese-first, accessible forms with validation, field units, missingness reasons and explicit draft/submitted/confirmed states.
- Never show unapproved AI suggestions as clinical decisions.
- All HTTP goes through `lib/api.ts` (`apiGet` server reads, `apiSend` CSRF + idempotent writes); domain clients live in `lib/`, shared UI in `components/`. Avoid duplicating grading/business logic in React.
- Test critical form branches, auth redirects and any emergency event entry that must work before the full form is completed.
- Read `docs/product/PRD.md`, `docs/api/API_CONTRACT.md`, `docs/testing/TEST_STRATEGY.md` before changes.

## DEMO-V2 interface
- Follow `docs/product/DESIGN_SYSTEM.md` (新中式: paper background, ink text, jade primary, vermilion only for grade seals/danger). Use the CSS tokens and `components/ui.tsx`; no heavy UI dependencies. Keep layouts mobile-first (44px targets) so they map to the WeChat mini-program. Every page should tell the user the next step; show unknown states explicitly.
- Create participant → assessment; confirmed valid assessment → fetch server Demo grade → plan. Existing participant with grade opens plan; otherwise opens assessment. Plan has current mode/actions and a searchable, filterable action library with working details dialog.
- Training start, pause, resume, end, feedback and completion must use API responses and recover after refresh. Keep errors/unknown states explicit. Lint, typecheck, component tests, build and browser E2E are the target completion gates.
