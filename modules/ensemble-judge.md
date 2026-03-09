# Ensemble Judge Module (SE-Jury Method)

> **Module**: `ensemble_judge` | **Default**: OFF | **Scale**: Platoon+

Combines multiple evaluation strategies for important reviews.

## Kurouto-neko: Ensemble Judge

For important reviews (platoon+ or security-related), combine **multiple evaluation strategies**.

### 3 Strategies
1. **Rubric scoring**: 4-aspect rubric (correctness, safety, maintainability, testing)
2. **Comparative judgment**: Compare before/after, judge if "improved"
3. **Checklist judgment**: Check OWASP/maintainability items one by one

### Integration
- 2+ strategies FAIL -> REQUEST_CHANGES
- 2+ strategies PASS -> APPROVE
- 1:1:1 split -> ESCALATE (arbitrator Opus)
- Normal reviews use strategy 1 only. Ensemble only when shigoto-neko explicitly requests
