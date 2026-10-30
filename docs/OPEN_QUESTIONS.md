# Open questions and decision register

**Status**: UNRESOLVED means do not invent a production medical default. Owner roles below are proposed, not named/appointed people.

| ID | Blocking question | Proposed owner | Impact / fallback |
|---|---|---|---|
| Q-01 | Which ethics protocol is approved? Image/secondary AI consent? | PI / ethics | real patients/photos disabled |
| Q-02 | Which SPPB SOP and official item scoring? | clinical measurement lead | manual total only; no auto-scoring |
| Q-03 | Exact tai chi adaptation templates, contraindications, dose and review owner? | clinical team | recommendations draft-only |
| Q-04 | Safety stop/resumption and AE/SAE escalation deadlines? | hospital clinical policy | generic event intake; no claimed escalation SLA |
| Q-05 | Actual visit/cycle schedule and enrollment/cohort rules? | PI / statistician | configurable demo template |
| Q-06 | Objective primary endpoints and labels for A/B/C ML tasks? | statistician / PI | frozen descriptive reporting only |
| Q-07 | What real identifiable fields are necessary? Data controller and retention? | privacy officer | synthetic data/identity mapping off |
| Q-08 | On-prem or approved cloud, region, encryption, backup RPO/RTO? | hospital IT | local/staging only |
| Q-09 | Who can approve rule, snapshot, model and release? | PI / governance | no production publishing |
| Q-10 | Image collection retention and permission? | ethics / data controller | show local preview without persistence |
| Q-11 | RCT allocation and blinded analyst workflow needed in MVP? | PI / statistician | out of scope pending decision |
| Q-12 | Which observation quality/subjective response scales? | clinical team | categorical placeholders marked unvalidated |
| Q-13 | External LLM used for literature only? Approved provider and documents? | security / PI | offline manual literature extraction |

**Decision closure template**: date; question ID; signed decision; authority; scope; rule/protocol version; evidence URL/file; impacted tests; effective date. No closed state without evidence.
