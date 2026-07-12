# Auto Mode — Using Neko Gundan with Claude Code's Auto Permission Mode

> Claude Code v2.1.71+ includes `auto` permission mode, where Claude decides permission requests itself instead of asking you every time.

## Why This Matters

Without auto mode, Claude Code asks for human approval on many operations — file edits, bash commands, tool calls. With a multi-agent setup like Neko Gundan, these approval prompts multiply across agents, creating constant interruptions.

Auto mode lets Claude handle routine permission decisions automatically, while Neko Gundan's safety protocols handle the quality and correctness layer on top.

## Setup

### Enable auto mode (recommended)

Add to your `~/.claude/settings.json`:

```json
{
  "permissionMode": "auto"
}
```

Or launch with: `claude --permission-mode auto`

### Keep your existing allow list

If you already have `permissions.allow` rules, **keep them**. They serve as a fallback and baseline. Auto mode adds AI judgment on top, not instead of.

## How Auto Mode + Neko Gundan Work Together

```
┌─────────────────────────────────────────┐
│         Layer 1: Auto Mode              │
│  "Is this operation safe to execute?"   │
│  (file writes, bash commands, tools)    │
├─────────────────────────────────────────┤
│         Layer 2: Neko Gundan            │
│  "Is this work correct and proven?"     │
│  (review separation, evidence gates,    │
│   objections, race prevention)          │
└─────────────────────────────────────────┘
```

They solve **different problems**:

| Concern | Auto Mode | Neko Gundan |
|---------|-----------|-------------|
| "Should this file be edited?" | Yes — permission decision | — |
| "Is the edit correct?" | — | Yes — review + evidence gate |
| "Is the command safe?" | Yes — risk assessment | Yes — Safety Tiers (Tier 1/2) |
| "Did anyone review this?" | — | Yes — implementer != reviewer |
| "Can the agent object?" | — | Yes — OBJECTION protocol |
| "Is deleted data recoverable?" | — | Yes — `_deleted/` buffer |

**Auto mode replaces manual permission clicks. Neko Gundan replaces manual quality assurance.**

## What Auto Mode Does NOT Replace

Auto mode handles *permission decisions* (can the agent touch this file / run this command). It does **not** provide:

- Independent code review (Neko Gundan's kurouto-neko)
- Evidence-based completion verification (completion gates)
- Race condition prevention across agents (RACE-001)
- Objection protocols when instructions are wrong
- Structured failure analysis (Reflexion)

These remain Neko Gundan's responsibility.

## Safety: Double Layer

With both enabled, you get defense in depth:

1. **Auto mode** blocks obviously dangerous operations (rm -rf, force push)
2. **Neko Gundan Safety Tiers** add a second check:
   - Tier 1 (absolutely prohibited): Blocks even if auto mode would allow
   - Tier 2 (requires confirmation): Escalates to human even in auto mode
3. **FIDES trust levels** tag external data as LOW — auto mode doesn't know about trust levels, Neko Gundan does

## Recommendations

| Scenario | Permission Mode | Why |
|----------|----------------|-----|
| Solo development with Neko Gundan | `auto` | Reduce interruptions, let safety tiers handle risk |
| Multi-agent (platoon+) | `auto` | Essential — approval prompts per agent make parallel work impractical |
| High-security / production | `default` + allow list | Maximum human oversight, accept the interruptions |
| Quick experiments | `auto` | Speed matters, Neko Gundan's light mode + auto mode is the fastest safe option |

## Disabling

If auto mode causes issues:

```json
{
  "permissionMode": "default"
}
```

Or set `"disableAutoMode": true` to prevent agents from using it.
