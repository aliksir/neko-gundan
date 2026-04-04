# Review Output Module

> **Module**: `review_output` | **Default**: ON | **Scale**: Squad+

Persists review results (simplify, kurouto-neko) to files for traceability.

**Full definition**: `modules/review-output.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| oyakata-neko / shigoto-neko | After simplify completes | Write simplify result to `reviews/YYYYMMDD_{task}_simplify.md` |
| oyakata-neko / shigoto-neko | After kurouto-neko completes | Write kurouto result to `reviews/YYYYMMDD_{task}_kurouto.md` |
| shigoto-neko | Completion gate | Verify review files exist (when reviews were conducted) |
