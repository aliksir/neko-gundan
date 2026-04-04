# Neko Gundan - Multi-Agent Orchestration for Claude Code

> **New here?** Install the skill, then run `/welcome-neko` in Claude Code — interactive setup, no manual config needed!
> ```bash
> git clone https://github.com/aliksir/neko-gundan.git
> cp -r neko-gundan/skills/welcome-neko ~/.claude/skills/
> # Then in Claude Code, type: /welcome-neko
> ```

**[日本語版 README はこちら](README.ja.md)** | **On PRO plan? → [Koneko Gundan (Lite version)](README.koneko.md)**

> One Claude Code agent can write code. But it can't catch its own mistakes, stop bad decisions, or coordinate across files safely. Neko Gundan splits the work into a team — so the agent that writes the code is never the one that reviews it.

## Who This Is For

**Good fit:**
- You've had an agent delete the wrong file, break working code, or ship something "it checked itself"
- You're working on a product where quality accidents cost real time — not a throwaway prototype
- You want a second pair of eyes on AI-generated code, but don't want to review every line yourself
- You're coordinating multi-file changes and need agents that don't step on each other

**Not a good fit:**
- You're prototyping or doing quick experiments where speed matters more than correctness
- You want a library of 100+ specialized agents — try [VoltAgent](https://github.com/VoltAgent/core) or [wshobson/agents](https://github.com/wshobson/agents) instead
- A single `quality` or `security` mode feels like too much — standard Claude Code subagents may be all you need

Neko Gundan is not a universal tool. It's opinionated about one thing: **proving that work is correct, not just done.**

## Quick Pick — "Just Tell Me What to Install"

| Your situation | Recommended install | Why |
|----------------|-------------------|-----|
| Solo dev, want a safety net | `security` | Zero agents. Just rules that prevent accidental deletion and unsafe operations |
| Small product, quality matters | `quality+security` | 1 reviewer agent + safety rules. Best cost/benefit starting point |
| Multi-file features, team-scale changes | `all` | Full team structure. Standard weight for most tasks, strict for releases |

Start light, add more later. You can always run `install.sh` again with additional modes.

## Quick Start

```bash
git clone https://github.com/aliksir/neko-gundan.git

# Pick what you need
bash neko-gundan/scripts/install.sh quality+security ./your-project

# Or install everything
bash neko-gundan/scripts/install.sh all ./your-project
bash neko-gundan/scripts/setup.sh  # Initialize runtime directories
```

The installer copies only the files you need and shows the CLAUDE.md snippet to add. For updates, hooks setup, and session-start auto-check, see [Update Guide](docs/update-guide.md) and [Hooks Guide](docs/hooks-guide.md).

> **Don't want the full framework?** Start with just `security` (no agents, just safety rules) or `quality` (just a reviewer). [See all modes](docs/modes.md).

## What You Do (3 Steps)

1. **Install** — Pick modes and run the installer. Done in 30 seconds.
2. **Give tasks** — Tell the agent what to do in plain language. Add "light mode" or "strict" to control thoroughness.
3. **Review the proof** — The agent delivers evidence (test results, diffs), not just "I'm done." You check the proof, not the code.

Everything else — role assignment, review separation, objection handling, safety checks — happens behind the scenes.

## How It Works

```
Commander (Human)
    |
Oyakata-neko (General / Opus) --- Strategy & delegation
    |
Shigoto-neko (Manager / Sonnet) --- Task decomposition & QA
    |
Genba-neko (Worker / Sonnet) --- Implementation
    |
Kurouto-neko (Specialist / Opus) --- Independent review
```

The team auto-scales based on task size:

| Scale | Criteria | Formation |
|-------|----------|-----------|
| Recon | Questions, research | Oyakata handles directly |
| Squad | 1-2 file changes | Single shigoto-neko |
| Platoon | 3-5 files AND design decisions | shigoto + 1-2 genba-neko |
| Battalion | 6+ files | shigoto + 3 genba-neko |

## Key Features

### Mandatory Design Phase

Every task follows: **Plan → Design → Design Review → Implement → Quality Check**. Design review is required at all scales (not just platoon+) — it catches config mismatches and architectural issues early. Design documents (`designs/`) are required — `commit-guard` hook blocks commits without them. Artifacts are completed at their phase boundary, not backfilled before commit.

### Phase-Based Independent Execution

```bash
/neko-gundan design "Add user auth"       # Design only
/neko-gundan implement "plans/auth.md"     # Implement only
/neko-gundan review "feature/auth branch"  # Review only
/neko-gundan test "src/auth/"              # Test only
/neko-gundan "Add user auth"              # Full flow (default)
```

Each phase has its own lightweight gates. See [WORKFLOW.md](docs/WORKFLOW.md#phase-based-independent-execution) for details.

### Implementer != Reviewer

1. The agent who wrote the code **never** reviews it
2. Reviewers are **read-only** — feedback only, no code changes
3. After 3 review cycles, an arbitrator (Opus) makes the final call

### Agents That Push Back

Agents have an **obligation** to object to bad instructions. Each objection requires **Facts + Concerns + Alternative Proposal**.

- **OBJECTION-001** (worker → manager): "This instruction will break things"
- **OBJECTION-002** (manager → general): "This strategy contradicts our goal"
- **OBJECTION-003** (reviewer → manager): "This design has a flaw"

### Evidence-Based Quality Gates

"I confirmed it" is not allowed — only "here's the proof." Every task must pass a gate with recorded evidence.

### Safety Built In

- **File deletion safety**: Files go to `_deleted/` first, never instant-deleted
- **Race condition prevention**: No two agents edit the same file simultaneously
- **Trust levels (FIDES)**: External data is explicitly tagged as LOW trust
- **Destructive operation tiers**: Tier 1 is absolutely prohibited, Tier 2 requires confirmation
- **Cascade failure prevention (CASCADE-001)**: Task dependencies declared with `←` notation on whiteboard. Upstream failure automatically blocks downstream tasks
- **Fan-Out/Aggregate (FANOUT-001)**: Parallel agent results integrated through structured 3-phase process (Fan-Out → Collect → Aggregate) with contradiction/duplicate detection

### Observability

| Feature | What it shows | Details |
|---------|--------------|---------|
| **Checklist export** | Gate results with evidence | [Shitsuke Guide](docs/shitsuke-guide.md) |
| **Quality metrics** | Gate pass rate, skip rate, review cycle trends | [Shitsuke Guide](docs/shitsuke-guide.md) |
| **Raw log** | Full Edit/Bash/decision audit trail | [Shitsuke Guide](docs/shitsuke-guide.md) |
| **Audit trail** | Traceability, approval log, change management | [Shitsuke Guide](docs/shitsuke-guide.md) |

### Modes and Process Weight

| When to decide | System | What it controls | Example |
|----------------|--------|-----------------|---------|
| **At install time** | [Modes](docs/modes.md) | What's in your `.claude/` | `quality+security` |
| **Per task** | [Process Weight](docs/process-weight.md) | How thorough the process is | "light mode" / "strict" |
| **Per task** | [Autopilot](modules/autopilot.md) | Hands-off after plan approval | Plan approved → auto-run to completion |
| **As policy** | [Shitsuke](docs/shitsuke-guide.md) | Which features are active | `heartbeat: false` |
| **Never changes** | Safety | The floor that never drops | `_deleted/`, race prevention |

## Design Philosophy

Every protocol exists because something went wrong without it.

| Incident | Protocol |
|----------|----------|
| Agent couldn't catch its own mistakes | Independent reviewer requirement |
| Bad instruction cascaded unchallenged | Bidirectional objection protocols |
| "I checked" with no proof | Evidence-based completion gates |
| Accidental file deletion | `_deleted/` safety buffer |
| Agent lost context mid-task | Whiteboard knowledge sharing |
| Upstream failure wasted downstream work | Cascade failure auto-blocking (CASCADE-001) |
| Parallel results merged without structure | Fan-Out/Aggregate 3-phase integration (FANOUT-001) |

[Case studies](docs/case-studies.md) show how these work in practice.

## Trade-offs

**You are still the boss.** The reviewer and implementer share the same model family, so they can share blind spots. Think of it as "better first draft" — not "no review needed."

| You spend more on | You spend less on |
|---|---|
| Tokens (2-3x at platoon scale) | Debugging agent-introduced bugs |
| Initial response time | Recovering from accidental file deletion |
| `.claude/` prompt complexity | Re-reviewing "completed" work that wasn't verified |

Safety rules (`security` mode) cost almost nothing — prompt rules, no extra agent calls. [Comparison with other tools](docs/comparison.md).

## Documentation

| Guide | Content |
|-------|---------|
| [Modes Guide](docs/modes.md) | Pick what you need, combine freely |
| [Process Weight](docs/process-weight.md) | Light / Standard / Strict |
| [Workflow](docs/WORKFLOW.md) | Phase-based independent execution details |
| [Shitsuke Guide](docs/shitsuke-guide.md) | Module system configuration |
| [Hooks Guide](docs/hooks-guide.md) | Gate Guard / Commit Guard setup |
| [Update Guide](docs/update-guide.md) | Diff updates, auto-check |
| [Architecture](docs/architecture.md) | System design and agent interactions |
| [Protocols](docs/protocols.md) | All protocol definitions |
| [Harness Engineering](docs/harness-engineering.md) | Design principles and anti-pattern defense |
| [Auto Mode](docs/auto-mode.md) | Claude Code auto permission mode |
| [Comparison](docs/comparison.md) | vs Subagents / LangGraph / CrewAI |
| [Case Studies](docs/case-studies.md) | Real project examples |
| [Example CLAUDE.md](examples/CLAUDE.md.example) | Full configuration example |
| [YAML Definitions](yaml/) | Machine-readable YAML versions of all agents, rules, modules, and gates |

## Contributing

1. Follow the existing agent definition style
2. Include protocol IDs for new protocols (e.g., `NEWPROTOCOL-001`)
3. Add examples for new features
4. Test with actual Claude Code sessions before submitting

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built for [Claude Code](https://github.com/anthropics/claude-code) by Anthropic
- The foundational idea — multi-agent orchestration with Claude Code — came from [this article by おしお](https://zenn.dev/shio_shoppaize/articles/5fee11d03a11a1)
- Inspired by the [Shigoto-neko / Genba-neko](https://dic.nicovideo.jp/a/%E4%BB%95%E4%BA%8B%E7%8C%AB) internet meme characters
- Review protocol inspired by [takt](https://www.npmjs.com/package/takt) orchestration tool
- Reflexion pattern from [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366)
