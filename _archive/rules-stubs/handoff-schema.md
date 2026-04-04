# Structured Handoff Schema Module

> **Module**: `handoff_schema` | **Default**: OFF | **Scale**: Platoon+

Structured data format for inter-agent work handoffs.

**Full definition**: `modules/handoff-schema.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| genba-neko | Post-work (handoff to next agent) | Include structured handoff data (from, to, status, completed, pending, files_modified, blockers) |
| shigoto-neko | Handoff review | Validate handoff fields (from/to required, status valid, completed non-empty, action field appropriate) |
| shigoto-neko | Task routing | Use `action` field to decide: auto (proceed), confirm (approve first), propose_only (review only) |
