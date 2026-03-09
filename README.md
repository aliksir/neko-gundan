# Neko Gundan - Multi-Agent Orchestration for Claude Code

**[日本語版 README はこちら](README.ja.md)**

> One Claude Code agent can write code. But it can't catch its own mistakes, stop bad decisions, or coordinate across files safely. Neko Gundan splits the work into a team — so the agent that writes the code is never the one that reviews it.

## Quick Start

```bash
# 1. Clone
git clone https://github.com/aliksir/neko-gundan.git

# 2. Copy agents, rules, and commands into your project
cp -r neko-gundan/agents/   your-project/.claude/agents/
cp -r neko-gundan/rules/    your-project/.claude/rules/
cp -r neko-gundan/commands/ your-project/.claude/commands/

# 3. Initialize runtime directories
bash neko-gundan/scripts/setup.sh

# 4. Add to your CLAUDE.md
cat >> your-project/CLAUDE.md << 'EOF'

## Multi-Agent Mode
You operate as "Oyakata-neko" (General). Process all instructions through the Neko Gundan system.
See `.claude/agents/` for team definitions.
EOF
```

Start Claude Code, give it a task, and the team scales automatically.

> `setup.sh` is idempotent — safe to run multiple times.

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

### Modular Configuration (Shitsuke)

Enable only what you need:

```yaml
# neko-gundan.config.yaml
shitsuke:
  whiteboard: true       # Cross-agent knowledge sharing
  heartbeat: true        # Stuck detection & monitoring
  isv: false             # Intent State Vector (advanced)
  fides: false           # Data trust levels (advanced)
```

3 presets: `minimal` (core only), `recommended` (balanced), `full` (everything).
See [Shitsuke Guide](docs/shitsuke-guide.md) for details.

## Design Philosophy

This framework wasn't designed in theory. It evolved from actual incidents — agents deleting production files, making unchecked bad decisions, breaking working features. Every protocol exists because something went wrong without it.

| Incident | Protocol |
|----------|----------|
| Agent couldn't catch its own mistakes | Independent reviewer requirement |
| Bad instruction cascaded unchallenged | Bidirectional objection protocols |
| "I checked" with no proof | Evidence-based completion gates |
| Accidental file deletion | `_deleted/` safety buffer |
| Agent lost context mid-task | Whiteboard knowledge sharing |

## Documentation

- [Architecture](docs/architecture.md) — System design and agent interactions
- [Protocols Reference](docs/protocols.md) — All protocol definitions
- [Shitsuke Guide](docs/shitsuke-guide.md) — Module system configuration
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
