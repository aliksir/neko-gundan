# Review Output Module

> **Module**: `review_output` | **Default**: ON | **Scale**: Squad+

Persists review results (simplify, kurouto-neko) to files for traceability.

## Why

Reviews find real issues (C-1: 460-line dead code, C-2: timeout leak). Without file output, these findings exist only in conversation context and agent temp files that get cleaned up. Persisting reviews enables:
- Post-mortem analysis of what reviewers caught
- Pattern detection across reviews (recurring issue types)
- Evidence for completion gates

## Output

```
reviews/YYYYMMDD_{task}_{reviewer}.md
```

Examples:
- `reviews/20260329_neko-claude-brushup_simplify.md`
- `reviews/20260329_neko-claude-brushup_kurouto.md`

## Output Format

```markdown
# Review: {task} — {reviewer}

**Date**: YYYY-MM-DD HH:MM
**Reviewer**: simplify / kurouto-neko
**Target**: {project} ({N} files reviewed)
**Verdict**: APPROVE / REQUEST_CHANGES

## Findings

| # | Severity | File:Line | Issue |
|---|----------|-----------|-------|
| 1 | critical | src/app.ts:338 | ... |

## Files Reviewed

- src/app.ts (1213 lines)
- src/config.ts (60 lines)
- ...

## Confidence

high / medium / low
```

## Who Writes the File

| Reviewer | Writer | Timing |
|----------|--------|--------|
| simplify (code-reviewer agent) | oyakata-neko / shigoto-neko | After agent completes, extract result and write to file |
| kurouto-neko (code-reviewer agent) | oyakata-neko / shigoto-neko | After agent completes, extract result and write to file |

The review agents themselves run in read-only mode (code-reviewer). The parent agent (oyakata or shigoto) receives the result and writes it to file.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| oyakata-neko / shigoto-neko | After simplify completes | Write simplify result to `reviews/YYYYMMDD_{task}_simplify.md` |
| oyakata-neko / shigoto-neko | After kurouto-neko completes | Write kurouto result to `reviews/YYYYMMDD_{task}_kurouto.md` |
| shigoto-neko | Completion gate | Verify review files exist (when reviews were conducted) |

## Completion Gate

When reviews were conducted during the task, add gate item: "Review output files exist in `reviews/`"
