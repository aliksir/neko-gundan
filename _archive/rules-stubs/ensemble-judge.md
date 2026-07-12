# Ensemble Judge Module (SE-Jury Method)

> **Module**: `ensemble_judge` | **Default**: OFF | **Scale**: Platoon+

Combines multiple evaluation strategies for important reviews.

**Full definition**: `modules/ensemble-judge.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| kurouto-neko | Review (when ensemble triggered) | Run all 3 strategies (rubric, comparative, checklist), integrate results |
| shigoto-neko | Pre-review (Standard weight) | Explicitly request ensemble review when needed |
| kurouto-neko | Review (Strict weight) | Automatically activate ensemble for all reviews |
| kurouto-neko | Post-ensemble (1:1:1 split) | Escalate to arbitrator (oyakata-neko / Opus) |
