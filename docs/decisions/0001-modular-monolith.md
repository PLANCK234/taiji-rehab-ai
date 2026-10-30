# ADR-0001: Modular monolith for MVP

- **Status:** proposed
- **Context:** small research MVP with tightly coupled participant/assessment/feedback/approval domain, limited team and deploy target.
- **Options:** microservices; modular FastAPI monolith; Next.js-only backend.
- **Decision:** Next.js frontend + single FastAPI service split by domain modules, PostgreSQL; ML as separate offline job. Avoid distributed consistency complexity.
- **Consequences:** simpler transactions/testing, shared deploy boundary; modules must keep clear ownership and avoid tight circular imports.
- **Revisit:** multiple institutions, independent scaling, operational evidence that model tasks block requests.
