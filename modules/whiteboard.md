# Whiteboard Module (WHITEBOARD-001)

> **Module**: `whiteboard` | **Default**: ON | **Scale**: All

Cross-agent knowledge sharing and context persistence through a shared whiteboard file.

## Shigoto-neko: Whiteboard Management

For all missions, create `{WHITEBOARD_DIR}/whiteboard-{mission}.md` as part of the pre-dispatch hard gate (mandatory — no skip). If a whiteboard with the same project name already exists, reuse it instead of creating a new one.

`WHITEBOARD_DIR` defaults to `whiteboard/` (project root relative). Override in CLAUDE.md or environment config if your setup uses a different path (e.g., a directory monitored by a markdown preview tool).

### Template
```markdown
# Whiteboard: {Mission Name}

**作成日時**: YYYY-MM-DD HH:MM
**更新日時**: YYYY-MM-DD HH:MM

> **SSOT Rule**: The whiteboard is the single source of truth for *execution state* (who does what, current progress, findings). The plan document (`plans/`) is the source of truth for *decisions and rationale* (why this approach, what's in/out of scope). When both contain the same information (e.g., file ownership table), the whiteboard takes precedence during execution.

## Goal
[What to achieve in this mission]

## Team Structure
| Role | Task | Area |
|------|------|------|

## How Work Connects
[How each agent's work affects others]

## Key Questions
- [ ] [Unresolved questions spanning multiple areas]

## Findings

### Shigoto-neko — Decomposition Rationale
1. **Purpose**: [Why is this task needed?]
2. **Decomposition**: [Why this split? Alternatives considered?]
3. **Headcount**: [Why this many genba-neko?]
4. **Perspective**: [Other approaches considered?]
5. **Risk**: [What could fail?]

### {Agent 1}
- [Discovery with source citation]

### {Agent 2}
- [Discovery with source citation]

## タスク依存グラフ (CASCADE-001)

依存関係を `←` で記述。詳細は `modules/cascade-failure.md` 参照。

```
genba-1: {タスク名}
genba-2: {タスク名} ← genba-1
genba-3: {タスク名} ← genba-1
genba-4: {タスク名} ← genba-2, genba-3
```

| Task | Agent | Status | Depends On | Note |
|------|-------|--------|-----------|------|
| {タスク名} | genba-1 | ⏳ PENDING | — | |
| {タスク名} | genba-2 | ⏳ PENDING | genba-1 | |

## Cross-Cutting Observations
[Insights spanning multiple areas]

## Decisions
[Decisions made through whiteboard discussion]
```

### Writing Rule: "Would other cats need to know this?" -> YES = write it

| Condition | Write | Don't write |
|-----------|-------|-------------|
| Discovery affecting other agents | Findings | - |
| Fact different from initial assumption | Findings | - |
| Info that might change design decisions | Findings | - |
| Cross-area insight | Cross-Cutting | - |
| Implementation detail within own scope | - | SendMessage only |

## Genba-neko: Whiteboard Usage

### Before work
- Read the whiteboard (`{WHITEBOARD_DIR}/whiteboard-*.md`)
- Check other genba-neko's Findings section
- Check if anything affects your work -> "Whiteboard check... YOSHI!"

### After work - Write judgment
**"Would other cats need to know this?" -> YES = write it**
- Discovery affecting other agents -> **Write in Findings** (with source)
- Fact different from initial assumption -> **Write in Findings**
- Cross-area insight -> **Write in Cross-Cutting**
- Completed within own scope -> **Don't write** (SendMessage report only)

### Knowledge Block Promotion (Focus Agent, 2026-03-28追加, arxiv:2601.07190)

When context compression may occur (long sessions, large codebases), critical information risks being lost. Promote important findings to **knowledge blocks** — compressed, self-contained summaries that survive context compression.

#### When to promote
At each work checkpoint (not just at the end), ask: "If context is compressed right now, would this information be lost?"

#### Knowledge block format
```markdown
## KB: {Topic} (promoted {timestamp})
- **Decision**: [What was decided and why]
- **Constraint**: [Hard limit discovered]
- **State**: [Current state that next agent must know]
```

#### Promotion criteria
| Question | If YES → |
|----------|----------|
| Would losing this change the next agent's approach? | Promote to KB |
| Is this a decision that can't be re-derived from code? | Promote to KB |
| Is this a constraint not documented anywhere else? | Promote to KB |

Knowledge blocks go in the **Findings** section of the whiteboard, prefixed with `## KB:` for easy identification. They are never deleted during the mission — only archived at mission completion.

### Selective Sharing Criteria (arXiv:2602.05965)

Not all findings are worth sharing. Excessive whiteboard writes create noise that hurts other agents' performance. Apply these filters before writing:

| Filter | Question | If YES → | If NO → |
|--------|----------|----------|---------|
| **Cross-impact** | Does this affect another agent's assigned files or approach? | Write | Skip |
| **Assumption change** | Does this contradict an assumption stated in the plan? | Write | Skip |
| **Blocker potential** | Could this block another agent if they don't know about it? | Write | Skip |
| **Novel information** | Is this something not already derivable from the codebase? | Write | Skip |

**Rule of thumb**: If fewer than 2 filters pass, don't write to the whiteboard. Report via SendMessage only.

### Anti-Patterns (Don't Write These)
- Implementation details within your own scope ("I chose to use a for loop")
- Progress updates ("50% done") — use SendMessage instead
- Information already in git history or existing files
- Speculative concerns without evidence

### Rules
- Whiteboard is for knowledge sharing. Report progress via SendMessage directly
- Don't modify other genba-neko's Findings. Only update your section
- Don't write everything. Noise disturbs other cats

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | Pre-dispatch gate | Create whiteboard, fill team structure (mandatory, no skip) |
| genba-neko | Pre-work (step 3) | Read whiteboard (mandatory for platoon+, check if exists for squad) |
| genba-neko | During work (checkpoints) | Promote critical findings to Knowledge Blocks when context compression risk exists |
| genba-neko | Post-work (step 9) | Write findings that affect other agents |
