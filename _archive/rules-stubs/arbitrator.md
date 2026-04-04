# Arbitrator Module

> **Module**: `arbitrator` | **Default**: OFF | **Scale**: Platoon+

Formal mediation process when review loops exceed limits or confidence is low.

**Full definition**: `modules/arbitrator.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| oyakata-neko | On trigger (review 3+ cycles / confidence: low / ensemble split / unresolvable OBJECTION) | Intervene as arbitrator: gather info, identify dispute, issue ruling |
| oyakata-neko | Post-ruling | Record ruling in dashboard "Decisions" section |
| kurouto-neko | Review judgment | Escalate to arbitrator when confidence: low or ensemble result is 1:1:1 split |
| shigoto-neko | Review loop monitoring | Escalate to arbitrator when review loop exceeds 3 cycles |
