# Just-in-Time Disposable Tests Module (JiTTests)

> **Module**: `jit_tests` | **Default**: OFF | **Scale**: Platoon+

Disposable tests auto-generated from PR diffs. Used as review aid.

**Full definition**: `modules/jit-tests.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| kurouto-neko | Review (3+ files changed or insufficient coverage) | Generate disposable tests from `git diff`, run them, feed failures back to implementer |
| genba-neko | Post-review fix | Fix issues identified by JiT test failures |
| kurouto-neko | Post-review pass | Delete disposable tests from `tmp/jit-tests/` (not committed) |
