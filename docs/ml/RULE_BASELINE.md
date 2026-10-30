# V0 interpretable grading baseline

## Published source-derived SPPB bands (require clinical sign-off before real-data activation)
| Valid confirmed SPPB total | Functional level | Proposed system handling |
|---|---|---|
| 10–12 | I | candidate grade; tailored exercise rules separate |
| 7–9 | II | candidate grade; clinician-reviewed tai chi adaptation |
| 4–6 | III | candidate grade; support/assistance reminder and safety review |
| 0–3 | IV | clinical re-evaluation; no autonomous training recommendation |
| missing/invalid/unsafe evaluation | undetermined | no fallback to zero, request manual review |

Inputs: valid SPPB total, validity/unsafe flag, assessment version, safety screen; do not let FRAIL alone overwrite the SPPB band. Output: candidate grade, rule version, matched predicate, source IDs, warnings, timestamp, review state.

### Pure function behavior
```python
def candidate_grade(sppb_total: int | None, valid: bool) -> str:
    if not valid or sppb_total is None:
        return 'undetermined'
    if not 0 <= sppb_total <= 12:
        raise ValueError('SPPB out of range')
    if sppb_total >= 10: return 'I'
    if sppb_total >= 7: return 'II'
    if sppb_total >= 4: return 'III'
    return 'IV'
```
This snippet is an illustrative candidate function, **not** an approved clinical implementation; separate official scoring, level classification, triage and exercise recommendations.

## Literature-assisted adaptation table
Fields: `reference_id`, DOI/PMID/URL, population, outcome, intervention condition, precise quoted evidence (within license), author interpretation, limitations, candidate action, contraindications, expert signoff, effective state. GPT can draft **only** evidence extraction and explanatory text; human checks original papers and publication relevance before activation. Never set dosage from undocumented model output.

## Rule governance
Draft → medical review → approved → published → superseded. Maintain immutable rules with effective dates and rollback. Test scores 0,3,4,6,7,9,10,12, null, invalid and unsafe.
