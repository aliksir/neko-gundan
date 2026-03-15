# Module Addition Checklist (MODULE-001)

> **Module**: `module_addition` | **Default**: ON | **Scale**: All
> **SSOT**: This file is the single source of truth for MODULE-001. `docs/protocols.md` references this file.

Protocol for adding new modules/protocols to the Neko Gundan system.
Prevents the "wrote the doc = done" anti-pattern.

## When to Apply

Apply this checklist when:
- Adding a new module to `modules/`
- Adding a new protocol to `docs/protocols.md`
- Adding a new rule to `rules/`

## Checklist (All Items Required)

| # | Step | Details | Evidence |
|---|------|---------|----------|
| 1 | **Create module document** | Write protocol definition in `modules/` or `docs/` | File path |
| 2 | **Impact analysis** | Identify all existing files affected by the new module. Search for related concepts across `agents/`, `rules/`, `docs/`, `modules/` | List of affected files + what changes |
| 3 | **Integrate into agent workflow** | Add to the relevant agent's `Active Modules` table AND embed in the specific action step where the module applies | Line numbers in `agents/*.md` |
| 4 | **Update gates** | Add verification items to `rules/completion-gates.md` (if the module adds gate items) | Gate item number |
| 5 | **Config registration** | Add entry to `neko-gundan.config.yaml` with comment | Config line |
| 6 | **Define SSOT** | State where the single source of truth is. Reference copies must say "SSOT: {path}" | SSOT declaration in file |
| 7 | **Bidirectional check** | If the module defines a sender-side protocol, verify the receiver-side handling is also defined (and vice versa) | Both sides documented |
| 8 | **Reference integrity** | Verify all file references in the new module point to existing files | `scripts/check-doc-refs.sh` output |
| 9 | **Git commit** | Commit all changes together | Commit hash |

## Impact Analysis Guide (Step 2)

When adding a module, systematically check:

```
1. Which agents are affected? -> Search agents/*.md for related keywords
2. Which gates need updates? -> Check rules/completion-gates.md
3. Which existing modules interact? -> Search modules/*.md for related concepts
4. Does it affect config? -> Check neko-gundan.config.yaml
5. Does it create new SSOT? -> Verify no conflicting definitions exist
```

"No workflow integration, no module deployment! Impact analysis first... YOSHI!"

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| oyakata-neko | Module deployment decision | Apply MODULE-001 checklist before any new module/protocol is considered deployed |
| shigoto-neko | Module addition task | Execute all 9 checklist steps in order; record evidence for each step |
| genba-neko | Module file creation (step 1) | Create the module document, then immediately commit (new-file-immediate-commit rule) |
| kurouto-neko | Module review | Verify all 9 checklist steps have evidence before approving; reject if any step is skipped |
