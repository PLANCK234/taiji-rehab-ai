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

## ENG-03A synthetic engineering subset

`ml/offline_dataset.py` creates 18 fictitious `SYN-ENG03A-` participants with two example manual-total records each from a fixed seed. This is generated offline and does not query the application database, claim simulated consent as research consent, define a cycle endpoint, or become a frozen approved research snapshot. `records.jsonl` retains explicit validity and null values; `quality.json` counts validity, missing reasons, actual observed zero and duplicate record IDs. Structural defects fail generation. `splits.json` assigns complete participant IDs to train, validation and test; the verifier rejects overlap, omissions and extras. `manifest.json` records seed, schema, row counts and record/split hashes, with `target=null` and `clinical_use=false`. No treatment response or efficacy label is generated. Later consent-qualified extraction, time cutoff, immutable snapshot storage and target approval remain separate gates.
