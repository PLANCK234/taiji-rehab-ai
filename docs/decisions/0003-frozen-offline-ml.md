# ADR-0003: Offline learning from frozen, scoped data

- **Status:** proposed
- **Context:** longitudinal repeated data, small exploratory sample, health data restrictions, potential label leakage.
- **Decision:** only frozen, approved, coded snapshots feed candidate model runs. Patient-level splits, prediction-time feature cutoffs, V0 comparison, version registry, clinical approval and rollback. No real-time self-learning.
- **Consequences:** slower iteration but reproducibility and auditability; separate P0 data pipeline and P1 model fitting.
- **Revisit:** only after external validation and approved policy change.
