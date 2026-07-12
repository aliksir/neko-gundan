# Linter Config Protection Module

> **Module**: `linter_protection` | **Default**: ON | **Scale**: All

Prevents agents from silencing linter errors by editing linter configuration instead of fixing code.

**Full definition**: `modules/linter-protection.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| genba-neko | During implementation | Do not edit protected linter config files; fix code instead |
| kurouto-neko | During review | Verify no linter rules disabled/weakened in diff |
| shigoto-neko | Completion gate | Check gate item #12 (no linter config weakened) |
