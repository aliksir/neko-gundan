# Raw Log Module

> **Module**: `raw_log` | **Default**: OFF | **Scale**: Squad+

Full audit trail of every agent action — what was read, changed, executed, and decided. For engineers who want to see **exactly** what the agent did, not just the summary.

"What did you check before saying YOSHI?"

## Why

Completion gates prove **what was checked**. Raw logs prove **what was done**. When you need to explain every line change to a stakeholder, the report isn't enough — you need the full diff, every command output, and the reasoning behind each decision.

## Output

One file per mission, generated **after work is complete** (not during execution).

```
logs/raw-{mission-name}-{YYYYMMDD}.md
```

## Output Format

```markdown
# Raw Log: {Mission Name}
**Date**: YYYY-MM-DD HH:MM
**Scale**: {squad/platoon/battalion}
**Team**: {agent list}

## {agent-name}

### [{HH:MM:SS}] Read {file_path}
(Read file — {N} lines)

### [{HH:MM:SS}] Edit {file_path}:{line}
```diff
- old line
+ new line
```

### [{HH:MM:SS}] Bash {command summary}
```
{full output}
```
exit: {code}

### [{HH:MM:SS}] Grep {pattern} in {path}
{match count} matches in {file count} files

### [{HH:MM:SS}] Decision
{reasoning for a judgment or choice}
```

### What to Log

| Action | Log content |
|--------|-------------|
| **Read** | File path, line count |
| **Edit** | File path, line number, full diff (unified format) |
| **Write** | File path, full content |
| **Bash** | Command, full stdout/stderr, exit code |
| **Grep/Glob** | Pattern, match count, file count |
| **Decision** | What was decided and why (review judgment, task split rationale, etc.) |
| **SendMessage** | Recipient, summary of message |

### What NOT to Log

- Internal planning thoughts (these are in the whiteboard)
- Repeated identical reads of the same file (log once)
- Tool calls that returned empty/no-op results (unless relevant to a decision)

## Generation Procedure

### Genba-neko: Record During Work

During execution, keep a mental note of actions taken. No file writes during work — just remember what you did. At handoff time, include a **structured action list** in your completion report:

```yaml
actions:
  - tool: Edit
    file: src/checks/inbound.js
    line: 31
    diff: |
      + /\b(?:Invoke-Expression|IEX)\s*[\s(]/i,
      + /\bStart-Process\b/i,
  - tool: Bash
    command: node -e "const {CHECKS}..."
    output: "IN-002 patterns: 16"
    exit: 0
```

### Shigoto-neko: Generate Log File

After all genba-neko complete and before the completion gate:

1. Collect action lists from all genba-neko completion reports
2. Run `git diff` to capture the authoritative diff (not relying on agent memory)
3. Combine into the log file format
4. Write to `logs/raw-{mission}-{YYYYMMDD}.md`

### Enrichment from Git

The git diff is the **source of truth** for code changes. Agent-reported diffs are cross-checked:

```bash
git diff HEAD~{N}..HEAD -- {files}
```

If the agent's reported diff doesn't match git, use git's version and flag the discrepancy.

## Configuration

Enable in `neko-gundan.config.yaml`:

```yaml
shitsuke:
  raw_log: true
```

Set the output directory in CLAUDE.md (optional, defaults to `logs/`):

```markdown
### ログ出力
- raw_log_output_dir: logs/
```

## Completion Gate

When this module is active, add gate item: "Raw log generated — `logs/raw-{mission}-*.md` exists with action details"

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| genba-neko | Post-work (completion report) | Include structured action list in handoff |
| shigoto-neko | Pre-completion-gate | Collect action lists, run git diff, generate raw log file |
| shigoto-neko | Completion gate | Verify raw log file exists |
