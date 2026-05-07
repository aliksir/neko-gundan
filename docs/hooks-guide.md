# Hooks Guide

← Back to [README](../README.md)

## Kill Switch Hook

**Optional but recommended for long-running agents.** Halts every tool call while `$AGENT_STOP_FILE` (default: `~/.claude/AGENT_STOP`) exists. Useful for emergency-stopping nightly autopilot or any background loop.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [{ "type": "command", "command": "bash path/to/hooks/kill-switch.sh", "timeout": 2 }]
      }
    ]
  }
}
```

Usage:
```bash
touch ~/.claude/AGENT_STOP   # halt all tool calls
rm ~/.claude/AGENT_STOP      # resume
```

Inspired by [anthropics/cwc-long-running-agents](https://github.com/anthropics/cwc-long-running-agents) (Apache-2.0).

## Steer Hook

**Optional.** Mid-run redirect channel. When `$AGENT_STEER_FILE` (default: `~/.claude/STEER.md`) has content, the next `PreToolUse` surfaces it as `OPERATOR STEERING: ...` exactly once, then clears the file. Lets you redirect a long-running job without restarting. Requires `python3` for safe JSON encoding of arbitrary file content.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [{ "type": "command", "command": "bash path/to/hooks/steer.sh", "timeout": 2 }]
      }
    ]
  }
}
```

Usage:
```bash
echo "Skip the linting step and move on to the next feature." > ~/.claude/STEER.md
# next tool call is blocked once with OPERATOR STEERING:, file becomes empty
```

Notes:
- Keep STEER.md short and one-shot to avoid race conditions across concurrent sessions
- If `python3` is unavailable, the hook silently passes through (never stucks)
- If the file cannot be truncated, a warning goes to stderr and surface is treated as completed

Inspired by [anthropics/cwc-long-running-agents](https://github.com/anthropics/cwc-long-running-agents) (Apache-2.0).

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
