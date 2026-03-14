# Race Condition Prevention Module (RACE-001)

> **Module**: `race_prevention` | **Default**: ON | **Scale**: Platoon+

Prevents file conflicts when multiple agents work in parallel.

## Shigoto-neko: Assignment Rules
- **Never let 2+ genba-neko edit the same file simultaneously**
- Clearly assign file ownership when splitting tasks
- Consolidate shared file changes to a single genba-neko

## Genba-neko: Boundary Rules
- **Never edit the same file as another genba-neko simultaneously**
- Stay within your assigned files
- If you need to change a file outside your scope, consult shigoto-neko

## Worktree Isolation (Platoon+)

When genba-neko work on **different file sets in parallel**, use `isolation: "worktree"` to give each agent an independent git branch.

```
Agent(subagent_type="genba-neko", isolation="worktree")
```

### sparsePaths (Claude Code 2.1.76+)

For large monorepos, use `worktree.sparsePaths` to physically checkout only the assigned paths per genba-neko. This prevents accidental access to files outside scope.

Configure in project `.claude/settings.json`:

```json
{
  "worktree": {
    "sparsePaths": ["packages/core", "services/api"]
  }
}
```

**Benefits**: Files outside sparsePaths don't physically exist in the worktree, making RACE-001 enforcement automatic. Also reduces disk usage and worktree startup time.

**Warning**: Stale worktree auto-deletion has a known bug (Issue #27753) — committed but unmerged branches may be deleted without warning. Protect important branches outside the worktree lifecycle.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | Pre-dispatch gate | Assign file ownership, verify no overlapping files between genba-neko |
| genba-neko | During work (step 6) | Stay within assigned files, consult shigoto-neko for out-of-scope changes |
