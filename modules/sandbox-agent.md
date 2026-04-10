# Sandbox Agent Module

> **Module**: `sandbox_agent` | **Default**: ON | **Scale**: Platoon+ | **Config**: `neko-modules.yml` → `orchestration.sandbox_agent`

Tool-level restriction for sub-agents. Limits what tools a genba-neko can use based on task type, reducing blast radius of mistakes.

## Background

Everything Claude Code (ECC, affaan-m, 2026) introduced sandboxed sub-agents — restricting agent capabilities at the tool level rather than just file level. This complements neko-gundan's existing race_prevention (file-level isolation) and worktree (git-level isolation) with a third layer: **tool-level isolation**.

## Why

- genba-neko doing a documentation task doesn't need `Bash` or `Write` access to source code
- genba-neko doing a review doesn't need `Edit` — it should be read-only (CR-1 already mandates this, but tool restriction enforces it mechanically)
- genba-neko handling external data (FIDES LOW) shouldn't have unrestricted Bash access

## Sandbox Profiles

Pre-defined tool restriction profiles that shigoto-neko assigns to genba-neko at dispatch time.

| Profile | Allowed Tools | Use Case |
|---------|--------------|----------|
| `full` | All tools | Default. Standard implementation tasks |
| `read-only` | Read, Glob, Grep, Bash(read-only cmds) | Code review, investigation, research |
| `docs-only` | Read, Write, Glob, Grep | Documentation, plan writing, report writing |
| `no-bash` | All except Bash | Tasks where shell execution is unnecessary or risky |
| `no-db` | All except DB-modifying Bash commands | Tasks where DB changes are out of scope |
| `research` | Read, Glob, Grep, WebSearch, WebFetch | External research, paper reading |
| `custom` | Explicitly listed tools | Custom restriction for special cases |

## How It Works

### 1. Assignment (shigoto-neko)

When dispatching a task to genba-neko, shigoto-neko includes the sandbox profile in the task spec:

```yaml
task_id: "genba_003"
from: shigoto-neko
to: genba-neko-3
command: review
sandbox: read-only          # <-- NEW: tool restriction
target: "src/auth/"
description: |
  認証モジュールのセキュリティレビュー
```

### 2. Enforcement (genba-neko self-check)

genba-neko checks its sandbox profile before each tool use:

```
Pre-tool-use check:
  If sandbox != 'full':
    Check if tool is in allowed list for profile
    If not allowed:
      SKIP tool use
      Report: "Sandbox restriction: {tool} not allowed in {profile} profile"
```

**Note**: This is a convention-based enforcement (agent follows instructions), not a technical sandbox. The restriction is declared in the task spec and the agent is instructed to comply. For hard enforcement, use worktree isolation.

### 3. Verification (shigoto-neko / kurouto-neko)

At review time, verify that the genba-neko respected its sandbox:
- Check the raw_log (if enabled) for tool calls outside the allowed list
- If violation found: FAIL review, log as `SANDBOX-VIOLATION-001`

## Automatic Profile Selection

shigoto-neko can auto-select profiles based on task type:

| Task Command | Auto Profile | Reason |
|-------------|-------------|--------|
| `review` | `read-only` | CR-1: reviewer must not modify code |
| `investigate` / `research` | `research` | No need for edit/write access |
| `document` | `docs-only` | Only needs to read code and write docs |
| `implement` | `full` | Needs all tools for development |
| `refactor` | `full` | Needs all tools |
| `test` | `no-db` | Tests shouldn't modify production DB |

shigoto-neko can override auto-selection with explicit `sandbox:` in the task spec.

## FIDES Integration

When FIDES data trust level affects sandbox selection:

| FIDES Level | Additional Restriction |
|-------------|----------------------|
| HIGH | No additional restriction |
| MEDIUM | No additional restriction |
| LOW | Auto-add `no-bash` restriction (LOW data must not be expanded into Bash) |

This mechanically enforces the existing FIDES rule: "LOW data → never expand into Bash."

## Escalation

If genba-neko needs a tool outside its sandbox:

1. Report to shigoto-neko: `"Sandbox escalation request: need {tool} for {reason}"`
2. shigoto-neko evaluates the request
3. If approved: upgrade sandbox profile for remaining task (log the change)
4. If denied: genba-neko works within restriction or reports blocker

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | Pre-dispatch | Assign sandbox profile (auto or explicit) |
| genba-neko | Pre-tool-use | Check tool against sandbox profile |
| genba-neko | On tool restriction hit | Report restriction, request escalation if needed |
| shigoto-neko | On escalation request | Evaluate and approve/deny sandbox upgrade |
| kurouto-neko | Review | Verify sandbox compliance (via raw_log if enabled) |

## Relation to Existing Modules

| Module | Level | This Module |
|--------|-------|-------------|
| `race_prevention` | File-level isolation | Tool-level isolation |
| `worktree` (isolation flag) | Git-level isolation | Tool-level isolation |
| `fides` | Data trust tagging | Enforces LOW → no-bash mechanically |
| `process_weight` | Process overhead scaling | Sandbox complexity scales with weight |

Three layers of isolation: **worktree (git) → race_prevention (files) → sandbox_agent (tools)**
