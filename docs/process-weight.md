# Process Weight — Light to Strict

Every task doesn't need the same level of ceremony. Process weight lets you match the process to the task.

## Quick Reference

| Weight | Trigger keywords | What happens |
|--------|-----------------|--------------|
| **Light** | "ライトで", "light mode", "サクッと", "quick fix" | Quick gate, self-check OK, no plans/reports |
| **Standard** | (default) | Full gates, independent review, standard process |
| **Strict** | "厳密に", "strict mode", "慎重に", "リリース前" | Full gates + ensemble judge, ISV, arbitrator standby |

## Light Mode in Detail

Light mode is for genuinely small tasks: typo fixes, config tweaks, 1-2 file changes.

**What's simplified:**
- Completion gate → Quick gate (test + diff + commit only)
- Review → Self-check allowed (implementer ≠ reviewer not enforced)
- Plans/Reports → 1-line summary instead of full documents
- ISV/Whiteboard → Skipped

**What's NOT simplified (safety is never reduced):**
- File deletion → Still goes to `_deleted/`
- Race prevention → Still active
- Safety tiers → Tier 1 still absolutely prohibited
- FIDES trust levels → External data still tagged LOW

## Agent Escalation (ESCALATION-001)

The key innovation: agents can **push back on light mode** if they see risk.

### When to escalate

| Trigger | Example |
|---------|---------|
| 3+ files need changes | "I thought it was 1 file but it affects 3" |
| DB/API changes | "This needs a migration" |
| Security-relevant | "This touches authentication logic" |
| Tests break unexpectedly | "Existing test suite has failures" |
| Professional judgment | "This is more complex than it looks" |

### How it works

```
1. Agent detects risk during light-mode work
2. Files ESCALATION-001 with reason
3. Oyakata/shigoto decides: ACCEPT / REJECT / MODIFY
4. Work continues (no restart needed)
```

### Key rules

- **Escalation is never punished** — better to escalate unnecessarily than miss real risk
- **Downgrading requires human approval** — agents can upgrade, only humans can downgrade
- **Work continues** — escalation doesn't mean starting over

## Strict Mode in Detail

Use strict mode for high-stakes changes:

**What's added on top of standard:**
- Ensemble judge (3-strategy evaluation)
- Mandatory ISV recording
- Arbitrator on standby
- Reflexion even on success (learn from wins too)
- Aggressive polling (5min intervals)

## Examples

### Light: Fix a typo
```
Human: "Fix the typo in README.md, light mode"
→ Agent fixes typo, runs quick gate (test + diff + commit), done
```

### Standard: Add a feature (default)
```
Human: "Add dark mode support"
→ Full process: plan → implement → review → completion gate
```

### Light → Standard escalation
```
Human: "Update the config file, light mode"
Agent: "ESCALATION-001: This config change requires updating 4 dependent files
        and a database migration. Requesting upgrade to Standard."
Oyakata: "ACCEPT. Switch to Standard."
→ Continues with full process from current progress
```

### Strict: Pre-release
```
Human: "Final checks before deploy, strict mode"
→ Ensemble judge, ISV recorded, all gates with full evidence, arbitrator ready
```
