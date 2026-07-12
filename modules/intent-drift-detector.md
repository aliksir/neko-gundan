# Intent Drift Detector Module (IDD)

> **Module**: `intent_drift_detector` | **Default**: OFF | **Scale**: Platoon+

Detects divergence between task intent and actual agent actions during a session. Based on RL/robotics goal drift concepts applied to LLM coding agents.

## Architecture

```
ISV Phase 4 (offline)     →  weights.json (reference values)
                              ↓
IDD Core (runtime)        ←  normalizeVector / cosineSimilarity / detectDrift
                              ↓
IDD Hook (PostToolUse)    →  idd-session.json (per-session state)
```

## Intent Vector

The intent vector captures the task's characteristics in 5 dimensions (from ISV schema):

| Dimension | Description | Weight (Phase 4 derived) |
|-----------|-------------|-------------------------|
| urgency | How time-sensitive the task is | 0.13 |
| risk | Potential blast radius of the task | 0.03 |
| complexity | Technical difficulty | 0.08 |
| novelty | How new/unfamiliar the task is | 0.03 |
| purpose_alignment | How well actions align with project purpose | 0.34 |

**purpose_alignment is the dominant dimension** — it accounts for 55% of the weighted signal. This reflects ISV Phase 4 analysis showing it's the strongest discriminator between success and risk patterns.

## Drift Detection

Each tool call generates an action vector estimated from the tool type and input. The drift angle is the cosine distance between the intent vector and the cumulative action trend.

### Thresholds

| Similarity | Angle | Level | Action |
|-----------|-------|-------|--------|
| >= 0.7 | < 45° | OK | No action |
| 0.5 - 0.7 | 45° - 60° | WARNING | stderr warning |
| < 0.5 | > 60° | ALERT | stderr alert + anchor_count++ |

### Warmup Period

The first 5 tool calls are excluded from drift calculation (warmup). Early session actions (exploratory reads, status checks) typically diverge from the task intent but are normal behavior.

## Auto-Anchor Protocol

When an ALERT is triggered:

1. The hook outputs `[idd] ALERT` to stderr
2. `anchor_count` is incremented in the session file
3. The agent should re-read the task plan/checklist to re-anchor to objectives
4. If `anchor_count >= 3`, escalate to commander (task may be poorly scoped)

**Note**: IDD does not block operations. It is advisory-only (warning/alert to stderr).

## Session File

- **Location**: `~/.claude/idd-session.json`
- **Fields**: intent_vector, action_history[], current_drift_angle, drift_level, anchor_count, tool_count
- **Max history**: 100 actions (FIFO)
- **Lifecycle**: Per-session, created on first tool call

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| idd-tracker.mjs | PostToolUse (all tools) | Estimate action vector, compute drift, warn if threshold exceeded |
| oyakata-neko | Start gate | Set intent_vector from plan's Intent Resolution |
| shigoto-neko | Polling | Check drift_level in session file; re-anchor if WARNING/ALERT |
| kurouto-neko | Review | Verify drift_angle < 45° (OK) for the session |

## Limitations

- Action vector estimation is heuristic (tool-type-based, not content-aware)
- Cannot detect semantic drift within a single tool call
- Warmup period may mask early drift in very short tasks
- Session-scoped only (no cross-session tracking)
