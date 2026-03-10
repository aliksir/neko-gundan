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

## Scale Variants

| Scale | Dashboard | Progress Reporting |
|-------|-----------|-------------------|
| **Platoon+** | Full dashboard (`status/dashboard.md`) — create at start, update during, finalize at end | Shigoto-neko manages |
| **Squad** | Optional — SendMessage reports are sufficient | Shigoto-neko or oyakata-neko |
| **Koneko** | No dashboard — progress reported via SendMessage to user directly | Single agent reports to user |
| **Light mode** | No dashboard — but SendMessage progress reports remain mandatory | Implementer reports via SendMessage |

### Koneko / Light Mode Progress Protocol

When dashboard is not used, progress remains visible through:
1. **SendMessage on milestone completion** — report what was done, what's next
2. **SendMessage on blocker discovery** — report immediately, don't wait
3. **Completion report** — final summary of all work done

"No dashboard doesn't mean no visibility. Report your progress."

## Completion Gate

| # | Check | How to verify | Activation condition |
|---|-------|---------------|---------------------|
| 14 | Dashboard finalized | `status/dashboard.md` has final status for all tasks, completion %, and "Mission: COMPLETE" | Platoon+ AND progress_visibility: true |

For koneko/Light mode, this gate item is N/A (no dashboard).
