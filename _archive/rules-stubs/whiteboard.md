# Whiteboard Module (WHITEBOARD-001)

> **Module**: `whiteboard` | **Default**: ON | **Scale**: All

Cross-agent knowledge sharing and context persistence through a shared whiteboard file.

**Full definition**: `modules/whiteboard.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | Pre-dispatch gate | Create whiteboard, fill team structure + タスク依存グラフ (mandatory, no skip) |
| shigoto-neko | Post-all-completion | Update Aggregation Result section (FANOUT-001) |
| genba-neko | Pre-work (step 3) | Read whiteboard (mandatory for platoon+, check if exists for squad). Check dependency graph for own task status |
| genba-neko | Post-work (step 9) | Write findings that affect other agents |
