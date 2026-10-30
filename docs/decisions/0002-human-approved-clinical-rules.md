# ADR-0002: Human approval for clinical-facing decisions

- **Status:** proposed, safety-critical
- **Context:** initial research rules and GPT-assisted literature review do not establish clinical validity.
- **Decision:** every candidate level, tai chi adaptation and model update is attributable to source version and separate clinician confirmation. Unapproved rules remain synthetic/demo only.
- **Consequences:** additional review UI/audit and delayed publishing; prevents silent model-to-clinical changes.
- **Revisit:** only with approved governance and research evidence; never because model confidence is high.
