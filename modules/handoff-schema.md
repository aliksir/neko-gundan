# Structured Handoff Schema Module

> **Module**: `handoff_schema` | **Default**: OFF | **Scale**: Platoon+

Structured data format for inter-agent work handoffs.

## Required Fields

For platoon+ inter-agent handoffs, include this structured data:

```yaml
handoff:
  from: string       # Role label (e.g., "genba-neko A", "shigoto-neko")
  to: string         # Handoff target
  status: enum       # "complete" | "partial" | "blocked"
  completed:         # Completed work
    - string
  pending:           # Remaining work
    - string
  files_modified:    # Changed file paths
    - string
  blockers:          # Blockers (if any)
    - string
```

## Validation Rules

1. `from` and `to` are required. Empty string prohibited
2. `status` must be one of the 3 values
3. `completed` must have at least 1 item (if nothing done, no handoff needed)
4. If `files_modified` is empty, `status` should be `"blocked"`
5. The receiver must be able to act on "what to do" alone. No implicit assumptions

## Action Field (Optional)

```yaml
handoff:
  action: enum  # "auto" | "confirm" | "propose_only"
```

| Value | Meaning | Use case |
|-------|---------|----------|
| `auto` | Receiver starts immediately | Tests passed, next phase transition |
| `confirm` | Requires shigoto-neko approval | Work involving design decisions |
| `propose_only` | Proposal only, don't execute | High-risk changes |

Default: `confirm` (fail-safe)
