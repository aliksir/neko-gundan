---
description: "Launch the Neko Gundan multi-agent cat team for complex tasks with auto-scaling, quality gates, and review protocols"
---

# Neko Gundan Deployment

Launch the Neko Gundan multi-agent system for the given task.

## Auto-Scaling

Assess the task scale and deploy the appropriate formation:

| Scale | Criteria | Formation |
|-------|----------|-----------|
| Recon | Questions, research, single file check | Oyakata-neko handles directly |
| Squad | 1-2 file changes | Single shigoto-neko |
| Platoon | 3-5 file changes or multiple tasks | TeamCreate: shigoto-neko + 1-2 genba-neko |
| Battalion | 6+ files or large-scale work | TeamCreate: shigoto-neko + 3 genba-neko |

## Model Assignment

- Oyakata-neko (strategy): Opus
- QA / kurouto-neko (review): Opus
- Shigoto-neko (management): Sonnet
- Genba-neko (implementation): Sonnet

## Deployment Steps

1. Assess task scale using the table above
2. Create team with TeamCreate
3. Assign oyakata-neko as the team lead
4. Oyakata-neko decomposes and delegates to shigoto-neko
5. Shigoto-neko manages genba-neko for implementation
6. Kurouto-neko performs independent QA review (platoon+)
7. Report results back to the commander (human)

## Whiteboard

For platoon+ missions where agent discoveries affect each other, shigoto-neko sets up a whiteboard for cross-agent knowledge sharing.

## Phase Routing

The first keyword in `$ARGUMENTS` selects a phase. No keyword = full flow.

| Keyword | Phase | What it does |
|---------|-------|-------------|
| `design` | Design | Plan + design documents. No implementation |
| `implement` | Implement | Read plan + design, implement only |
| `review` | Review | Review plan/code. No modifications |
| `test` | Test | Test planning + execution + quality check |
| (none) | Full flow | All phases end-to-end |

### Required Files per Phase

Before executing, check for required input files. **If missing, show a clear error:**

```
❌ Required file not found: plans/*_{project}.md (plan document)
   Create it with: /neko-gundan design "your task description"
   Or manually create: plans/YYYYMMDD_{project}.md
```

| Phase | Required Input | If Missing |
|-------|---------------|------------|
| `design` | — | (no prerequisites) |
| `implement` | `plans/*_{project}.md` | Error: "Run `/neko-gundan design` first or create a plan manually" |
| `implement` | `designs/*_{project}.md` | Auto-create with "No design target: implement-only execution" |
| `review` | Plan and/or source code | Error: "Specify plan path or project/branch to review" |
| `test` | Source code in target dir | Error: "No source code found in {target}" |

Phase-specific gates: see `rules/completion-gates.md` "Phase-Specific Gates" section.

## Quality Gates

Every task must pass completion gates before being declared done. See the rules/completion-gates.md for details.
