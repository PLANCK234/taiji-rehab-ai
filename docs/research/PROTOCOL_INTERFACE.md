# Research protocol interface and clinical approval dependencies

## Source vs decision
The uploaded documents describe a planned study with 60 participants, level II/III RCT inclusion, approximately 12-week intervention and 12-week follow-up, monitoring every two weeks and potential visits at weeks 16/20/24. These are **reference design elements**, not proof of completed ethics or protocol approval. This software must import a version of the **approved** protocol, not invent protocol requirements.

## Must be supplied by clinical/research owners
| Topic | Owner / document | Software dependency |
|---|---|---|
| Ethics, informed consent, withdrawal | Hospital ethics/compliance | enable/disable real data and photos |
| Eligibility/exclusion/safety stop | clinical PI + approved SOP | form validation, alert routing |
| SPPB task SOP, item-level scoring, equipment | clinical measurement lead | score calculation and validity |
| Tai Chi level templates, permitted adjustments | Delphi/clinical team | active recommendation rules |
| Assessment and follow-up schedule | approved protocol | visit scheduler |
| Outcomes and statistics plan | biostatistician + PI | snapshot, target spec and report |
| AE/SAE workflow/report time limits | hospital policy + investigator | escalation process |
| Privacy, hosting, retention, access | data controller/security | storage and deployment |

## Data science interpretation
RCT treatment and control groups should be recorded only under approved rules; model fitting must not compromise blinding or contaminate comparisons. Descriptive feedback and functional change are observational associations unless a suitable causal design is separately specified. No medical risk threshold may come solely from GPT.

## Change control
A protocol change requires a versioned clinical decision with effective date, impacted forms/rules/models, migration plan, participant handling, and possible ethics amendment before activation.
