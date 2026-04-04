# Capacity Escalation Module (CAPACITY-001)

> **Module**: `capacity_escalation` | **Default**: OFF | **Scale**: Battalion

Protocol for shigoto-neko to escalate when management load exceeds capacity.

**Full definition**: `modules/capacity-escalation.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | During work (on trigger: 3+ genba-neko with delays / polling can't keep up / gates deferred / 2+ queued heartbeats) | Send CAPACITY-001 escalation report to oyakata-neko |
| oyakata-neko | On CAPACITY-001 from shigoto-neko | Assess load, decide response (defer/reduce/add/shrink), issue orders |
