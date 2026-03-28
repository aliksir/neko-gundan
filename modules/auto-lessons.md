# Auto-Lessons Module

> **Module**: `auto_lessons` | **Default**: ON | **Scale**: All

Autonomous knowledge accumulation inspired by Hyperagents' Archive pattern. Captures learned/constraint/rejected knowledge during work (not just on failure), enabling a self-improving flywheel.

## Background

Hyperagents (arxiv:2603.19461, Meta AI) demonstrated that persistent archives of past agent variants and performance data enable cumulative improvement across runs. This module adapts that concept: genba-neko records knowledge during work, shigoto-neko performs quality control, and oyakata-neko applies accumulated knowledge at session start.

Unlike Reflexion (failure-only), Auto-Lessons captures knowledge from **both success and failure**.

## Classification (aligned with Contextual Commits)

| Type | What to record | When |
|------|---------------|------|
| **learned** | API traps, undocumented behavior, non-obvious specs | Discovered a fact that isn't in docs |
| **constraint** | Hard limits constraining implementation (API limits, browser compat, etc.) | Found a wall that blocks certain approaches |
| **rejected** | Approaches tried and abandoned (**reason required**) | Chose not to use an approach |

## Write Target

- **Path**: `memory/lessons/{topic}.md` (e.g., `api.md`, `browser.md`, `testing.md`)
- **Existing file**: Append to it
- **No existing file**: Create new file with topic as filename

## Format

```
- [PJ-name] [tag] Knowledge content — Specific action guideline (YYYY-MM-DD)
```

Example:
```
- [x-auto-bot] [learned] Twitter API v2 rate limit is 15 req/15min per app token — Use user token for higher limits (2026-03-28)
- [jp-dashboard] [constraint] Vite dev server HMR fails with symlinked node_modules — Use --preserve-symlinks flag (2026-03-28)
- [mcp-yoshi] [rejected] zod validation for MCP responses — Too heavy for real-time filtering, use regex pattern matching instead (2026-03-28)
```

## Trajectory Analysis (ERL, 2026-03-28追加, arxiv:2603.24639)

Auto-Lessons captures knowledge not only when discoveries occur during work, but also through **mandatory post-task trajectory analysis**. After every task completion (not just failures), analyze the task trajectory to extract transferable heuristics.

### When to analyze
- **Current (step 9.5)**: Record as discoveries happen during work — unchanged
- **New (completion report)**: Before submitting completion report, review the full task trajectory and extract any additional lessons not captured during work

### Analysis questions
1. What approach worked that wasn't obvious beforehand? → `learned`
2. What constraint did I discover that would affect similar tasks? → `constraint`
3. What alternative did I consider and reject? → `rejected` (reason required)

## Write Scoring (AgeMem, 2026-03-28追加, arxiv:2601.01885)

Before writing a lesson, score it on 3 criteria. Write only if 2+ criteria are YES:

| Criterion | Question | YES example | NO example |
|-----------|----------|-------------|------------|
| **Novelty** | Is this different from existing lessons on the same topic? | New API behavior not in docs | Already recorded in lessons/api.md |
| **Generality** | Can this be reused across multiple sessions/projects? | "Windows path separator breaks glob" | "This specific file had a typo" |
| **Actionability** | Does this change a concrete future action? | "Use --preserve-symlinks flag" | "Vite is complex" |

If fewer than 2 criteria pass, do NOT write to lessons/. Report via SendMessage only.

## Quality Criteria (enforced by shigoto-neko)

1. **Actionable**: Must include a concrete action guideline. "Be careful" is prohibited
2. **No duplicates**: Grep existing lessons before writing. Same knowledge = don't write
3. **Accurate tags**: PJ name and topic tag must match the actual project and domain
4. **Dated**: Include date for temporal context

## Scope Boundary

- **Writable**: `memory/lessons/{topic}.md` only
- **NOT writable**: CLAUDE.md, agent definitions, gates.md, rules/, or any config files
- This module does NOT grant self-modification capabilities beyond lessons files

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| genba-neko | During work (step 9.5) | Record knowledge to `memory/lessons/{topic}.md` when learned/constraint/rejected discoveries occur |
| genba-neko | Post-work (completion report) | Perform trajectory analysis: review full task trajectory, extract additional lessons using Write Scoring |
| shigoto-neko | Completion gate (step 0.5) | Quality check on new lessons entries (duplicates, actionable, tags) |
| oyakata-neko | Start gate (dev-lessons search) | Search accumulated lessons and apply relevant knowledge |
