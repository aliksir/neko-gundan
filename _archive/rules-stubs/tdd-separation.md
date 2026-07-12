# TDD Separation Module

> **Module**: `tdd_separation` | **Default**: OFF | **Scale**: Platoon+

Prevents Context Pollution by separating test creation and implementation to different agents.

**Full definition**: `modules/tdd-separation.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | Task splitting (platoon+) | Assign test creation and implementation to different genba-neko |
| genba-neko A | Test creation | Write tests, handoff to genba-neko B (action: auto) |
| genba-neko B | Implementation | Implement against tests without reading test creator's analysis |
| kurouto-neko | Review | Review both tests and implementation independently |
