# Shitsuke Guide (しつけ機能ガイド)

## What is Shitsuke?

"Shitsuke" (しつけ / discipline/training) is Neko Gundan's module system. It lets you enable or disable optional features based on your project's needs.

Think of it as training your cat squad — you decide which behaviors they learn.

## Core vs Modules

### Core (Always Active)
These features cannot be disabled. They are the foundation of safe multi-agent operation:

- **Agent roles & character** — Identity and communication style
- **Completion gates** — Evidence-based quality checkpoints
- **Objection protocols** (OBJECTION-001/002) — Bidirectional feedback
- **Implementer != Reviewer** — Separation of duties
- **Safety tiers** — Destructive operation prevention
- **Report formats** — Structured communication
- **Compaction recovery** — Session stability

### Optional Modules
Enable based on your needs:

| Module | What it does | Best for |
|--------|-------------|----------|
| `whiteboard` | Cross-agent knowledge sharing | Platoon+ (3+ files) |
| `heartbeat` | Stuck detection & active monitoring | Parallel agents |
| `race_prevention` | File conflict prevention | Parallel agents |
| `reflexion` | Structured failure reflection | All scales |
| `isv` | Numerical intent/outcome tracking | Self-improvement data |
| `fides` | Data trust level tagging | External API/MCP users |
| `capacity_escalation` | Manager overload escalation | Battalion (3+ workers) |
| `arbitrator` | Formal mediation process | Complex projects |
| `handoff_schema` | Structured YAML handoffs | Strict handoff needs |
| `jit_tests` | Disposable tests from diffs | Low test coverage |
| `tdd_separation` | Separate test/impl agents | Context purity |
| `ensemble_judge` | Multi-strategy evaluation | Security-critical |
| `spec_driven_review` | Verify spec alignment | Formal requirements |

## Quick Start

### 1. Choose a preset

```bash
# Copy a preset to use as your config
cp presets/recommended.yaml neko-gundan.config.yaml
```

Available presets:
- **`minimal.yaml`** — Core only. Lightweight, great for getting started
- **`recommended.yaml`** — Balanced. Monitoring + reflexion enabled
- **`full.yaml`** — Everything on. Maximum quality control

### 2. Copy enabled modules

Based on your config, copy the corresponding module files to your `.claude/rules/` directory:

```bash
# Example for recommended preset
cp modules/whiteboard.md .claude/rules/
cp modules/heartbeat.md .claude/rules/
cp modules/race-prevention.md .claude/rules/
cp modules/reflexion.md .claude/rules/
```

### 3. Install agents and core rules

```bash
cp agents/*.md .claude/agents/
cp rules/*.md .claude/rules/
```

### 4. Done!

The agent definitions reference active modules at the bottom. Agents will check for module files and apply the protocols that are present.

## Customization

### Enable a single module

1. Edit `neko-gundan.config.yaml` and set the module to `true`
2. Copy the module file: `cp modules/{module}.md .claude/rules/`

### Disable a module

1. Edit `neko-gundan.config.yaml` and set the module to `false`
2. Remove from rules: `rm .claude/rules/{module}.md`

### Create your own module

Follow the module template:

```markdown
# Module Name

> **Module**: `module_key` | **Default**: ON/OFF | **Scale**: Recon/Squad/Platoon/Battalion

Description of what this module does.

## Agent-specific sections

### Shigoto-neko: [Behavior for this agent]
...

### Genba-neko: [Behavior for this agent]
...
```

## FAQ

**Q: Do I need all modules for Neko Gundan to work?**
A: No. Core features alone provide a solid multi-agent framework. Modules add specialized capabilities.

**Q: Can I mix presets?**
A: Yes. Start with a preset and toggle individual modules as needed.

**Q: What happens if I enable a module but don't copy the file?**
A: The agent definitions reference modules at the bottom. If the file isn't in `.claude/rules/`, the agent simply won't have those instructions loaded.

**Q: Which preset should I start with?**
A: Start with `recommended`. It covers the most common needs without overwhelming agents with instructions.
