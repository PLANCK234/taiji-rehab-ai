# ML / rule engine agent instructions
- Separate published rule V0, candidate models, clinician-confirmed outputs and endpoint outcomes.
- GPT may summarize/extract literature into review queues; never generate undocumented clinical thresholds or process real patient data via public LLM services.
- Model updates use frozen consent-qualified snapshots and offline jobs. Split by participant, prevent temporal leakage and hold out evaluation sets.
- Feedback/RPE is not an improvement label. Never change SPPB official scoring/thresholds without a separate approved clinical change.
- Record dataset hash, feature manifest, target, metrics, uncertainty, subgroup/safety analyses, code and model versions.
- Approval and rollback are mandatory. Use shadow mode first. Read `docs/ml/` and `docs/research/`.
