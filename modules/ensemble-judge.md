# Ensemble Judge Module (SE-Jury Method)

> **Module**: `ensemble_judge` | **Default**: OFF | **Scale**: Platoon+

Combines multiple evaluation strategies for important reviews.

## Kurouto-neko: Ensemble Judge

For important reviews (platoon+ or security-related), combine **multiple evaluation strategies**.

### 3 Strategies
1. **Rubric scoring**: 5-aspect rubric (correctness, safety, maintainability, testing, purpose alignment)
2. **Comparative judgment**: Compare before/after, judge if "improved"
3. **Checklist judgment**: Check OWASP/maintainability items one by one

### Task-Specific Rubric Selection (arXiv:2503.23989)

Generic rubrics miss task-specific quality dimensions. Select rubric based on task type:

| Task Type | Primary Focus | Additional Rubric Items |
|-----------|--------------|----------------------|
| Bug fix | Correctness, Regression | Root cause addressed (not just symptoms), edge cases covered |
| New feature | Purpose alignment, API design | Backward compatibility, documentation updated |
| Refactoring | Maintainability, No behavior change | Existing tests still pass, no new dependencies |
| Security fix | Safety, Attack surface | Vulnerability fully remediated, no new attack vectors |

When task type is identified, add task-specific items to the base 4-aspect rubric before evaluation.

### Dynamic Rubric Generation (arXiv:2602.08672)

For novel tasks that don't fit predefined categories, the reviewer agent may generate a task-specific rubric before evaluation:

1. **Generate**: Create evaluation dimensions from the task description and plan
2. **Validate**: Check generated dimensions against base 4-aspect rubric (must include Safety and Correctness)
3. **Apply**: Use the generated rubric for this review only

**Constraint**: Dynamic rubrics are not used for security-critical reviews (factual accuracy requires fixed criteria). Use task-specific selection (above) instead.

## Diversity-Based Integration (arXiv:2510.21513)

**Warning**: Consensus-based voting (majority rule) can fall into the "popularity trap" — amplifying common but wrong outputs. Use diversity-based integration instead.

### Strategy
- Each of the 3 evaluation strategies should use **different evaluation angles**, not converge on the same conclusion
- If all 3 strategies produce identical reasoning, treat as LOW confidence (possible groupthink)
- When available, assign different model tiers to different strategies (e.g., Opus for safety, Sonnet for correctness)

### Updated Integration Rules
- 2+ strategies FAIL → REQUEST_CHANGES (unchanged)
- 2+ strategies PASS with **diverse reasoning** → APPROVE
- 2+ strategies PASS with **identical reasoning** → APPROVE but flag as `[LOW_DIVERSITY]` in review report
- 1:1:1 split → ESCALATE (unchanged)

### Trigger Conditions

| Process Weight | Trigger | Who decides |
|---------------|---------|-------------|
| **Light** | Never triggered (kurouto-neko review is skipped entirely in Light mode) | N/A |
| **Standard** | Only when shigoto-neko **explicitly requests** ensemble review | shigoto-neko |
| **Strict** | **Automatically activated** for all reviews (no explicit request needed) | Automatic |

Normal (Standard) reviews use strategy 1 only. Ensemble is used when shigoto-neko explicitly requests OR when Strict mode is active

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| kurouto-neko | Review (when ensemble triggered) | Run all 3 strategies (rubric, comparative, checklist), integrate results |
| shigoto-neko | Pre-review (Standard weight) | Explicitly request ensemble review when needed |
| kurouto-neko | Review (Strict weight) | Automatically activate ensemble for all reviews |
| kurouto-neko | Post-ensemble (1:1:1 split) | Escalate to arbitrator (oyakata-neko / Opus) |
