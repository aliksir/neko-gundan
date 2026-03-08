# Changelog

## [1.1.1] - 2026-03-08

### Added
- **Capacity escalation protocol (CAPACITY-001)**: Shigoto-neko escalates to oyakata-neko when management load exceeds capacity — before quality degrades. Distinct from OBJECTION (instruction correctness) as a factual capacity report. Includes trigger conditions, escalation template, and oyakata's response flow

## [1.1.0] - 2026-03-08

### Added
- **Arbitrator process**: Formal mediation protocol for oyakata-neko when review loops exceed 3 cycles or confidence is low (trigger conditions, 4-step process, ruling template)
- **Responsibility priority matrix**: P0-P4 priority table for shigoto-neko to prevent bottleneck under battalion-scale operations, with delegation rules
- **Commit strategy guide**: Replaced "always commit immediately" with situational commit guidelines for genba-neko (new file / feature checkpoint / WIP)
- **FIDES LOW→MEDIUM promotion**: Concrete verification procedures for elevating LOW trust data (independent source, local reproduction, schema validation, pattern matching, human confirmation)
- **Quick Start init step**: Added `setup.sh` initialization step to README Quick Start section
- **Heartbeat protocol (HEARTBEAT-001)**: Genba-neko must report when stuck for 5+ minutes, hitting 2 errors, or encountering unexpected state. Auto-escalation on 3 consecutive errors
- **Polling protocol (POLLING-001)**: Shigoto-neko actively checks genba-neko progress (5min initial, then every 10min). Silent stall detection with 4 pattern types
- **Watchdog-Heartbeat integration**: HEARTBEAT-001 escalations feed into the 3-layer Watchdog system (L1/L2 triggers)

### Improved
- **Compaction Recovery (oyakata)**: Expanded from 4-step to 5-step recovery with full state reconstruction (TaskList, messages, whiteboards, OBJECTION status, dev-lessons)

### Thanks
- External review feedback from independent Claude evaluation session

## [1.0.0] - 2026-03-07

### Added
- Initial release of the Neko Gundan multi-agent framework
- 4 agent definitions: oyakata-neko, shigoto-neko, genba-neko, kurouto-neko
- Auto-scaling system (recon/squad/platoon/battalion)
- Bidirectional objection protocols (OBJECTION-001, OBJECTION-002)
- Whiteboard system for cross-agent knowledge sharing (WHITEBOARD-001)
- Race condition prevention protocol (RACE-001)
- Data trust level tagging (FIDES)
- Completion gates with evidence requirements (start gate + completion gate)
- Review loop protocol (3 principles)
- Chain-of-Thought Judge with 4-aspect rubric
- Handoff schema for structured agent-to-agent data transfer
- Spec-driven review process
- File deletion safety (`_deleted/` buffer)
- Plugin structure for Claude Code compatibility
- Example CLAUDE.md configuration
- Architecture and protocol documentation
