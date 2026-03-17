# Hooks Guide

← Back to [README](../README.md)

## Gate Guard Hook

**Required.** Mechanically enforces start gate compliance. Blocks `Edit`/`Write` on project source code when `plans/` or `checklist/` files are missing — prevents the agent from skipping the planning phase. Without this hook, agents may skip planning after context compaction.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit",
        "hooks": [{ "type": "command", "command": "node path/to/hooks/gate-guard.mjs", "timeout": 3 }]
      },
      {
        "matcher": "Write",
        "hooks": [{ "type": "command", "command": "node path/to/hooks/gate-guard.mjs", "timeout": 3 }]
      }
    ]
  }
}
```

The hook checks `plans/` and `checklist/` directories for files matching the project name. Meta directories and meta files (CLAUDE.md, handover.md, etc.) are excluded so gate artifacts can still be created.
