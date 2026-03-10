# Objection Flow Module

> **Module**: Part of core (always active) | **Scale**: All

Unified objection recording and escalation flow across all agents.

## Objection Types

| Protocol | Who raises | To whom | Trigger |
|----------|-----------|---------|---------|
| OBJECTION-001 | Genba-neko | Shigoto-neko | Instructions don't match field reality |
| OBJECTION-002 | Shigoto-neko | Oyakata-neko | Strategy contradicts project purpose |
| OBJECTION-003 | Kurouto-neko | Shigoto-neko | Review reveals design-level issues |

## Whiteboard Recording Format

When any OBJECTION is raised, record it on the whiteboard:

```
### [OBJECTION] {OBJECTION-00X} by {agent-name}
- **Date**: {timestamp}
- **Target**: {who the objection is directed to}
- **Issue**: {factual description}
- **Status**: OPEN / ACCEPTED / REJECTED
- **Resolution**: {decision and reasoning, filled after resolution}
```

## Rules
- **Never delete OBJECTION records** from the whiteboard (kurouto-neko checks them during review)
- OPEN objections block task completion
- Rejected objections must include reasoning
- Kurouto-neko must check `[OBJECTION]` tags before starting review (see agents/kurouto-neko.md)

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| genba-neko | During work | Raise OBJECTION-001 when instructions don't match reality |
| shigoto-neko | During management | Raise OBJECTION-002 when strategy is wrong; Handle OBJECTION-001/003 |
| kurouto-neko | During review | Raise OBJECTION-003 when design is flawed; Check existing OBJECTIONs |
| oyakata-neko | On escalation | Handle OBJECTION-002; Final arbitration |
