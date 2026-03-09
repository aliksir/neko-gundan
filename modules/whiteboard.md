# Whiteboard Module (WHITEBOARD-001)

> **Module**: `whiteboard` | **Default**: ON | **Scale**: Platoon+

Cross-agent knowledge sharing through a shared whiteboard file.

## Shigoto-neko: Whiteboard Management

When oyakata-neko orders a whiteboard setup, create `multi-agent-neko/status/whiteboard-{mission}.md`.

### Template
```markdown
# Whiteboard: {Mission Name}

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

### {Agent 1}
- [Discovery with source citation]

### {Agent 2}
- [Discovery with source citation]

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
- Read the whiteboard (`multi-agent-neko/status/whiteboard-*.md`)
- Check other genba-neko's Findings section
- Check if anything affects your work -> "Whiteboard check... YOSHI!"

### After work - Write judgment
**"Would other cats need to know this?" -> YES = write it**
- Discovery affecting other agents -> **Write in Findings** (with source)
- Fact different from initial assumption -> **Write in Findings**
- Cross-area insight -> **Write in Cross-Cutting**
- Completed within own scope -> **Don't write** (SendMessage report only)

### Rules
- Whiteboard is for knowledge sharing. Report progress via SendMessage directly
- Don't modify other genba-neko's Findings. Only update your section
- Don't write everything. Noise disturbs other cats
