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
1. Start Gate (5 checks with evidence)
      |
2. Implementation (genba-neko)
      |
3. Completion Gate (9 checks with evidence) -- executed by shigoto-neko
      |
4. Gate Verification -- executed by kurouto-neko
      |
5. Code Review (5-aspect rubric) -- executed by kurouto-neko
      |  |
      | [issues found] -> fix -> review (max 3 cycles)
      |
6. APPROVE -> Report to oyakata -> Report to commander
```

## Protocol Summary

| ID | Name | Direction | Purpose |
|----|------|-----------|---------|
| OBJECTION-001 | Field Objection | genba -> shigoto | Stop bad instructions from middle management |
| OBJECTION-002 | Management Objection | shigoto -> oyakata | Stop bad strategy from leadership |
| WHITEBOARD-001 | Knowledge Sharing | horizontal | Cross-agent discovery sharing |
| RACE-001 | Conflict Prevention | horizontal | Prevent simultaneous file edits |
| FIDES | Trust Tagging | any handoff | Tag data reliability for injection defense |

## Design Decisions

### Why separate strategy from implementation?
An agent doing both strategy and coding tends to tunnel-vision on implementation details, losing sight of the bigger picture. Separation forces clear "what" vs "how" thinking.

### Why bidirectional feedback?
In the original one-way command structure, a wrong order from oyakata would cascade through shigoto to genba without anyone stopping it. Real incidents (file deletion, feature breakage) proved that bottom-up feedback is essential.

### Why evidence-based gates?
AI agents are prone to saying "I checked and it's fine" without actually checking. Requiring specific evidence (command output, test results) eliminates this failure mode.

### Why whiteboards?
In parallel agent work, discoveries in one area often affect another. Without a shared knowledge surface, agents work in silos and make contradictory decisions.
