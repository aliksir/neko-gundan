# Operational Procedures Rule

> When performing any of the listed tasks, **Read the corresponding procedure before starting**.
> Working from memory is prohibited. Do not skip procedure steps.

## Procedure Index

| Trigger | Procedure | Location |
|---------|-----------|----------|
| {task description} | {procedure name} | `procedures/{filename}.md` |

## Rules

1. **Read before work**: "I remember from last time" is prohibited. Read every time
2. **Unlisted operations need confirmation**: Operations not in the procedure require confirmation before execution
3. **Update after work**: If the procedure is outdated or incomplete, update it after work (also update the "last confirmed" date)
4. **No secrets in procedures**: Never store passwords, private keys, or tokens in procedure files. Reference server-side config files instead

## Review Flow

### Trigger 1: Immediate update during work

When following a procedure and you discover errors, new gotchas, or config changes — fix them on the spot.

### Trigger 2: Completion gate check

At report time, verify:
- [ ] Could you follow the procedure as written?
- [ ] If you used new commands/tools, are they reflected in the procedure?
- [ ] Is the "last confirmed" date updated?
- [ ] Is the execution log updated?
- [ ] If the procedure changed, is the change history updated?

### Trigger 3: Monthly review (1st of each month)

1. List all procedures and check "last confirmed" dates
2. Flag procedures not confirmed in 60+ days as "needs review"
3. Verify IPs, versions, and paths still match reality
4. Check if new recurring tasks should be proceduralized

## Bulk Change Safety Flow

> Never apply the same replacement across files without confirming each file's context.

### When this applies

- `sed -i` / `replace_all: true` targeting multiple files
- Regex-based bulk replacement
- Same pattern applied to 3+ files

### Required steps

1. **Mechanically list all target files**: `Grep` for the pattern. "Probably around here" is prohibited
2. **Check context per file**: Read each file and confirm the replacement is correct for THAT file's context. Same pattern may need different replacements depending on column type / usage
3. **Categorize**: Group files by the type of change needed (not "same sed for all")
4. **Dry run**: Verify diff before applying. Confirm change count matches expectations
5. **Execute per file + verify**: Run per-category, per-file. Syntax check each file after change

### Prohibited

- `find . -name "*.ext" -exec sed -i 's/old/new/g' {} \;` (glob-based bulk replacement)
- Assuming "same pattern = same replacement" without checking context
- Committing without post-change syntax verification

## safe_read → Edit Flow

> When PII safe mode is active, follow this flow to edit files.

### Standard flow

```
safe_read → review masked content → identify edit target →
Read (same file) → Edit (use non-PII text as old_string anchor)
```

1. **safe_read**: Read with PII masked, understand structure
2. **Identify edit target**: From masked content, determine which lines/sections need changes. Use non-PII parts (function names, comments, structural text) as anchors for old_string
3. **Read**: Read the same file to satisfy Edit's prerequisite
4. **Edit**: Use non-PII anchor text in old_string, apply changes in new_string

### When the edit target contains PII

- Get explicit commander approval before Read → Edit
- Use surrounding non-PII text as old_string anchor (line-level replacement)
- If impossible: commander edits manually

## Adding New Procedures

Create a procedure when ALL of these are true:
1. **Done 2+ times**: At least 2 successful executions
2. **Will recur**: Likely to be repeated in the future
3. **Non-obvious steps**: Commands or gotchas that could cause errors if done from memory

## Supporting Documents

| File | Purpose | Operation |
|------|---------|-----------|
| `procedures/execution-log.md` | Execution record (when, what, result, findings) | Append 1 row after each procedure use |
| `procedures/change-history.md` | Change history (when, what, how, why) | Append 1 row on procedure create/update |
| `procedures/approval-log.md` | Approval record (ATR format + outcome) | Append 1 row when requesting approval, fill outcome when decided |
