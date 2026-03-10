# Ensemble Judge Module (SE-Jury Method)

> **Module**: `ensemble_judge` | **Default**: OFF | **Scale**: Platoon+

Combines multiple evaluation strategies for important reviews.

## Kurouto-neko: Ensemble Judge

For important reviews (platoon+ or security-related), combine **multiple evaluation strategies**.

### 3 Strategies
1. **Rubric scoring**: 5-aspect rubric (correctness, safety, maintainability, testing, purpose alignment)
2. **Comparative judgment**: Compare before/after, judge if "improved"
3. **Checklist judgment**: Check OWASP/maintainability items one by one

### Integration
- 2+ strategies FAIL -> REQUEST_CHANGES
- 2+ strategies PASS -> APPROVE
- 1:1:1 split -> ESCALATE (arbitrator Opus)
### Trigger Conditions

| Process Weight | Trigger | Who decides |
|---------------|---------|-------------|
| **Light** | Never triggered (kurouto-neko review is skipped entirely in Light mode) | N/A |
| **Standard** | Only when shigoto-neko **explicitly requests** ensemble review | shigoto-neko |
| **Strict** | **Automatically activated** for all reviews (no explicit request needed) | Automatic |

Normal (Standard) reviews use strategy 1 only. Ensemble is used when shigoto-neko explicitly requests OR when Strict mode is active
