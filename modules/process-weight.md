# Process Weight Module (ESCALATION-001)

> **Module**: `process_weight` | **Default**: ON | **Scale**: All

Dynamic process weight selection. Start light, escalate when needed.

## Three Process Weights

| | Light | Standard | Strict |
|---|---|---|---|
| **Trigger** | Keyword (see below) | Default | Keyword or pre-release |
| **Completion gate** | Quick gate (test + diff only) | Full gate | Full gate + ensemble judge |
| **Review** | Self-check allowed | Implementer ≠ Reviewer | Required + ensemble |
| **Objections** | Escalation only | Normal | Obligatory + arbitrator standby |
| **Whiteboard** | None | Platoon+ | Required |
| **Plans/Reports** | 1-line summary | Standard | Detailed |
| **ISV** | Skip | Optional | Required |

## Activation Keywords

Users trigger process weight with natural language:

**Light mode:**
- "ライトで" / "ライトモードで" / "軽くやって" / "サクッと"
- "light mode" / "quick fix"

**Strict mode:**
- "厳密に" / "ストリクトで" / "慎重に" / "リリース前"
- "strict mode" / "careful"

**Standard:** Default when no keyword is given.

## Light Mode — Quick Gate

Replaces the full completion gate with a minimal check:

| # | Check | How to verify |
|---|-------|---------------|
| 1 | Tests pass | Run test suite |
| 2 | No unintended diff | `git diff` shows only target files |
| 3 | Committed | `git status` is clean |

That's it. No plans/, no reports/, no ISV, no whiteboard.

### Self-check Definition

"Self-check allowed" in Light mode means:

✓ Allowed:
  - Run tests to verify functionality
  - Run lint/type checks for static quality
  - `git diff` to verify no unintended changes
  - Basic logic check ("is this if-branch correct?")

✗ Not allowed (requires Standard/Strict mode):
  - Critical review from alternative perspectives
  - Security deep-dive
  - Maintainability/architecture evaluation

## Escalation Protocol (ESCALATION-001)

**Any agent** can request a process weight upgrade. This is an **obligation, not a suggestion** — if an agent sees risk that exceeds the current weight, they must speak up.

### Escalation Triggers

Escalate from Light to Standard if **any one** matches:

| Trigger | Why |
|---------|-----|
| 3+ files need changes | Scope exceeds "quick fix" |
| DB or API changes involved | Structural risk |
| Security-relevant changes | Safety risk |
| Existing tests break | Unexpected blast radius |
| Agent judges "this isn't light" | Professional judgment |

### Escalation Format

```
ESCALATION-001: Process weight upgrade request
Current: Light
Proposed: Standard (or Strict)
Reason: [Specific trigger — e.g., "This touches 4 files including DB migration"]
```

### Escalation Flow

```
Agent detects risk
    ↓
Files ESCALATION-001
    ↓
Oyakata-neko (or shigoto-neko if no oyakata) decides:
    ├── ACCEPT  → Switch to higher weight, continue
    ├── REJECT  → Stay at current weight (must state reason)
    └── MODIFY  → Partial upgrade (e.g., "add review but skip whiteboard")
```

### Rules

- Escalation is **never punished**. False positives are acceptable; missed risks are not
- The escalated agent **continues working** — don't restart from scratch
- Downgrading (Standard → Light) is allowed but requires explicit human approval
- Rejection must include reasoning: "Reject because [scope is actually contained to 1 file]"

## Strict Mode — When to Use

Strict mode adds maximum verification on top of standard:

- Pre-release changes
- Production database changes
- Security-sensitive features
- When the commander says "慎重に" / "careful"

Strict mode activates: ensemble judge, mandatory ISV, full evidence gates, arbitrator on standby.

## Integration with Existing Protocols

| Protocol | Light | Standard | Strict |
|----------|-------|----------|--------|
| OBJECTION-001/002 | Escalation only | Active | Active + arbitrator |
| HEARTBEAT-001 | Active | Active | Active |
| POLLING-001 | Relaxed (15min) | Normal (10min) | Aggressive (5min) |
| RACE-001 | Active | Active | Active |
| Reflexion | On failure only | On failure | Always (even on success) |

> Safety protocols (RACE-001, HEARTBEAT-001, safety tiers) are **never reduced** by process weight. Light mode makes the process lighter, not less safe.

> **SSOT**: The canonical gate item list is in `rules/completion-gates.md`. This module defines which SUBSET of items to check for each weight level.
