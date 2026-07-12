# Reflexion Module

> **Module**: `reflexion` | **Default**: ON | **Scale**: All

Structured reflection on failure to prevent repeating the same mistakes.

## Genba-neko: Reflexion (Required on Failure)

When a task fails or needs redo, add this reflection section to the report:

```
Reflection (Reflexion):
  Section A — Principled Reflection (What to avoid):
    - Pattern: [What pattern/situation led to failure]
    - Avoid: [Specific action to NOT do next time]
    - Why: [Root cause — why this approach failed]
  Section B — Procedural Reflection (How to succeed):
    - Success path: [Specific steps that would have worked]
    - Verification: [How to confirm the correct approach]
```

### Rules
- "I'll be more careful" is prohibited. Write **specific actions**
  - NG: "I'll be careful next time"
  - OK: "Next time I'll Grep import paths before running tests"
- If root cause is unknown, honestly write "Cause unknown, consulting shigoto-neko"
- Both sections are required. Omitting either is prohibited
- Section A captures "what to avoid" (原則反省), Section B captures "how to succeed" (手続き反省)
- Research basis: arxiv:2601.11974 (MARS) — separating principled and procedural reflection improves reasoning with less computational overhead

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| genba-neko | Post-work (step 11, on failure) | Add Reflexion section (both Section A and Section B) to failure/redo report |

## Explicit 3-Step Self-Correction Loop (2026-04-05追加, arxiv:2603.05863)

ReflexiCoder research demonstrates that making the "generate → reflect → correct" cycle explicit (rather than implicit) improves self-correction by 40% in token efficiency.

### When an error occurs during implementation

Instead of immediately retrying or guessing at a fix:

```
Step 1: GENERATE — What did I produce? (capture the exact error/output)
Step 2: REFLECT — Why did this fail? (root cause, not symptoms)
Step 3: CORRECT — What specific change addresses the root cause?
```

### Integration with 3-Layer Watchdog
- **L1 trigger (same error ×3)**: Before switching strategy, ensure all 3 iterations attempted the explicit 3-step loop. If they did and still failed, the root cause analysis is wrong — escalate
- **L2 trigger**: Shigoto-neko reviews the 3-step logs to determine if genba-neko correctly identified root causes
- The 3-step loop prevents "retry the same thing hoping for a different result" — each correction must address a newly identified cause

### Example
```
Step 1 GENERATE: TypeError: Cannot read property 'map' of undefined at line 42
Step 2 REFLECT: The API returns {data: null} when no results found, not {data: []}
Step 3 CORRECT: Add null check: const items = response.data ?? [] before .map()
```
