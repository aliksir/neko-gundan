# TDD Separation Module

> **Module**: `tdd_separation` | **Default**: OFF | **Scale**: Platoon+

Prevents Context Pollution by separating test creation and implementation to different agents.

## Problem

Running test creation and implementation in the same context causes the test creator's analysis to leak to the implementer (Context Pollution).

## Solution

For platoon+, **separate test creation and implementation to different agents**:

```
genba-neko A: Create tests -> handoff(action:auto) -> genba-neko B: Implement -> kurouto-neko: Review
```

This ensures the implementer works independently from the test creator's assumptions.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | Task splitting (platoon+) | Assign test creation and implementation to different genba-neko |
| genba-neko A | Test creation | Write tests, handoff to genba-neko B (action: auto) |
| genba-neko B | Implementation | Implement against tests without reading test creator's analysis |
| kurouto-neko | Review | Review both tests and implementation independently |
