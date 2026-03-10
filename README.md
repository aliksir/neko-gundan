# Neko Gundan - Multi-Agent Orchestration for Claude Code

**[日本語版 README はこちら](README.ja.md)**

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

## Quick Start

```bash
git clone https://github.com/aliksir/neko-gundan.git

# Pick what you need (modes: quality, implement, plan, security)
bash neko-gundan/scripts/install.sh quality+security ./your-project

# Or install everything
bash neko-gundan/scripts/install.sh all ./your-project
```

The installer copies only the files you need and shows the CLAUDE.md snippet to add.

> **Don't want the full framework?** Start with just `security` (no agents, just safety rules) or `quality` (just a reviewer). [See all modes](docs/modes.md).

### Full Install (all modes)

```bash
bash neko-gundan/scripts/install.sh all ./your-project
bash neko-gundan/scripts/setup.sh  # Initialize runtime directories
```

### Updating

Already installed? Pull the latest neko-gundan and check what changed:

```bash
cd neko-gundan && git pull
bash scripts/install.sh --update all ./your-project
```

The updater shows a diff for each changed file and lets you choose per file — overwrite, keep yours, or see the full diff first. Files you haven't customized update silently.

## What You Do (3 Steps)

All the protocols, modules, and safety rules run automatically. You only do three things:

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
| Platoon | 3-5 files / multiple tasks | shigoto + 1-2 genba-neko |
| Battalion | 6+ files / large-scale | shigoto + 3 genba-neko |

## Key Features

### Agents That Push Back

Agents have an **obligation** to object to bad instructions — not just follow them.

- **OBJECTION-001** (worker -> manager): "This instruction will break things"
- **OBJECTION-002** (manager -> general): "This strategy contradicts our goal"

Each objection requires: **Facts + Concerns + Alternative Proposal**

### Evidence-Based Quality Gates

Every task must pass a gate with recorded evidence. "I confirmed it" is not allowed — only "here's the proof."

```
| # | Item              | Status | Evidence                              |
|---|-------------------|--------|---------------------------------------|
| 1 | Tests pass        | PASS   | `npm test`: 42 passed, 0 failed       |
| 2 | No unintended diff| PASS   | `git diff` shows only target files    |
| 3 | Objections resolved| PASS  | No [OBJECTION] tags on whiteboard     |
```

### Checklist Export — Visible Proof

Completion gate checklists can be exported to markdown files for human review and record keeping.

```
_checklist/
  20260310_my-project.md   ← gate results with evidence
```

Enable `checklist_export` in your config (ON by default in `recommended` and `full` presets) and set the output path in CLAUDE.md:

```yaml
checklist_output_dir: "./_checklist/"
```

Each file records what was checked, the result, and the evidence — so you can review quality decisions after the session ends.

### Quality Metrics — Are Your Gates Working?

AI-generated code grows faster than human review capacity. Without visibility into quality trends, gates become theater. This module tracks whether your quality process is actually working.

```markdown
| Metric              | Value | Trend | What it means                                       |
|---------------------|-------|-------|-----------------------------------------------------|
| Gate pass rate      | 87%   | →     | Completion gate PASS ratio. Low = quality gaps       |
| Skip rate           | 23%   | ↑ ⚠️  | N/A skip ratio. High = gates becoming theater        |
| Avg review cycles   | 1.3   | ↓     | Review rounds per task. All 1 = reviews may be lenient |
```

When agents run the completion gate, they calculate these metrics and flag alerts if thresholds are exceeded — skip rate climbing, all reviews passing first try, zero human interventions for too long.

Enable `quality_metrics` in your config (ON in `full` preset) and set the output path in CLAUDE.md:

```yaml
metrics_output_dir: "./_metrics/"
```

### Implementer != Reviewer

The 3 review principles that prevent self-approval:

1. The agent who wrote the code **never** reviews it
2. Reviewers are **read-only** — feedback only, no code changes
3. After 3 review cycles, an arbitrator (Opus) makes the final call

### Safety Built In

- **File deletion safety**: Files go to `_deleted/` first, never instant-deleted
- **Race condition prevention**: No two agents edit the same file simultaneously
- **Trust levels (FIDES)**: External data is explicitly tagged as LOW trust
- **Destructive operation tiers**: Tier 1 is absolutely prohibited, Tier 2 requires confirmation

### Pick What You Need (Modes)

Install only the parts that solve your problem:

| Mode | What it solves | Agents needed? |
|------|---------------|----------------|
| **quality** | Self-review, unverified "done" | 1 (reviewer) |
| **implement** | Large multi-file changes | 2 (manager + worker) |
| **plan** | Complex task decomposition | 1 (general) |
| **security** | Accidental deletion, unsafe operations | None (rules only) |

Combine freely: `quality+security`, `plan+implement`, or `all`. [Full guide](docs/modes.md).

### Decision Map — When You Decide What

| When to decide | System | What it controls | Example |
|----------------|--------|-----------------|---------|
| **At install time** | [Modes](docs/modes.md) | What's in your `.claude/` | `quality+security` |
| **Per task** | [Process Weight](docs/process-weight.md) | How thorough the process is | "light mode" / "strict" |
| **As policy** | [Shitsuke](docs/shitsuke-guide.md) | Which features are active | `heartbeat: false` |
| **Never changes** | Safety | The floor that never drops | `_deleted/`, race prevention |

<details>
<summary>Process Weight — Light to Strict</summary>

Not every task needs the full process. Say "light mode" for quick fixes, or "strict" for releases:

```
"Fix this typo, light mode"  →  Quick gate only (test + diff + commit)
"Add auth feature"           →  Standard (full gates, review, objections)
"Deploy prep, strict"        →  Maximum verification (ensemble, ISV, arbitrator)
```

Agents can **escalate** if they judge a "light" task is actually risky:
```
ESCALATION-001: Process weight upgrade request
Current: Light → Proposed: Standard
Reason: "This touches 4 files including DB migration"
```

Safety protocols (race prevention, deletion safety) are **never reduced** — light mode makes the process lighter, not less safe.

</details>

<details>
<summary>Comparison: vs Standard Subagents / vs LangGraph & CrewAI</summary>

#### Why Not Just Standard Subagents?

Claude Code's built-in subagents are powerful. Neko Gundan adds **operational guardrails** on top:

| | Standard Subagents | Neko Gundan |
|---|---|---|
| Self-review | Agent can review its own code | **Implementer ≠ Reviewer enforced** |
| Quality proof | "I checked" is accepted | **Evidence required** (test output, git diff) |
| Bad instructions | Silently executed | **Agents must object** (OBJECTION protocol) |
| File deletion | Instant, irreversible | **Moved to `_deleted/` first** |
| Parallel editing | No coordination | **Race condition prevention** |

If standard subagents already work for you, great. Neko Gundan is for when you need **proof that things are correct**, not just that they're done.

#### Why Not LangGraph / CrewAI?

Those are code-based orchestration frameworks — you write Python to define agent workflows. Neko Gundan takes a different approach: **rules, not code**.

| | Code-based Frameworks | Neko Gundan |
|---|---|---|
| How it works | Python code defines agent graphs | Prompt rules define agent behavior |
| Integration | Separate system alongside your app | Lives inside Claude Code's config (`.claude/`) |
| Setup | Install packages, write orchestration code | Copy files, add a snippet to CLAUDE.md |
| Partial adoption | All or nothing | Pick one mode and add more later |
| Customization | Modify Python code | Edit markdown files |

Neko Gundan injects a "constitution" into Claude Code — operational rules that agents follow. No new runtime, no new dependencies. Your existing Claude Code setup gains a team structure.

</details>

## Design Philosophy

This framework wasn't designed in theory. It evolved from actual incidents — agents deleting production files, making unchecked bad decisions, breaking working features. Every protocol exists because something went wrong without it.

| Incident | Protocol |
|----------|----------|
| Agent couldn't catch its own mistakes | Independent reviewer requirement |
| Bad instruction cascaded unchallenged | Bidirectional objection protocols |
| "I checked" with no proof | Evidence-based completion gates |
| Accidental file deletion | `_deleted/` safety buffer |
| Agent lost context mid-task | Whiteboard knowledge sharing |

## Trade-offs

**You are still the boss.** Neko Gundan adds AI-to-AI review, but it does not replace human judgment. The reviewer agent and the implementer agent share the same model family, so they can share the same blind spots. Evidence gates (`npm test`, `git diff`) catch mechanical errors, but architectural decisions and business logic still need a human's final call. Think of it as "better first draft" — not "no review needed."

**More agents = more tokens.** Multi-agent orchestration costs more than a single agent. A platoon-scale task (3 agents) uses roughly 2-3x the tokens of doing it solo. Use [Process Weight](docs/process-weight.md) to keep costs in check — say "light mode" for quick fixes so you skip the full ceremony. The safety rules (deletion buffer, race prevention) add almost zero overhead since they're just prompt rules, not extra agent calls.

## Documentation

- [Modes Guide](docs/modes.md) — Pick what you need, combine freely
- [Process Weight](docs/process-weight.md) — Light / Standard / Strict process levels
- [Architecture](docs/architecture.md) — System design and agent interactions
- [Protocols Reference](docs/protocols.md) — All protocol definitions
- [Shitsuke Guide](docs/shitsuke-guide.md) — Module system configuration
- [Harness Engineering](docs/harness-engineering.md) — Design principles and anti-pattern defense
- [Auto Mode Guide](docs/auto-mode.md) — Using Neko Gundan with Claude Code's auto permission mode
- [Example CLAUDE.md](examples/CLAUDE.md.example) — Full configuration example

## Contributing

Contributions are welcome! Please:

1. Follow the existing agent definition style
2. Include protocol IDs for new protocols (e.g., `NEWPROTOCOL-001`)
3. Add examples for new features
4. Test with actual Claude Code sessions before submitting

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built for [Claude Code](https://github.com/anthropics/claude-code) by Anthropic
- Inspired by the [Shigoto-neko / Genba-neko](https://dic.nicovideo.jp/a/%E4%BB%95%E4%BA%8B%E7%8C%AB) internet meme characters
- Review protocol inspired by [takt](https://www.npmjs.com/package/takt) orchestration tool
- Reflexion pattern from [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366)
