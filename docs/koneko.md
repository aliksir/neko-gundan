# Koneko Gundan — Neko Gundan Lite

> The same quality principles, sized for PRO-tier token budgets.

## What is Koneko?

Koneko ("kitten") is a lightweight version of Neko Gundan designed for users on Claude Code's PRO plan or below. It gives you the core quality benefits — independent review and evidence-based gates — without the token-heavy multi-agent hierarchy.

## What You Get

| Feature | Included | Notes |
|---------|----------|-------|
| Independent reviewer | Yes | `koneko-neko` — 1 agent call per task |
| Completion gates | Yes | 3 items (simplified) |
| Safety tiers | Yes | Tier 1 prohibited, Tier 2 requires confirmation |
| File deletion safety | Yes | `_deleted/` buffer |
| Implementer != Reviewer | Yes | Core principle preserved |
| Multi-agent hierarchy | No | No oyakata/shigoto/genba |
| Parallel execution | No | No TeamCreate |
| Whiteboard/dashboard | No | Single-agent workflow |
| Modules (shitsuke) | No | No optional modules |

## Install

```bash
bash neko-gundan/scripts/install.sh koneko ./your-project
```

## How It Works

```
You write code
    ↓
Run koneko gate (3 checks with evidence)
    ↓
Spawn koneko-neko to review (1 agent call)
    ↓
Fix if needed → Done
```

No hierarchy, no ceremony. Just: **implement → gate → review → done.**

## Token Budget

| Action | Approximate cost |
|--------|-----------------|
| Koneko gate (self-check) | ~0 (prompt rules only) |
| Koneko-neko review | ~1 agent call |
| Safety rules | ~0 (prompt rules only) |
| **Total per task** | **~1 agent call** |

Compare: full Neko Gundan platoon = 3-5 agent calls per task.

## Upgrading to Full Neko Gundan

When you move to MAX 5+, upgrade by adding more modes:

```bash
# Step 1: Add full review capability
bash install.sh quality ./your-project

# Step 2: Add parallel execution
bash install.sh implement ./your-project

# Step 3: Add strategic planning
bash install.sh plan ./your-project
```

The koneko files won't conflict — they'll just be superseded by the full versions.

## Limitations

- **No parallel agents**: All work is sequential
- **1 review cycle**: Koneko-neko gives feedback once; no back-and-forth loop
- **3-aspect rubric**: Skips maintainability and Purpose alignment checks
- **No modules**: Shitsuke system is not supported

These are intentional trade-offs for token efficiency. If you need them, upgrade to full Neko Gundan.
