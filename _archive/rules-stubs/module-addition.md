# Module Addition Checklist (MODULE-001)

> **Module**: `module_addition` | **Default**: ON | **Scale**: All

Protocol for adding new modules/protocols to the Neko Gundan system.

**Full definition**: `modules/module-addition.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| oyakata-neko | Module deployment decision | Apply MODULE-001 checklist before any new module/protocol is considered deployed |
| shigoto-neko | Module addition task | Execute all 9 checklist steps in order; record evidence for each step |
| genba-neko | Module file creation (step 1) | Create the module document, then immediately commit (new-file-immediate-commit rule) |
| kurouto-neko | Module review | Verify all 9 checklist steps have evidence before approving; reject if any step is skipped |
