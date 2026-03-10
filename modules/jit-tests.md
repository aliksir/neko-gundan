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

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| kurouto-neko | Review (3+ files changed or insufficient coverage) | Generate disposable tests from `git diff`, run them, feed failures back to implementer |
| genba-neko | Post-review fix | Fix issues identified by JiT test failures |
| kurouto-neko | Post-review pass | Delete disposable tests from `tmp/jit-tests/` (not committed) |
