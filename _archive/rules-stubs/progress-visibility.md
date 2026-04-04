# Progress Visibility Module

> **Module**: `progress_visibility` | **Default**: ON | **Scale**: Platoon+

Ensures work progress is visible to all team members and the commander at all times.

**Full definition**: `modules/progress-visibility.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | Pre-dispatch | Create dashboard entry (part of Pre-Dispatch Hard Gate) |
| shigoto-neko | During work | Update on every genba-neko status change |
| shigoto-neko | Completion | Final update with results |
| oyakata-neko | Monitoring | Read dashboard for situation awareness |
