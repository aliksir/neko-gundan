# Neko Gundan Architecture

## System Overview

```
+--------------------------------------------------+
|                  Commander (Human)                |
+--------------------------------------------------+
                       |
                       v
+--------------------------------------------------+
|              Oyakata-neko (Opus)                  |
|              Role: Strategy & Delegation          |
|              - Scale assessment                   |
|              - Task decomposition                 |
|              - Start gate execution               |
|              - Final reporting                    |
+--------------------------------------------------+
           |                    ^
     instructions          OBJECTION-002
           v                    |
+--------------------------------------------------+
|              Shigoto-neko (Sonnet)                |
|              Role: Management & QA                |
|              - 5 strategic questions              |
|              - Task distribution                  |
|              - Whiteboard management              |
|              - Dashboard updates                  |
|              - Completion gate execution           |
+--------------------------------------------------+
     |         |              ^           ^
  instruct  instruct    OBJECTION-001  report
     v         v              |           |
+----------+ +----------+    |           |
| Genba-   | | Genba-   |----+-----------+
| neko A   | | neko B   |
| (Sonnet) | | (Sonnet) |
+----------+ +----------+
     |              |
     v              v
  [Code]         [Code]
                            +------------------+
                            | Kurouto-neko     |
                            | (Opus)           |
                            | Role: QA Review  |
                            | - Chain-of-Thought|
                            |   Judge          |
                            | - 5-aspect rubric|
                            | - Gate verify    |
                            +------------------+
```

## Communication Channels

### Vertical (Command Chain)
| Direction | Channel | Content |
|-----------|---------|---------|
| Top-down | SendMessage / TaskCreate | Instructions (with Purpose) |
| Bottom-up | SendMessage | Reports, Objections |

### Horizontal (Knowledge Sharing)
| Channel | Content | When |
|---------|---------|------|
| Whiteboard | Discoveries, objections, cross-cutting insights | Platoon+ missions |
| Dashboard | Progress status | All scales |

### Bidirectional Feedback

```
Oyakata <--OBJECTION-002-- Shigoto <--OBJECTION-001-- Genba
   |                          |                          |
   +--- instructs ----------->+--- instructs ----------->+
```

Every level supports both top-down commands AND bottom-up objections.

## Scaling Model

```
Recon:    [Oyakata] ---- direct response
Squad:    [Oyakata] -> [Shigoto] ---- single agent
Platoon:  [Oyakata] -> [Shigoto] -> [Genba A] + [Genba B] + [Kurouto QA]
Battalion:[Oyakata] -> [Shigoto] -> [Genba A] + [Genba B] + [Genba C] + [Kurouto QA]
```

## Quality Assurance Pipeline

```
1. Start Gate (see rules/completion-gates.md for items)
      |
2. Implementation (genba-neko)
      |
3. Completion Gate (see rules/completion-gates.md for items) -- executed by shigoto-neko
      |
4. Gate Verification -- executed by kurouto-neko
      |
5. Code Review (5-aspect rubric) -- executed by kurouto-neko
      |  |
      | [issues found] -> fix -> review (max 3 cycles)
      |
6. APPROVE -> Report to oyakata -> Report to commander
```

> **SSOT**: Gate definitions (item counts, check details) are maintained in `rules/completion-gates.md`. Do not hardcode counts elsewhere.

## Protocol Summary

| ID | Name | Direction | Purpose |
|----|------|-----------|---------|
| OBJECTION-001 | Field Objection | genba -> shigoto | Stop bad instructions from middle management |
| OBJECTION-002 | Management Objection | shigoto -> oyakata | Stop bad strategy from leadership |
| WHITEBOARD-001 | Knowledge Sharing | horizontal | Cross-agent discovery sharing |
| RACE-001 | Conflict Prevention | horizontal | Prevent simultaneous file edits |
| FIDES | Trust Tagging | any handoff | Tag data reliability for injection defense |

## Architecture Constraints

### Spawn responsibility is top-level only

Sub-agents (shigoto-neko, genba-neko, kurouto-neko) do **not** have access to the Agent tool. Only the top-level agent (oyakata-neko) can spawn new agent processes.

| Scale | Oyakata-neko spawns | Shigoto-neko's role |
|-------|-------------------|-------------------|
| Squad | Shigoto-neko (Agent tool) | Does the work itself |
| Platoon+ | Shigoto-neko + genba-neko + kurouto-neko (TeamCreate) | Manages via SendMessage/TaskCreate |

If additional agents are needed mid-mission, shigoto-neko must escalate to oyakata-neko.

## Design Decisions

### Why separate strategy from implementation?
An agent doing both strategy and coding tends to tunnel-vision on implementation details, losing sight of the bigger picture. Separation forces clear "what" vs "how" thinking.

### Why bidirectional feedback?
In the original one-way command structure, a wrong order from oyakata would cascade through shigoto to genba without anyone stopping it. Real incidents (file deletion, feature breakage) proved that bottom-up feedback is essential.

### Why evidence-based gates?
AI agents are prone to saying "I checked and it's fine" without actually checking. Requiring specific evidence (command output, test results) eliminates this failure mode.

### Why whiteboards?
In parallel agent work, discoveries in one area often affect another. Without a shared knowledge surface, agents work in silos and make contradictory decisions.

## Topology Selection Rationale (2026-04-05追加, arxiv:2601.13671)

The scaling model above maps to three standard multi-agent topologies identified in the MAS orchestration survey:

| Topology | Neko Gundan Scale | When to Use | Tradeoff |
|----------|------------------|-------------|----------|
| **Chain** | Squad (single shigoto-neko) | Linear tasks, clear sequential steps | Low overhead, no parallelism |
| **Star** | Platoon (shigoto-neko hub + genba-neko spokes) | Independent parallel tasks, central coordination | Good parallelism, hub can bottleneck |
| **Hierarchical** | Battalion (oyakata → shigoto → genba) | Complex tasks requiring decomposition at multiple levels | Maximum flexibility, highest coordination cost |

### Selection Criteria
- **Chain**: 1-2 files, no design decisions, sequential dependency
- **Star**: 3-5 files, independent work units, one coordinator needed
- **Hierarchical**: 6+ files or multiple design decisions requiring strategy + management + execution layers

Reference: "The Orchestration of Multi-Agent Systems: Architectures, Protocols, and Enterprise Adoption" (arxiv:2601.13671) provides comprehensive analysis of MCP/A2A complementary protocols and topology patterns for enterprise multi-agent orchestration.
