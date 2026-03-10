# Review Loop Protocol

Quality assurance flow applied at all scales.

## 3 Principles (Core — Always Active)

1. **Implementer != Reviewer**: The agent who wrote it doesn't review it
2. **Reviewer is read-only**: No code modifications. Point out issues only, return to implementer for fixes
3. **Loop limit 3 cycles**: After 3 cycles, arbitrator (Opus) intervenes to decide continue or abort

## Flow

```
implement -> review(edit:false) -> [issues found] -> fix -> review -> ... (max 3 times)
                                   [no issues]    -> supervise -> COMPLETE
```

## Context Rot Prevention

During fix phases, don't carry over previous session responses. Share information via review report files.

## Agent-as-a-Judge (Structured Review)

Reviewer (kurouto-neko/QA) uses the rubric defined in `agents/kurouto-neko.md`.
Eliminates subjective "YOSHI!" with 5-aspect structured judgment (correctness, safety, maintainability, testing, purpose alignment).
When confidence is `low`, escalate to arbitrator (Opus).

## Self-Verification Methods

| Method | When to use |
|--------|-------------|
| Test execution | After code changes, run `npm test` / `pytest` etc. |
| Expected output | Provide "this input -> this output is correct" for self-checking |
| Screenshot verification | For UI changes, use browser tools for visual check |
| Lint/type check | `tsc --noEmit` / `ruff check` for static verification |

## Optional Extensions

The following features are available as modules. Check `neko-gundan.config.yaml`:
- `modules/tdd-separation.md` — Separate test creation and implementation to different agents
- `modules/jit-tests.md` — Just-in-Time disposable tests from PR diffs
- `modules/ensemble-judge.md` — Multi-strategy evaluation (SE-Jury Method)
- `modules/spec-driven-review.md` — Verify alignment with project spec
