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

## Session Handover Template (Factory.ai evidence-based)

For session-to-session handovers (e.g., `/handover`), use this structured 5-field format instead of free-form text. Evidence: Factory.ai analysis of 36,000+ SE sessions showed structured summaries retain technical details at 4.04/5 accuracy vs 3.43-3.44 for free-form (arxiv ref: Factory.ai compression evaluation, 2025).

```yaml
session_handover:
  intent: string       # What was being worked on and why
  changes:             # Files modified/created/deleted
    - "[new] path/to/file"
    - "[modified] path/to/file"
    - "[deleted] path/to/file"
  decisions:           # Design decisions made (including rejected alternatives)
    - string
  failures:            # Approaches that failed and why (prevents re-exploration)
    - string
  next_steps:          # What needs to happen next
    - string
```

### Fields Guide

| Field | What to include | What NOT to include |
|-------|----------------|---------------------|
| `intent` | The goal and its motivation | Implementation details (those are in `changes`) |
| `changes` | File paths with [new]/[modified]/[deleted] tags | File contents or diffs |
| `decisions` | What was chosen AND why, rejected alternatives | Obvious choices that need no explanation |
| `failures` | Failed approach + root cause | Temporary errors that were fixed |
| `next_steps` | Actionable items the next session can execute | Vague goals like "continue working" |

## Audited Handoff Protocol (2026-04-05追加, arxiv:2604.01647)

Every agent-to-agent handoff is a **trust boundary**. Treat it with the same rigor as a system interface. The 4-phase protocol ensures no unverified data crosses agent boundaries.

### 4 Phases

```
Prepare → Verify → Approve → Commit
```

| Phase | Who | What | Evidence |
|-------|-----|------|----------|
| **Prepare** | Sending agent (genba-neko) | Fill all handoff fields, attach verification_status | Handoff YAML complete |
| **Verify** | Sending agent | Self-check: committed items have evidence, provisional items are labeled | verification_status populated |
| **Approve** | Receiving agent (shigoto-neko) | Validate fields per Validation Rules; check action field | Approval logged in audit trail |
| **Commit** | Receiving agent | Accept handoff, proceed with next phase | Handoff recorded on whiteboard |

### When to Apply
- **Platoon+**: Full 4-phase protocol (mandatory)
- **Squad**: Prepare + Commit only (Verify/Approve implicit in shigoto-neko review)
- **Recon**: Not applicable
