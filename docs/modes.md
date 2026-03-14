# Modes — Pick What You Need

Neko Gundan is designed for partial adoption. You don't need the full framework — pick the modes that match what you're trying to solve.

## Available Modes

### koneko — "Same principles, PRO-tier budget"

A lightweight version designed for PRO plan users. Gives you independent review and evidence-based gates with minimal token cost.

**What you get:**
- `koneko-neko` (lightweight reviewer — 1 agent call per task)
- Koneko gates (3-item simplified completion check)
- Safety tiers (Tier 1 prohibited, Tier 2 requires confirmation)
- File deletion safety (`_deleted/` buffer)

**What you don't get:** Multi-agent hierarchy, parallel execution, modules, whiteboard.

**Best for:** PRO-tier users who want quality guardrails without the token cost of full Neko Gundan.

```bash
bash neko-gundan/scripts/install.sh koneko ./your-project
```

[Full guide](koneko.md)

---

### quality — "Stop self-reviewing"

Adds an independent reviewer agent and evidence-based completion gates. The agent who writes the code never reviews it.

**What you get:**
- `kurouto-neko` (reviewer agent with structured rubric)
- Review protocol (implementer != reviewer, max 3 cycles)
- Completion gates (evidence required, not just "I checked")
- Reflexion (structured failure analysis)
- Linter config protection (agents fix code, not lint rules)
- Raw log (full audit trail of every agent action — opt-in)
- PostToolUse auto-lint hook (millisecond feedback on writes)

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
| "Quality on a PRO budget" | `koneko` | Lightweight reviewer + safety rules |
| "Just review my code better" | `quality` | Independent reviewer + evidence gates |
| "Stop deleting things by accident" | `security` | Safety tiers + _deleted/ buffer |
| "I want code review AND safety" | `quality+security` | Both, no team hierarchy |
| "Big refactor across many files" | `implement+quality` | Parallel workers + review |
| "Full project with planning" | `plan+implement+quality` | Strategy + workers + review |
| "Give me everything" | `all` | All 4 modes |

## Downgrading

Switching from MAX to PRO? Downgrade safely:

```bash
bash install.sh --downgrade koneko ./your-project
```

Unneeded files are moved to `_deleted/` (not deleted). Update your CLAUDE.md snippet after.

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

## Updating from Upstream

When neko-gundan releases new versions, use `--update` to check what changed:

```bash
cd neko-gundan && git pull
bash scripts/install.sh --update all ./your-project
```

For each file with upstream changes, you'll see a diff and choose:
- **y** — Overwrite with the new version
- **n** — Keep your local version
- **d** — See the full diff before deciding

Files you haven't customized show "up to date" and need no action.

## Where Modes Fit — The Full Picture

Neko Gundan has 4 independent systems. Modes is one of them:

| Question | System | When | Example |
|----------|--------|------|---------|
| **What to install?** | **Modes** (this page) | `install.sh` | `quality+security` |
| **How heavy the process?** | [Process Weight](process-weight.md) | Per task | "light mode" / "strict" |
| **Which modules ON/OFF?** | [Shitsuke](shitsuke-guide.md) | `config.yaml` | `heartbeat: false` |
| **What's always enforced?** | Safety | Always | Deletion safety, race prevention |

**Modes vs Shitsuke:**
- Modes = which files exist in `.claude/` (coarse, at install time)
- Shitsuke = which features are active (fine, anytime after install)

**Example workflow:**
1. Install `implement` mode → gets shigoto-neko, genba-neko, heartbeat, race-prevention, etc.
2. Later, disable heartbeat via shitsuke → file stays, but agents skip the protocol
3. Even later, add `quality` mode → kurouto-neko and review protocols are added

You don't need shitsuke to get started. Modes alone give you a working setup.
