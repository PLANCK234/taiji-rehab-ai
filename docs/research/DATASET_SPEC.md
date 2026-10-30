# Frozen research dataset specification

## Snapshot content
- `snapshot_id`, protocol/consent version, extraction date, code SHA, query hash, rule/model baseline version, cohort definition, eligibility counts, missingness table, data dictionary version, redaction manifest and checksum.
- Tables: coded participants, baseline/endpoint assessments, validated measurements, sessions/feedback, reviewed events, grade predictions and clinician approvals, protocol/visit timeline, **without default identity mapping or raw images**.
- Aggregate missingness by field and reason; include subject count, session count, visit count, exclusion reasons and protocol deviations.

## One row per what?
Maintain normalized exports; generate modeling views separately: (a) one row per participant/cycle for outcome tasks; (b) one row per session for adherence descriptive statistics. Do not merge these blindly and inflate N.

## Reproducibility
Frozen snapshot is immutable and addressable by content checksum. Corrections after lock create a new snapshot, never silently overwrite. Store feature-generation code version and random seed, split index, pre-processing and model output separately.

## Consent, leakage and review
Confirm consent for research/secondary algorithm use; any future reuse not covered by consent requires further approval. No direct name, telephone, address, unapproved video or free-text identifiers in modeling datasets. De-identification is not guaranteed anonymity; access remains controlled.
