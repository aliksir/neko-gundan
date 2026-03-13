# Harness Engineering — How Neko Gundan Aligns

> Reference: [Harness Engineering Best Practices 2026](https://nyosegawa.github.io/posts/harness-engineering-best-practices-2026/)

"The model doesn't matter. The harness does." A 22-point SWE-bench improvement came from harness changes, while switching models added only 1 point. This document maps Harness Engineering principles to Neko Gundan's implementation.

## What is Harness Engineering?

The system surrounding an AI agent — prompts, tools, feedback loops, safety rails — matters more than the model itself. Good harnesses make average models perform well; bad harnesses make great models fail.

## Principle Mapping

| Harness Principle | Neko Gundan Implementation | Module/File |
|---|---|---|
| **Millisecond feedback** | PostToolUse auto-lint hook | `hooks/post-tool-lint.sh` |
| **Fix code, not config** | Linter config protection | `modules/linter-protection.md` |
| **Separate writer and reviewer** | Implementer != Reviewer | `rules/review-protocol.md` |
| **Evidence over claims** | Completion gates with evidence | MEMORY.md gates |
| **Agents that push back** | OBJECTION protocol | Agent definitions |
| **Safe deletion** | `_deleted/` buffer | `rules/safety-tiers.md` |
| **Race condition prevention** | File ownership tracking | `modules/race-prevention.md` |
| **Stuck detection** | Heartbeat + 3-layer Watchdog | `modules/heartbeat.md` |
| **Structured handoffs** | YAML handoff schema + FIDES | `modules/handoff-schema.md`, `modules/fides.md` |
| **Keep instructions focused** | Process Weight (light/standard/strict) | `modules/process-weight.md` |

## Key Insights for Users

### 1. Keep Your CLAUDE.md Small

Research (IFScale) shows LLMs degrade with 150-200+ instructions. Neko Gundan mitigates this by:
- Splitting rules across `agents/`, `rules/`, `modules/` directories
- Loading only what's needed via mode selection
- Using [Shitsuke](shitsuke-guide.md) to toggle modules ON/OFF

**Recommendation**: Keep your project's CLAUDE.md under 50 lines of direct instructions. Use `@import` patterns or file references for details.

### 2. Feedback Loops Are Everything

The #1 harness improvement is fast feedback. Neko Gundan provides:
- **PostToolUse lint hook**: Catches errors at write time, not review time
- **Heartbeat protocol**: Detects stuck agents in minutes, not hours
- **Quality gates**: Forces evidence collection at completion time

### 3. The Agent Should Not Edit Its Own Rules

Just as linter configs should be protected from agents, so should:
- CLAUDE.md (agent instructions)
- Agent definitions (`.claude/agents/`)
- Safety rules (`.claude/rules/`)

Neko Gundan enforces this via Safety Tiers and config management rules.

### 4. Architecture Decision Records (ADRs)

For long-running projects, consider ADRs alongside Neko Gundan:

```markdown
# ADR-001: Use SQLite for local storage

**Status**: Accepted
**Date**: 2026-03-10
**Context**: Need local persistence for bot data
**Decision**: SQLite via better-sqlite3
**Consequences**: Single-file DB, no server needed, limited concurrency
```

ADRs complement Neko Gundan's whiteboard system — whiteboards are per-mission tactical notes, while ADRs are permanent project decisions.

## Anti-Patterns to Watch For

From Harness Engineering research:

| Anti-Pattern | Detection | Neko Gundan Defense |
|---|---|---|
| **Ghost files** (created but never imported) | Review gate: check imports | Completion gate evidence |
| **Comment flooding** | Code review rubric | kurouto-neko maintainability check |
| **Linter config weakening** | PreToolUse hook | Linter protection module |
| **Infinite retry loops** | 3-layer Watchdog | L1/L2/L3 escalation |
| **Self-approving changes** | — | Implementer != Reviewer |
| **Security vulnerabilities** (36-40% of AI code) | External tool integration | JiT tests, ensemble judge |

## Further Reading

- [Modes Guide](modes.md) — Install only what you need
- [Process Weight](process-weight.md) — Scale process overhead to task size
- [Shitsuke Guide](shitsuke-guide.md) — Toggle modules ON/OFF
- [Architecture](architecture.md) — System design overview
