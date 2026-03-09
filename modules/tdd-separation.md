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
