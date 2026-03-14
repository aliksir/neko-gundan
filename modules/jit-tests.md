# Just-in-Time Disposable Tests Module (JiTTests)

> **Module**: `jit_tests` | **Default**: OFF | **Scale**: Platoon+

Disposable tests auto-generated from PR diffs. Used as review aid.

## When to use
- 3+ files changed AND existing tests don't cover the changes
- Reviewer judges "insufficient test coverage"

## Procedure
1. Identify changed functions/methods from `git diff`
2. Generate boundary/error case tests (disposable)
3. Run tests -> feed failures back to implementer
4. After review passes, disposable tests can be deleted (permanent tests are separate)

## Rules
- Disposable tests are NOT committed to the repository (output to `tmp/jit-tests/`)
- These are NOT a substitute for permanent tests. They are a review accuracy aid

## Mutation-Guided Test Generation (arXiv:2501.12862, arXiv:2503.08182)

When standard JiT tests provide insufficient fault detection, use mutation-guided generation:

1. Generate mutants from changed code (simple mutations: negate conditions, swap operators, remove statements)
2. For each surviving mutant (not caught by existing tests), generate a targeted test
3. Run targeted tests — surviving mutants indicate gaps in test quality
4. Feed results to implementer for review

### When to Use
- Standard JiT tests all pass but reviewer suspects edge cases
- Changed code has complex branching logic
- Security-sensitive changes where completeness matters

### Mutation Operators (lightweight set)
| Operator | Example | Targets |
|----------|---------|---------|
| Negate condition | `if (x > 0)` → `if (x <= 0)` | Off-by-one, boundary errors |
| Remove statement | Delete a line | Dead code, missing side effects |
| Swap return value | `return true` → `return false` | Logic inversions |
| Change operator | `+` → `-`, `&&` → `\|\|` | Arithmetic/logic errors |

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| kurouto-neko | Review (3+ files changed or insufficient coverage) | Generate disposable tests from `git diff`, run them, feed failures back to implementer |
| genba-neko | Post-review fix | Fix issues identified by JiT test failures |
| kurouto-neko | Post-review pass | Delete disposable tests from `tmp/jit-tests/` (not committed) |
