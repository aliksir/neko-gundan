# Koneko Gates — Lightweight Completion Check

> **Type**: Core Rule (koneko mode) | **Scale**: All

Simplified completion gates for PRO-tier users. Check these 3 items before declaring done.

## Before Saying "Done"

| # | Check | How to verify |
|---|-------|---------------|
| 1 | It works | Run tests or manually verify. Paste the evidence. |
| 2 | No unintended changes | `git diff` — only expected files changed |
| 3 | Clean state | `git status` — no forgotten uncommitted files |

## Evidence Format

```markdown
| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | It works | PASS | `npm test`: 12 passed, 0 failed |
| 2 | No unintended changes | PASS | `git diff` shows 2 target files only |
| 3 | Clean state | PASS | `git status`: working tree clean |
```

## Rules
- All 3 must be PASS or N/A (with reason)
- "I checked" is not evidence. Paste command output.
- If any item is FAIL, fix it first

## File Deletion Safety

Same as full Neko Gundan: move to `_deleted/`, never instant-delete.
