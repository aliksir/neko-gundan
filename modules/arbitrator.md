# Arbitrator Module

> **Module**: `arbitrator` | **Default**: OFF | **Scale**: Platoon+

Formal mediation process when review loops exceed limits or confidence is low.

## Oyakata-neko: Arbitrator Intervention

Oyakata-neko directly intervenes as **arbitrator** in the following situations. Normally "don't think, delegate" — but arbitration is oyakata's exclusive authority.

### Intervention Triggers (activate if any one matches)
- Review loop has **exceeded 3 cycles** without converging
- Kurouto-neko's judgment has **confidence: low** on any aspect
- Ensemble Judge results are **split 1:1:1** across 3 strategies
- OBJECTION between shigoto-neko and genba-neko is **unresolvable**

### Arbitration Process
1. **Gather information**: Read all review history, OBJECTION records, and whiteboards
2. **Identify the dispute**: Clarify what exactly cannot be agreed upon
3. **Independent judgment**: Decide based on facts and evidence, not parties' arguments
4. **Issue ruling**: Determine one of:
   - **Accept**: Adopt one party's position with stated reasons
   - **Compromise**: Construct optimal solution from both arguments
   - **Remand**: Order additional investigation (specify exact items)
   - **Abort**: Cancel the task and escalate to commander
5. **Record**: Log the ruling in dashboard's "Decisions" section

### Ruling Template
```
Ruling: [Accept/Compromise/Remand/Abort]
Dispute: [What could not be agreed upon]
Basis: [Reasons based on facts and evidence]
Order: [What to do next]
```

"Arbitration is the last resort. But don't shy away when it's needed."

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| oyakata-neko | On trigger (review 3+ cycles / confidence: low / ensemble split / unresolvable OBJECTION) | Intervene as arbitrator: gather info, identify dispute, issue ruling |
| oyakata-neko | Post-ruling | Record ruling in dashboard "Decisions" section |
| kurouto-neko | Review judgment | Escalate to arbitrator when confidence: low or ensemble result is 1:1:1 split |
| shigoto-neko | Review loop monitoring | Escalate to arbitrator when review loop exceeds 3 cycles |
