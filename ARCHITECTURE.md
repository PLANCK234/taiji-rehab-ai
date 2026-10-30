# Architecture overview

Start here for system-level design; detailed decisions live in `docs/architecture/`.

```mermaid
flowchart LR
  U[医疗研究人员浏览器] --> FE[Next.js Web]
  FE --> API[FastAPI modular monolith]
  API --> AUTH[RBAC + participant scope]
  API --> DB[(PostgreSQL)]
  API --> FILE[Private image storage / optional]
  API --> RULE[Versioned V0 rule engine]
  DB --> SNAP[De-identified frozen snapshot]
  SNAP --> ML[Offline evaluation / candidate model]
  ML --> REVIEW[Clinical + data approval]
  REVIEW --> REG[Published model/rule registry]
  REG --> RULE
```

**Nonnegotiable:** clinician approval precedes effective recommendations; offline ML cannot mutate live clinical logic directly. See [system design](docs/architecture/SYSTEM_DESIGN.md), [security](docs/security/SECURITY.md) and [ADR index](docs/decisions/README.md).
