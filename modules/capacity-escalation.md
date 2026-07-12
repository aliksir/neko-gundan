# Capacity Escalation Module (CAPACITY-001)

> **Module**: `capacity_escalation` | **Default**: OFF | **Scale**: Battalion

Protocol for shigoto-neko to escalate when management load exceeds capacity.

## Shigoto-neko: Escalation Protocol

When management load exceeds capacity, you are **obligated** to escalate to oyakata-neko **before quality degrades**.
"I'm busy but I'll manage" while sacrificing quality is the worst decision a middle manager can make.

### Trigger Conditions (escalate if any one matches)
- Managing **3+ genba-neko** AND **P0/P1 responses are delayed**
- **Cannot maintain POLLING-001 intervals** (checks can't keep up)
- **Completion gate execution is being deferred** (P2 delays becoming chronic)
- **2+ Heartbeat reports from genba-neko are queued** simultaneously

### Difference from OBJECTION
- OBJECTION-002: "The instruction is **wrong**" -> correctness issue
- CAPACITY-001: "The instruction is right but **I can't handle it all**" -> factual capacity report

### Escalation Template
```
Boss! Capacity report!
Load: [Number of genba-neko managed / active tasks]
What's delayed: [Specifically what's falling behind — categorized by P0/P1/P2]
Quality risk: [What gets sacrificed if this continues]
Proposals:
  - [A: Reprioritize/defer tasks]
  - [B: Reduce genba-neko count (lower parallelism)]
  - [C: Spawn additional shigoto-neko]
  - [D: Other]
```

"Silently letting quality slip because you're overwhelmed is arguably worse than an OBJECTION... YOSHI!"

## Oyakata-neko: Response Flow

When shigoto-neko reports "I can't keep up", **respond immediately**.
Unlike OBJECTION, this isn't about instruction correctness — it's a **factual report of field limits**. Ignoring it leads straight to quality collapse.

### Response Steps
1. **Assess situation**: Check dashboard and TaskList to objectively gauge shigoto-neko's load
2. **Decide**: Choose one of:
   - **Defer tasks**: Push lower-priority Waves back (safest option)
   - **Reduce parallelism**: Fewer genba-neko to lighten management overhead
   - **Add shigoto-neko**: Spawn a 2nd shigoto-neko to distribute management load
   - **Shrink scope**: Add more items to "out of scope" to reduce total volume
3. **Issue orders**: Communicate decision to shigoto-neko and execute restructuring

### Important
- "Just deal with it" is prohibited. When shigoto-neko is over capacity, quality gates become theater
- Capacity escalation is an **obligation, not shame**. Don't blame shigoto-neko for escalating
- If escalations are frequent, the initial task decomposition was likely too aggressive -> reflect in next plan

"If pushing too hard degrades quality, change the formation. That's oyakata's job."

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | During work (on trigger: 3+ genba-neko with delays / polling can't keep up / gates deferred / 2+ queued heartbeats) | Send CAPACITY-001 escalation report to oyakata-neko |
| oyakata-neko | On CAPACITY-001 from shigoto-neko | Assess load, decide response (defer/reduce/add/shrink), issue orders |
