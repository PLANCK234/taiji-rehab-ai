# Offline optimization, evaluation and publication

## Three different targets: never conflate
- **A**: future *objective functional change* (e.g., next endpoint SPPB delta) under a defined protocol. Regression/outcome model; cannot casually infer causal effects of treatments.
- **B**: *expert-confirmed adaptation category* or reviewed functional label. Agreement/decision-support classification, with explicit annotator protocol.
- **C**: proposed *next-cycle adjustment* for expert review. Recommendation policy requires stronger safety, comparative and prospective evidence than simple label agreement.

## One cycle
1. Confirm consent/scope, lock cycle and endpoint definitions; create frozen numbered export with query spec hash, input row counts and missingness report.
2. Data QA: invalid metrics, event completeness, follow-up missingness, class balance, subgroup counts, inter-rater reliability, duplicate sessions.
3. Predefine target before fitting; choose features available **at prediction time**; keep raw measurements and model-ready derivations separate.
4. Split by participant ID; for longitudinal future prediction, also implement temporal holdout. Never split adjacent visits/frames across train/test.
5. Compare V0 / simplest statistical baseline to ordinal or multinomial logistic regression and shallow decision trees; complex models only when sample supports.
6. Report confusion matrix, macro F1, weighted Kappa and error types for categorization; MAE, intervals, calibration and clinically relevant differences for continuous outcomes. Include safety subgroup and high-risk error analysis.
7. Produce signed report: dataset hash, code SHA, model artifact hash, target, split seed, preprocessing, confidence intervals/uncertainty, intended use, limitations, clinician review.
8. Candidate first in shadow mode (without changing patient-facing or clinical recommendation); approval and rollback plan before controlled publication.

## Sample size caveat
An ~60-person initial study is generally exploratory. Do not assert clinical utility, generalization or superiority from in-sample performance or train/test leakage; pre-register targets and assess uncertainty.

## Release gates
`draft → evaluated → clinical_review → data/security_review → approved → shadow → controlled_release → retired/rollback`. No machine job may cross the human-approval transition. Historical assessment/feedback must keep the exact model/rule version used.

## Prohibited shortcuts
- RPE, comfort, adherence or training duration as a direct proxy for functional improvement.
- Retraining and changing live thresholds after each visit without approved evaluation.
- Retrofitting original SPPB official scoring cutoffs based on one small study.
- Public GPT inference over identifiable or unapproved patient data.

ENG-03A is limited to offline synthetic QA and participant-level split verification. Its train/validation/test names are split-index infrastructure, not evidence that a model has been fitted or evaluated. The generated manifest has no target. V0 comparison, temporal feature cutoff, signed clinical review, model registry and release gates above remain unimplemented.
