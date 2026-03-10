# Progress Visibility Module

> **Module**: `progress_visibility` | **Default**: ON | **Scale**: Platoon+

Ensures work progress is visible to all team members and the commander at all times.

## Problem

"Can't see what's happening" is the worst state for a multi-agent system. Without structured visibility:
- Shigoto-neko cannot detect stalls
- Oyakata-neko cannot make informed decisions
- Commander cannot verify progress

## Dashboard Update Protocol

### What to Record

| Field | Content | Updated by |
|-------|---------|-----------|
| Mission overview | Goal, scale, team structure | Shigoto-neko (at start) |
| Task status | Per-task: not started / in progress / blocked / complete | Shigoto-neko (on each status change) |
| Current blockers | Active blockers with owner | Shigoto-neko (immediately on discovery) |
| Completion % | Tasks complete / total tasks | Shigoto-neko (on task completion) |
| Last updated | Timestamp | Shigoto-neko (every update) |

### When to Update

| Event | Action |
|-------|--------|
| Mission start | Create dashboard entry with team structure |
| Task assigned to genba-neko | Add task row (status: in progress) |
| Genba-neko reports completion | Update status to complete |
| Blocker discovered | Add to blockers section |
| Blocker resolved | Remove from blockers, note resolution |
| Mission complete | Final status update |

### Dashboard Location

`status/dashboard.md` in the project root. One active mission per dashboard.
For multiple concurrent missions, use sections within the same file.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | Pre-dispatch | Create dashboard entry (part of Pre-Dispatch Hard Gate) |
| shigoto-neko | During work | Update on every genba-neko status change |
| shigoto-neko | Completion | Final update with results |
| oyakata-neko | Monitoring | Read dashboard for situation awareness |

## Completion Gate

This module does NOT add a completion gate item (dashboard update is part of the existing pre-dispatch gate and ongoing management responsibility, not a final checkpoint).
