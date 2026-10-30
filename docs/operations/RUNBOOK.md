# Operations runbook

## Before service starts
- Confirm approved environment and whether dataset is synthetic or real; verify backup age, DB health, TLS validity, secret availability, migrations, runtime version.
- For a research-production incident, follow hospital process and incident owner list; never make up an on-call name.

## Symptom → response
| Symptom | Triage | Safe response |
|---|---|---|
| DB unavailable | check container/connection/migrations | preserve writes and audit, no untracked manual edits |
| 500 errors | correlate request IDs (no PHI) | rollback app if necessary |
| export leak suspected | revoke export URLs, assess access logs | notify designated security owner |
| incorrect grade candidate | disable affected rule/version; preserve case history | clinical owner assesses impact before re-enable |
| missed/duplicate sessions | inspect idempotency and audit | corrective migration only with reviewed plan |
| model regression | revert release pointer to previously approved model | keep both artifacts and deployment record |
| missed training safety event | escalate to designated clinical contact per approved SOP | no autonomous clinical judgment |

## Recovery exercise
Quarterly cadence **proposed only**: restore an encrypted backup to isolated staging, validate row counts, FK integrity, audit history, role permissions and snapshot hashes. Set RPO/RTO only after institutional review.

## Monitoring without health data
Metrics: HTTP errors/latency, DB connection counts, export job state, backup success, security denials, model release events, feedback completion percentage (aggregated). Never send patient text/images to general telemetry.
