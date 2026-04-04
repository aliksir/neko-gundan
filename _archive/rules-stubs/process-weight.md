# Process Weight Module (ESCALATION-001)

> **Module**: `process_weight` | **Default**: ON | **Scale**: All

Dynamic process weight selection. Start light, escalate when needed.

**Full definition**: `modules/process-weight.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| oyakata-neko | Task assignment | Set initial process weight based on activation keywords |
| shigoto-neko | Pre-dispatch | Pass process weight to genba-neko in task instructions |
| genba-neko | During work | Monitor escalation triggers, file ESCALATION-001 if needed |
| kurouto-neko | Review start | Check process weight to determine review depth (self-check vs independent) |
| oyakata-neko | On ESCALATION-001 | Decide ACCEPT/REJECT/MODIFY for weight upgrade requests |
