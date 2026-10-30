# Data flow, trust boundaries and state machine

```mermaid
flowchart TD
 A[Consent + screening] --> B[Baseline assessment]
 B --> C[Versioned V0 candidate]
 C --> D{Clinician approves?}
 D -->|yes| E[Confirmed grade / adaptation]
 D -->|no| R[Rejected or revised with reason]
 E --> F[Training session + feedback]
 F --> G[Safety events reviewed separately]
 F --> H[Cycle endpoint measurement]
 H --> I[Freeze snapshot and QA]
 I --> J[Offline candidate optimization]
 J --> K{Validation + human approvals}
 K -->|approved| L[New version / shadow or controlled rollout]
 K -->|rejected| M[Keep V0 / old version]
 L --> F
```

**Trust boundaries**
1. Browser inputs untrusted; backend authorizes and validates all objects.
2. Identity mapping available to limited staff only; general research exports use coded IDs.
3. Images are sensitive; never automatically persist to public object storage.
4. Offline research workloads receive only purpose/consent-eligible frozen snapshots.
5. External LLM has no direct access to patient records; literature inputs must be vetted and source-cited.

**State examples**: assessment `draft → submitted → confirmed → amended`; recommendation `proposed → approved/rejected → published/superseded`; session `planned → in_progress → completed/aborted`; optimization `candidate → evaluated → pending_review → approved/rejected → shadow/released → retired`. Enforcement lives on server.
