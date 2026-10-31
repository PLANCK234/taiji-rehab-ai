# ML / rule engine agent instructions
- Separate published rule V0, candidate models, clinician-confirmed outputs and endpoint outcomes.
- GPT may summarize/extract literature into review queues; never generate undocumented clinical thresholds or process real patient data via public LLM services.
- Model updates use frozen consent-qualified snapshots and offline jobs. Split by participant, prevent temporal leakage and hold out evaluation sets.
- Feedback/RPE is not an improvement label. Never change SPPB official scoring/thresholds without a separate approved clinical change.
- Record dataset hash, feature manifest, target, metrics, uncertainty, subgroup/safety analyses, code and model versions.
- Approval and rollback are mandatory. Use shadow mode first. Read `docs/ml/` and `docs/research/`.

## Isolated Demo rule engine
- `demo-rule-v1` maps valid confirmed manual SPPB total 10–12→I, 7–9→II, 4–6→III, 0–3→IV; absent/invalid/unconfirmed→`UNASSESSED`. This is a versioned display mapping only, not the published clinical V0.
- Store `functional_grade` apart from `demo_training_mode`; optional `needs_assistance` may affect display mode but must not rewrite the SPPB grade. I/II/III have separate `DEMO_ONLY` templates. IV/UNASSESSED generates no autonomous action plan; a researcher may inspect manually selected Demo material. Unit-test boundaries. No neural training or GPT call is required.
