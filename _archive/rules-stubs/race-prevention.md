# Race Condition Prevention Module (RACE-001)

> **Module**: `race_prevention` | **Default**: ON | **Scale**: Platoon+

Prevents file conflicts when multiple agents work in parallel.

**Full definition**: `modules/race-prevention.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | Pre-dispatch gate | Assign file ownership, verify no overlapping files between genba-neko |
| genba-neko | During work (step 6) | Stay within assigned files, consult shigoto-neko for out-of-scope changes |
