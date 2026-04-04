# Multi-Agent-as-Judge Evaluation Module (MAJ-EVAL)

> **Module**: `maj_eval` | **Default**: OFF | **Scale**: Platoon+

Extends single-agent review (kurouto-neko) into a 3-phase deliberation protocol for higher-stakes reviews. Evidence: arxiv:2507.21028 showed MAJ-EVAL achieves 90% human agreement rate, outperforming single LLM judges.

## When to use
- Architecture-changing PRs (new APIs, DB schema changes)
- Security-sensitive code changes
- When ensemble_judge produces a 1:1:1 split
- When kurouto-neko reports `confidence: low`

## When NOT to use
- Squad-scale changes (single reviewer is sufficient)
- Documentation-only changes
- When time pressure outweighs review depth

## 3-Phase Deliberation Protocol

### Phase 1: Independent Assessment
Each judge reviews independently using different strategies:
- **Judge A (kurouto-neko)**: Rubric-based scoring (accuracy, safety, maintainability, tests)
- **Judge B (second reviewer)**: Comparative review (does this match the spec/plan?)
- **Judge C (third reviewer)**: Adversarial review (try to break it, find edge cases)

### Phase 2: Multi-Round Discussion
1. All judges share their Phase 1 findings
2. Each judge responds to the others' findings (agree/disagree with reasoning)
3. Maximum 2 discussion rounds (diminishing returns after that)

### Phase 3: Final Verdict
- Majority vote determines APPROVE/REJECT
- If unanimous: high confidence, proceed
- If 2-1 split: majority wins, but dissenting opinion is recorded in review file
- If 1:1:1 split after discussion: escalate to arbitrator (oyakata-neko)

## Implementation Notes
- Judge B and C can be additional kurouto-neko instances or shigoto-neko acting as reviewer
- All judges operate in read-only mode (no code modifications)
- Review output format follows existing `reviews/YYYYMMDD_{task}_{type}.md` convention
- Discussion is conducted via files in `whiteboard/maj-eval-{task}/`

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | Pre-review (high-stakes) | Invoke MAJ-EVAL instead of single review |
| kurouto-neko | Phase 1 | Independent rubric assessment |
| kurouto-neko (B) | Phase 1 | Independent comparative assessment |
| kurouto-neko (C) | Phase 1 | Independent adversarial assessment |
| All judges | Phase 2 | Multi-round discussion (max 2 rounds) |
| shigoto-neko | Phase 3 | Tally votes, record verdict |
| oyakata-neko | Phase 3 (1:1:1 split) | Arbitration |

## Cost Consideration
MAJ-EVAL costs ~3x a single review. Use judiciously — the default single kurouto-neko review handles 90%+ of cases. Reserve MAJ-EVAL for changes where a wrong review verdict has high blast radius.
