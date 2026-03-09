# Modes — Pick What You Need

Neko Gundan is designed for partial adoption. You don't need the full framework — pick the modes that match what you're trying to solve.

## Available Modes

### quality — "Stop self-reviewing"

Adds an independent reviewer agent and evidence-based completion gates. The agent who writes the code never reviews it.

**What you get:**
- `kurouto-neko` (reviewer agent with structured rubric)
- Review protocol (implementer != reviewer, max 3 cycles)
- Completion gates (evidence required, not just "I checked")
- Reflexion (structured failure analysis)

**Best for:** Solo developers who want a second pair of eyes, teams tired of rubber-stamp reviews.

```bash
bash neko-gundan/scripts/install.sh quality ./your-project
```

---

### implement — "Coordinate parallel work"

Adds manager and worker agents for splitting tasks across multiple agents safely.

**What you get:**
- `shigoto-neko` (manager: task decomposition, progress monitoring)
- `genba-neko` (worker: implementation with stuck detection)
- Race condition prevention (no two agents edit the same file)
- Heartbeat protocol (stuck detection and escalation)

**Best for:** Large changes touching many files, tasks that benefit from parallelization.

```bash
bash neko-gundan/scripts/install.sh implement ./your-project
```

---

### plan — "Think before coding"

Adds strategic planning, task decomposition, and cross-agent knowledge sharing.

**What you get:**
- `oyakata-neko` (general: strategy, delegation, arbitration)
- Whiteboard system (shared discoveries across agents)
- Intent State Vector (track why decisions were made)
- Spec-driven review (verify alignment with requirements)

**Best for:** Complex features requiring upfront design, multi-phase projects.

```bash
bash neko-gundan/scripts/install.sh plan ./your-project
```

---

### security — "Prevent accidents"

Adds safety rules and trust levels. No agents required — works with rules alone.

**What you get:**
- Safety tiers (Tier 1 prohibited, Tier 2 requires confirmation)
- `_deleted/` file safety buffer (no instant deletion)
- FIDES trust levels (external data tagged as LOW)
- Race condition prevention

**Best for:** Anyone who's had an agent delete the wrong file or run a destructive command.

```bash
bash neko-gundan/scripts/install.sh security ./your-project
```

---

## Combining Modes

Modes are independent and composable. Use `+` to combine:

```bash
# Review quality + accident prevention (no team hierarchy needed)
bash install.sh quality+security ./your-project

# Full team with planning and implementation
bash install.sh plan+implement ./your-project

# Everything (equivalent to traditional full install)
bash install.sh all ./your-project
```

## Common Combinations

| Goal | Modes | What it gives you |
|------|-------|-------------------|
| "Just review my code better" | `quality` | Independent reviewer + evidence gates |
| "Stop deleting things by accident" | `security` | Safety tiers + _deleted/ buffer |
| "I want code review AND safety" | `quality+security` | Both, no team hierarchy |
| "Big refactor across many files" | `implement+quality` | Parallel workers + review |
| "Full project with planning" | `plan+implement+quality` | Strategy + workers + review |
| "Give me everything" | `all` | All 4 modes |

## Upgrading Later

Start small and add modes as needed. The installer skips files that already exist, so you can safely run it again with additional modes:

```bash
# Start with just quality
bash install.sh quality ./your-project

# Later, add implementation support
bash install.sh implement ./your-project

# Even later, add planning
bash install.sh plan ./your-project
```

## Relationship to Shitsuke (Module System)

Modes control **which files are installed**. Shitsuke controls **which features are active** within those files.

- Modes = what's in your `.claude/` directory
- Shitsuke = fine-tuning within `neko-gundan.config.yaml`

If you install `implement` mode, you can still use shitsuke to toggle heartbeat monitoring on/off without removing the file.
