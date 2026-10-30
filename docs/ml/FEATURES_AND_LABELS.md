# Feature / label registry

**Granularity**: per participant × observation cutoff or per cycle, not per individual image frame pretending to be independent. `prediction_as_of` is mandatory.

| Family | Candidate features available before cutoff | Data risks |
|---|---|---|
| Baseline | SPPB, 4m gait speed, 5x sit-to-stand, FRAIL, supported standing, age band | missingness, protocol/measurement drift |
| Exposure | sessions scheduled/completed, planned/actual minutes, support type, skipped reasons | survivor bias, activity not randomly assigned |
| Tolerance | RPE distribution, observed difficulty, symptom and abort frequency | subjectivity, variable timing and under-reporting |
| History | previous grade and pre-cutoff functional change | chronology and repeated-measures dependence |
| Safety | reviewed adverse events vs unreviewed symptoms | clinician verdict required; rare events |

**Possible targets** (choose exactly one per experiment): `endpoint_sppb_delta`; `clinician_confirmed_category`; `next_cycle_approved_adjustment`. Create a target specification with horizon, label provenance, eligible population, exclusions, missingness rules, and clinical validation owner.

## Data leakage checklist
- No endpoint variables for baseline prediction.
- No repeated participant in both training and held-out test.
- No post-cutoff training sessions as predictors of earlier prognosis.
- No target-derived imputation across held-out partitions.
- No inclusion of the reviewer decision text as a predictor of that same decision.
- No change in target or threshold after seeing held-out performance without declaring a new experiment.

Record every transformation in the snapshot manifest. Any change creates a new version and requires re-evaluation.
