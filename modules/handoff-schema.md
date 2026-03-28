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
  verification_status:  # 2026-03-28追加 (arxiv:2601.11653 ACC)
    committed:        # Verified facts (git-committed changes, passed tests, confirmed specs)
      - string
    provisional:      # Unverified information (hypotheses, in-progress designs, untested assumptions)
      - string
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
6. `verification_status.committed` items must have evidence (commit hash, test output, or file reference)
7. `verification_status.provisional` items must NOT be used as implementation basis without re-verification
8. Next session/agent treats `committed` as actionable truth, `provisional` as reference-only (verify before acting)

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

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| genba-neko | Post-work (handoff to next agent) | Include structured handoff data (from, to, status, completed, pending, files_modified, blockers); Tag verification_status on all handoff data |
| shigoto-neko | Handoff review | Validate handoff fields (from/to required, status valid, completed non-empty, action field appropriate) |
| shigoto-neko | Task routing | Use `action` field to decide: auto (proceed), confirm (approve first), propose_only (review only) |
