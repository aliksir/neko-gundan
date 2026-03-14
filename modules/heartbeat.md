# Heartbeat & Polling Module (HEARTBEAT-001 / POLLING-001)

> **Module**: `heartbeat` | **Default**: ON | **Scale**: Platoon+

Active progress monitoring and stuck detection.

## Genba-neko: Heartbeat Protocol (HEARTBEAT-001)

Genba-neko has an **obligation to report when stuck**, including the fact and reason for being stuck.
"Struggling in silence" and "pushing through hoping it'll work out" are the most dangerous. Silence is a precursor to incidents.

### Report Triggers (report immediately if any one matches)
- **Stuck for 5+ minutes** (including investigation and trial-and-error)
- **Same error occurred twice** (report before attempting a third time)
- **Don't understand the instructions** (don't proceed on guesswork)
- **Encountered unexpected state** (missing files, changed APIs, etc.)

### Report Format
```
Boss, Heartbeat report!
Status: [Stalled / Investigating / Blocked]
Why I'm stuck: [Specific situation]
What I tried: [Approaches attempted so far]
What I need: [Decision / Information / Alternative approach suggestion / Nothing (report only)]
```

### Auto-Escalation
- **3 consecutive errors** -> Add `[ESCALATION]` tag to Heartbeat report. Shigoto-neko intervenes immediately
- **10+ minutes with no progress** -> Don't just mutter "How... nothing's working..." — **verbalize** what's happening and report it

"Struggling in silence isn't a virtue. The sooner you speak up, the sooner it gets fixed."

## Causal Failure Attribution (arXiv:2602.23701)

When a task fails or gets stuck, identify **root cause vs. symptoms** before taking action.

### Attribution Steps (for shigoto-neko on L2+ escalation)

1. **Collect timeline**: List all actions taken by the stuck agent in order
2. **Identify the first deviation**: When did actual behavior diverge from expected?
3. **Trace causality backward**:
   - Was the deviation caused by incorrect input (upstream agent's fault)?
   - Was it caused by incorrect instructions (shigoto-neko's fault)?
   - Was it caused by environmental issues (missing files, API failures)?
   - Was it caused by the agent's own logic error?
4. **Classify**:
   | Root Cause | Responsibility | Action |
   |-----------|---------------|--------|
   | Upstream agent error | Upstream agent | Fix upstream, re-run downstream |
   | Instruction error | Shigoto-neko | Revise instructions, re-assign |
   | Environmental issue | No agent at fault | Fix environment, retry |
   | Agent logic error | Current agent | Re-approach with different strategy |

5. **Record** in Reflexion format with causal chain:
   ```
   Reflexion:
     What happened: [symptom]
     Root cause: [actual cause, traced back]
     Causal chain: [upstream event] → [intermediate] → [observed failure]
     Next time: [specific preventive action targeting root cause]
   ```

### Why This Matters
Without causal attribution, the same root cause produces repeated failures across different agents. "Fix the symptom" leaves the root cause intact.

## Shigoto-neko: Polling Protocol (POLLING-001)

Shigoto-neko has an **obligation to actively check** genba-neko's progress, not just wait for reports.
"No report ≠ all good. No report = silence. Be suspicious."

### Polling Timing
- **5 minutes after assigning a task** -> Check progress via TaskGet
- **Every 10 minutes thereafter** -> Confirm progress is moving
- **When a Heartbeat report has `[ESCALATION]` tag** -> Intervene immediately

### Check Actions
```
1. TaskGet to check genba-neko's task status
2. Progress exists -> Do nothing (quietly observe)
3. No progress -> SendMessage: "Hey genba-neko, how's it going? Give me a status update"
4. No progress 2 consecutive times -> Direct intervention:
   - Read genba-neko's work output directly
   - Identify blockers
   - Change approach / re-split task / reassign to different genba-neko
```

### Silence Pattern Detection
| Pattern | Signs | Response |
|---------|-------|----------|
| **Stuck but afraid to ask** | Zero messages after task start | Reach out: "Everything OK?" |
| **Infinite research loop** | "Investigating" continues, no deliverables | Narrow the investigation scope |
| **Perfectionism trap** | Working code exists but "still incomplete" | Order: "Show me what works first" |
| **Premise collapse** | Error reports contradict task premises | Re-evaluate entire task |

"A manager who only waits for reports isn't managing. Go check yourself... YOSHI!"

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| genba-neko | During work (step 6) | Report when stuck (5min/2errors/unclear/unexpected). 3 consecutive errors -> `[ESCALATION]` |
| shigoto-neko | After assignment (Progress Monitoring) | Poll at 5min, then every 10min. Respond to `[ESCALATION]` immediately |
