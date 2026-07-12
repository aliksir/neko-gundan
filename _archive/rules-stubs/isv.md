# Intent State Vector Module (ISV)

> **Module**: `isv` | **Default**: OFF | **Scale**: Squad+ | **Config**: `neko-modules.yml` → `evidence.isv`

Records task intent, state, and results as a multi-dimensional vector. Makes the reasoning behind actions observable, enabling comparison and improvement of success/failure patterns.

**Full definition**: `modules/isv.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | Task instruction (pre-dispatch) | Add ISV start values (urgency, risk, complexity, novelty, purpose_alignment) |
| shigoto-neko | Completion gate (post-work) | Record ISV result values (confidence, outcome, review_cycles, intervention_count), append to ISV log |
