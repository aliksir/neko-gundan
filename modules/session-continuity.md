# Session Continuity Module (SNAPSHOT-001)

> **Module**: `session_continuity` | **Default**: ON | **Scale**: All

Proactive state snapshots to survive context compaction. Complements the existing post-compaction recovery protocol in genba-neko.md by saving state *before* compaction occurs.

## Problem

Claude Code's context compaction discards earlier conversation turns. Long-running agents lose track of:
- Which files were modified and why
- Current task progress and next steps
- Decisions made earlier in the session

The existing "Compaction Recovery Protocol" (genba-neko.md) handles *after* compaction, but by then the state is already lost. This module adds *before* compaction protection.

## Mechanism

Agents periodically write a snapshot file during long-running work. After compaction, the agent reads this file to restore working context instead of relying on compressed conversation history.

### Snapshot File

- **Path**: `status/snapshots/{agent_name}_snapshot.md`
- **Mode**: Overwrite (latest state only — not a log)

### Template

```markdown
# Snapshot: {agent_name}
**Updated**: YYYY-MM-DD HH:MM

## Current Task
- task_id: {id}
- description: {what I'm doing}
- phase: {Phase 1-4 of genba-neko workflow}

## Progress
- [x] {completed step}
- [ ] {next step}  ← resume here

## Modified Files
- `path/to/file.ts` — {what changed}

## Key Decisions
- {decision made during this session, with rationale}

## Blockers / Notes
- {anything the next context needs to know}
```

## When to Snapshot

| Trigger | Action |
|---------|--------|
| **Phase transition** (Phase 1→2→3→4) | Write snapshot at each boundary |
| **10+ tool calls since last snapshot** | Write snapshot |
| **Shigoto-neko instruction** | Write snapshot immediately |
| **Before large operation** (batch file edits, long test run) | Write snapshot |

Agents do NOT need to snapshot on every tool call. The goal is periodic checkpoints, not continuous logging.

## Recovery (Post-Compaction)

When an agent detects compaction (context feels thin, task details are vague):

1. Read `status/snapshots/{agent_name}_snapshot.md`
2. Read task state via `TaskGet`
3. Resume from the `← resume here` marker
4. Write "Recovered from snapshot" in next report

This works alongside the existing Compaction Recovery Protocol — snapshot provides the *data*, the protocol provides the *procedure*.

## Agent Responsibilities

### Genba-neko
- Write snapshots at phase transitions and every 10+ tool calls
- On compaction recovery: read snapshot first, then follow existing recovery protocol
- Keep snapshots concise (under 50 lines)

### Shigoto-neko
- Can instruct genba-neko to snapshot before risky operations
- On polling: if genba-neko seems confused post-compaction, point them to their snapshot
- Clean up stale snapshots after mission completion (`status/snapshots/` directory)

### Oyakata-neko
- No direct snapshot responsibility
- On session handover: snapshot data may inform `/handover` content

## Cleanup

Snapshot files are ephemeral — they exist only during active work.

- **Mission complete**: Shigoto-neko deletes `status/snapshots/` contents
- **Session end**: Snapshot content is absorbed into `/handover` if relevant
- **Stale snapshots** (>24h old with no active task): safe to delete

## Relationship to Other Modules

| Module | Relationship |
|--------|-------------|
| `heartbeat` | Heartbeat reports status; snapshots preserve full state |
| `whiteboard` | Whiteboard is cross-agent; snapshots are per-agent |
| `raw_log` | Raw log is complete history; snapshots are latest state only |
| `handoff_schema` | Handoff is inter-agent transfer; snapshots are self-recovery |

## Design Origin

Inspired by [context-mode](https://github.com/mksglu/context-mode)'s Session Continuity layer, which uses SQLite + hooks to capture state before compaction. This module adapts the concept to file-based snapshots suitable for the neko-gundan architecture.
