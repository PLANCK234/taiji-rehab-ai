# Threat model / abuse cases

| Asset / threat | Entry point | Control | Verification |
|---|---|---|---|
| Cross-patient access (IDOR) | `/participants/{id}` | per-object study-scope auth | 403 test with second study |
| CSV leaks identity | research exports | allowlisted columns and role grants | schema snapshot test |
| Unapproved image collection | camera/upload | consent and feature flag gates | deny/no object persisted |
| Malicious files | image upload | MIME inspection, size caps, malware review if approved | invalid file tests |
| Data tampering | grading review / feedback | append revision, audit, optimistic concurrency | compare old/new |
| Unapproved model release | registry endpoint | dual approval and environment lock | release rejection |
| Model leakage | repeated longitudinal data | grouped/temporal holdout | split invariant |
| Hallucinated medical rule | GPT literature extraction | provenance, clinical signoff | missing citation blocks publication |
| Dangerous data deletion | migration/retention | backups, approvals, immutable snapshot | restore drill |
| Credential abuse | login/session | MFA if required, rate-limit, secure cookies | security integration tests |

**Incident rule**: contain access, preserve audit trail, notify designated institutional owner under approved procedure, investigate and restore from verified backups. Never invent statutory notification deadlines.
