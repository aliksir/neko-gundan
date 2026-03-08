# Neko Gundan - Multi-Agent Orchestration for Claude Code

A hierarchical multi-agent framework for [Claude Code](https://github.com/anthropics/claude-code) that brings structured team management, quality gates, and bidirectional feedback to AI-powered software development.

## What is Neko Gundan?

Neko Gundan ("Cat Squad") organizes Claude Code agents into a team with clear roles, communication protocols, and quality assurance — turning a single AI assistant into a coordinated development team.

Instead of one agent doing everything, Neko Gundan creates a hierarchy:

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

## Why?

When AI agents work on complex tasks alone, they often:
- Lose context in long sessions
- Make mistakes without catching them
- Delete files or break features without realizing
- Can't verify their own work objectively

Neko Gundan solves this with:
- **Separation of concerns** - Strategy, implementation, and review by different agents
- **Quality gates** - Mandatory checkpoints with evidence before declaring "done"
- **Bidirectional feedback** - Lower-level agents can object to bad instructions
- **Knowledge sharing** - Whiteboards for cross-agent discoveries

## Key Features

### Auto-Scaling

| Scale | Criteria | Formation |
|-------|----------|-----------|
| Recon | Questions, research | Oyakata handles directly |
| Squad | 1-2 file changes | Single shigoto-neko |
| Platoon | 3-5 files / multiple tasks | shigoto + 1-2 genba-neko |
| Battalion | 6+ files / large-scale | shigoto + 3 genba-neko |

### Objection Protocols

Agents aren't just order-followers. They have an **obligation** to speak up:

- **OBJECTION-001** (genba -> shigoto): "This instruction will break things"
- **OBJECTION-002** (shigoto -> oyakata): "This strategy contradicts our goal"

Each objection requires: **Facts + Concerns + Alternative Proposal**

### Completion Gates

Every task must pass a gate with recorded evidence:

```
| # | Item              | Status | Evidence                              |
|---|-------------------|--------|---------------------------------------|
| 1 | Tests pass        | PASS   | `npm test`: 42 passed, 0 failed       |
| 2 | No unintended diff| PASS   | `git diff` shows only target files    |
| 3 | Objections resolved| PASS  | No [OBJECTION] tags on whiteboard     |
```

"I confirmed it" is not evidence. "Here's the output proving it" is.

### Review Protocol (3 Principles)

1. **Implementer != Reviewer** - The agent who wrote it doesn't review it
2. **Reviewer is read-only** - No code modifications, only feedback
3. **Loop limit 3** - After 3 review cycles, an arbitrator (Opus) decides

### Whiteboard System

For complex missions, agents share discoveries through a whiteboard:

- Each agent writes findings with source citations
- `[OBJECTION]` tags are visible to all agents
- kurouto-neko checks unresolved objections before review
- Cross-cutting observations prevent siloed thinking

### Safety Measures

- **File deletion safety**: Files go to `_deleted/` first, never instant-deleted
- **Race condition prevention**: No two agents edit the same file
- **Trust levels (FIDES)**: External data is explicitly tagged as LOW trust
- **Safety tiers**: Tier 1 operations are absolutely prohibited, Tier 2 requires confirmation

## Installation

### As a Claude Code Plugin

```bash
# Clone the repository
git clone https://github.com/anthropics/claude-code.git
# Or install via the plugin command in Claude Code
/plugin install neko-gundan
```

### Manual Installation

1. Copy the `agents/` directory to your project's `.claude/agents/`
2. Copy the `rules/` directory to your project's `.claude/rules/`
3. Copy the `commands/` directory to your project's `.claude/commands/` or `~/.claude/commands/`
4. Add the neko-gundan section to your `CLAUDE.md` (see `examples/CLAUDE.md.example`)

### Quick Start

1. Install the agents and rules as described above

2. Initialize the runtime directories:
   ```bash
   bash multi-agent-neko/scripts/setup.sh
   ```
   This creates: `queue/` (message queues), `status/` (dashboard, whiteboards), `alerts/`, `token-usage/`, and initializes `dashboard.md` from template.

3. Add to your `CLAUDE.md`:
   ```markdown
   ## Multi-Agent Mode
   You operate as "Oyakata-neko" (General). Process all instructions through the Neko Gundan system.
   See `.claude/agents/` for team definitions.
   ```

4. Start Claude Code and give it a task. It will automatically scale the team.

> **Note**: `setup.sh` is idempotent — safe to run multiple times. It clears stale queues from previous sessions while preserving `status/archive/`.

## File Structure

```
neko-gundan/
+-- .claude-plugin/
|   +-- plugin.json           # Plugin metadata
+-- agents/
|   +-- oyakata-neko.md       # General (strategy & delegation)
|   +-- shigoto-neko.md       # Manager (task decomposition & QA)
|   +-- genba-neko.md         # Worker (implementation)
|   +-- kurouto-neko.md       # Specialist (independent review)
+-- commands/
|   +-- neko-gundan.md        # Team deployment command
+-- rules/
|   +-- review-protocol.md    # Review loop protocol
|   +-- handoff-schema.md     # Agent handoff data schema
|   +-- completion-gates.md   # Start/completion gate definitions
|   +-- spec-driven-review.md # Spec-driven review process
+-- docs/
|   +-- architecture.md       # System architecture
|   +-- protocols.md          # All protocols reference
+-- examples/
|   +-- CLAUDE.md.example     # Example CLAUDE.md configuration
+-- README.md
+-- LICENSE                   # MIT License
+-- CHANGELOG.md
```

## Protocols Reference

| Protocol | Purpose | Defined In |
|----------|---------|-----------|
| OBJECTION-001 | genba -> shigoto feedback | `agents/genba-neko.md` |
| OBJECTION-002 | shigoto -> oyakata feedback | `agents/shigoto-neko.md` |
| WHITEBOARD-001 | Cross-agent knowledge sharing | `agents/shigoto-neko.md` |
| RACE-001 | File conflict prevention | `agents/shigoto-neko.md`, `agents/genba-neko.md` |
| FIDES | Data trust level tagging | `rules/handoff-schema.md` |

## Design Philosophy

### Inspired by Real Organizations

Neko Gundan applies human organizational management patterns to AI agents:

- **Objection protocols** = Whistleblower systems / Speak-up culture
- **Completion gates** = Quality inspection checkpoints
- **Separation of duties** = Audit principles (maker != checker)
- **Whiteboards** = Team standup / knowledge sharing

### Born from Real Incidents

This framework wasn't designed in theory. It evolved from actual incidents where AI agents deleted production files, made wrong decisions, and broke working features. Every protocol exists because something went wrong without it.

Key learnings:
1. **Agents without purpose context can't catch mistakes** -> Mandatory purpose sharing
2. **One-way command chains can't stop bad orders** -> Bidirectional objections
3. **Self-review is unreliable** -> Independent reviewer requirement
4. **"I checked" without evidence is meaningless** -> Evidence-based gates
5. **Instant file deletion is irreversible** -> `_deleted/` safety buffer

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
