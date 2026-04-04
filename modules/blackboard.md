# Blackboard Module

> **Module**: `blackboard` | **Default**: OFF | **Scale**: Platoon+

Self-selecting task pickup for research/exploration phases. Instead of explicit task assignment, shigoto-neko posts requests to a shared blackboard and genba-neko agents autonomously decide whether to pick them up based on self-assessed capability.

Evidence: arxiv:2510.01285 (LLM-based Multi-Agent Blackboard System) showed 13-57% performance improvement over explicit assignment in research tasks. Central manager does not need to know each agent's capabilities in advance.

## When to use
- Research/exploration phases where task scope is uncertain
- Multiple genba-neko with different specializations available
- Tasks where agent self-selection outperforms top-down assignment

## When NOT to use
- Implementation tasks with clear file ownership (use race_prevention instead)
- Sequential dependency chains (use cascade_failure instead)
- Single genba-neko operations

## Procedure

### Setup (shigoto-neko)
1. Create blackboard file: `whiteboard/blackboard-{task}.md`
2. Post requests in structured format:
   ```yaml
   requests:
     - id: "BB-001"
       description: "Research X and summarize findings"
       required_capability: "web_search"  # optional hint
       status: "OPEN"
       claimed_by: null
   ```

### Claim (genba-neko)
1. Read blackboard at task start
2. Assess own capability against request descriptions
3. Claim by updating `status: "CLAIMED"` and `claimed_by: "genba-neko-{N}"`
4. Only claim tasks you can complete. Over-claiming wastes team resources

### Complete (genba-neko)
1. Update `status: "DONE"` with results summary
2. Write detailed results to assigned output location

### Monitor (shigoto-neko)
1. Poll blackboard every 10 minutes
2. Reclaim OPEN tasks that remain unclaimed after 15 minutes
3. Reassign CLAIMED tasks that show no progress after 20 minutes

## Rules
- One genba-neko, one claim at a time (no hoarding)
- OPEN→CLAIMED→DONE is the only valid state transition
- Shigoto-neko can force-assign unclaimed tasks (fallback to explicit assignment)

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | Pre-dispatch (research phase) | Create blackboard, post requests |
| genba-neko | Pre-work | Read blackboard, claim matching tasks |
| genba-neko | Post-work | Update blackboard with results |
| shigoto-neko | Polling | Monitor claims, reassign stale tasks |
