# Objection Flow Module

> **Module**: Part of core (always active) | **Scale**: All

Unified objection recording and escalation flow across all agents.

**Full definition**: `modules/objection-flow.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| genba-neko | During work | Raise OBJECTION-001 when instructions don't match reality |
| shigoto-neko | During management | Raise OBJECTION-002 when strategy is wrong; Handle OBJECTION-001/003 |
| kurouto-neko | During review | Raise OBJECTION-003 when design is flawed; Check existing OBJECTIONs |
| oyakata-neko | On escalation | Handle OBJECTION-002; Final arbitration |
