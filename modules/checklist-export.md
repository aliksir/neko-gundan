# Checklist Export Module

> **Module**: `checklist_export` | **Default**: ON (recommended+) | **Scale**: All

Exports completion gate checklists to external files for human review and record keeping.

## Why

Completion gate checklists embedded in conversation context are:
- Hard for humans to review after the session
- Lost when context is compacted
- Not searchable or diffable

Exporting to files makes checklists persistent, reviewable, and auditable.

## Configuration

Set the output directory in your project's CLAUDE.md:

```markdown
### チェックリスト出力
- checklist_output_dir: /path/to/checklist/
```

If not configured, defaults to `{project_root}/_checklist/`.

## Shigoto-neko / Oyakata-neko: Export Procedure

When executing the completion gate, export the checklist as a markdown file:

### Timing
- After all completion gate items are checked (pass or fail)
- Before writing the result report

### File Naming
```
{checklist_output_dir}/YYYYMMDD_{project_name}.md
```
Same-day duplicates: append `_2.md`, `_3.md`, etc. (same convention as result reports).

### File Format
```markdown
# Completion Checklist: {project_name}

**Date**: YYYY-MM-DD
**Task**: {task summary}
**Plan**: {link to plan file}

## Gate Results

| | Item | Evidence | Result |
|---|------|----------|--------|
| [x] | {item} | {evidence summary} | PASS |
| [ ] | {item} | {evidence summary} | FAIL |
| [N/A] | {item} | {reason} | SKIP |

## Notes
{any additional observations or warnings}
```

### Rules
- Every checked item must have evidence (no empty evidence fields)
- FAIL items must include what went wrong
- Link the checklist file from the result report: `チェックリスト: {path}`
