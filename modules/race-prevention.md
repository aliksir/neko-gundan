# Race Condition Prevention Module (RACE-001)

> **Module**: `race_prevention` | **Default**: ON | **Scale**: Platoon+

Prevents file conflicts when multiple agents work in parallel.

## Shigoto-neko: Assignment Rules
- **Never let 2+ genba-neko edit the same file simultaneously**
- Clearly assign file ownership when splitting tasks
- Consolidate shared file changes to a single genba-neko

## Genba-neko: Boundary Rules
- **Never edit the same file as another genba-neko simultaneously**
- Stay within your assigned files
- If you need to change a file outside your scope, consult shigoto-neko

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | Pre-dispatch gate | Assign file ownership, verify no overlapping files between genba-neko |
| genba-neko | During work (step 6) | Stay within assigned files, consult shigoto-neko for out-of-scope changes |
