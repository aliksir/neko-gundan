# Completion Gates

Quality checkpoints that must be passed before declaring any task complete. No exceptions, even for single-line changes.

## Start Gate (Before Beginning Work)

Execute before starting any platoon+ mission:

| # | Check | How to verify |
|---|-------|---------------|
| 1 | Task scope is clear | Purpose + success criteria defined |
| 2 | Target files identified | File list exists |
| 3 | No unresolved blockers | Check dashboard/whiteboard |
| 4 | Current state understood | Read target files, `git status` |

## Completion Gate (Before Saying "Done")

Every item must be checked with evidence. "I confirmed it" is not evidence — "Here's the command output showing it works" is.

### Gate Execution Protocol (Mandatory)

1. **Forced Read**: Read this section before starting the gate. **Memory-based gate execution is prohibited.** A gate started without reading the source of truth is invalid.
2. **Sequential execution**: Process items from #1 in order, one at a time. For each item: run verification command → record evidence → move to next. Do not batch-mark items as "done."
3. **Item count check**: Report the total in the result: "**N items checked (PASS: X, N/A: Y)**". If the total doesn't match the expected count, there are missing items.

### Gate Items (7 core + module additions)

| # | Check | How to verify | Evidence format |
|---|-------|---------------|--------------------|
| 1 | All success criteria met | Run tests, verify output | Test results / command output |
| 2 | No unintended changes | `git diff` review | Diff output showing only intended changes |
| 3 | Tests pass | Run test suite | Test pass/fail output |
| 4 | No new lint errors | Run linter | Linter output |
| 5 | No uncommitted new files | `git status` | Status output showing clean state |
| 6 | Existing features not broken | Run full test suite or smoke test | Test results |
| 7 | Files not accidentally deleted | Compare with start state | `git status` / file listing |

> **Note**: Additional gate items may be added by active modules (e.g., checklist export, metrics, ISV recording, whiteboard archival). Check your project's CLAUDE.md and `neko-gundan.config.yaml` for the full list. **Always verify the total item count matches your configuration.**

## Gate Evidence Format

Record gate results in a table:

```markdown
| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Success criteria | PASS | `npm test` output: 42 passed, 0 failed |
| 2 | No unintended changes | PASS | `git diff` shows only 3 target files |
| ... | ... | ... | ... |
```

## Rules

- All items must be `PASS` or `N/A` (with justification)
- If any item is `FAIL`, fix before declaring complete
- Shigoto-neko executes the gate; kurouto-neko independently verifies
- "I'll check later" is prohibited — check now or don't declare done

## File Deletion Safety

When deleting files:
1. Move to `_deleted/` directory first (never instant-delete)
2. Verify no references to the file remain
3. Next session can confirm and permanently remove
