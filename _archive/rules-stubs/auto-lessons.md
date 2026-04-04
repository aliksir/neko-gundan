# Auto-Lessons Module

> **Module**: `auto_lessons` | **Default**: ON | **Scale**: All

Autonomous knowledge accumulation from both success and failure, inspired by Hyperagents' Archive pattern.

**Full definition**: `modules/auto-lessons.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| genba-neko | During work (step 9.5) | Record learned/constraint/rejected knowledge to `memory/lessons/{topic}.md` |
| shigoto-neko | Completion gate (step 0.5) | Quality check: no duplicates, actionable guidelines, correct tags |
| oyakata-neko | Start gate (dev-lessons search) | Search and apply accumulated lessons |
