# Changelog

## [1.6.0] - 2026-03-10

### Added
- **koneko mode**: Lightweight version for PRO-tier Claude Code users
  - `koneko-neko` agent: Simplified 3-aspect reviewer (correctness, safety, testing)
  - `koneko-gates` rule: 3-item completion check (vs 7 items in full version)
  - 1 agent call per task (vs 3-5 in full Neko Gundan)
  - Safety tiers and `_deleted/` buffer included
  - No multi-agent hierarchy, no parallel execution, no modules
  - Upgrade path documented: koneko → quality+security → all
  - `docs/koneko.md` / `docs/koneko.ja.md` — full guide
  - Added to installer: `bash install.sh koneko ./your-project`

## [1.5.0] - 2026-03-10

### Added
- **quality_metrics module**: Cumulative quality trend report per project
  - Tracks gate pass/skip rates, review cycles, human interventions, confidence trends
  - Hotspot detection (files changed repeatedly = unstable design)
  - Alert triggers for gate theater detection (skip rate >30%, all-1-cycle reviews, zero interventions)
  - Self-contained format: all metric meanings are inline, no external references needed
  - Configurable output path via `metrics_output_dir` in CLAUDE.md (default: `{project_root}/_metrics/`)
  - Added to presets: full=ON, recommended/minimal=OFF

### Changed
- **checklist_export**: Changed default from OFF to ON in recommended preset

## [1.4.0] - 2026-03-10

### Added
- **checklist_export module**: Export completion gate checklists to external markdown files for human review and record keeping
  - Configurable output path via `checklist_output_dir` in CLAUDE.md (default: `{project_root}/_checklist/`)
  - Output format: `YYYYMMDD_{project_name}.md`
  - Added to all 3 presets (full=ON, recommended/minimal=OFF)

### Fixed
- **Whiteboard not created in practice**: Root cause was 3-fold:
  1. Oyakata-neko's conditional branch allowed skipping whiteboard for "independent tasks"
  2. Shigoto-neko's trigger depended on explicit oyakata instruction
  3. Path mismatch between agent definitions and whiteboard module
  - **Fix**: Pre-dispatch hard gate (4-item checklist) — platoon+ missions cannot spawn genba-neko without completing whiteboard + dashboard setup
  - Unified whiteboard path to `{WHITEBOARD_DIR}` variable

### Changed
- **Scaling table**: Added complexity axis to scale judgment
  - Squad: 1-2 files, OR 3-5 files of simple refactoring (move/rename/DRY)
  - Platoon: 3-5 files AND involves design decisions (new API/DB change/architecture)

## [1.3.0] - 2026-03-09

### Added
- **Shitsuke (Module System)**: Feature toggle system for optional protocols
  - `neko-gundan.config.yaml` configuration file with 13 toggleable modules
  - `modules/` directory with extracted optional protocols
  - 3 presets: `minimal`, `recommended`, `full`
  - `docs/shitsuke-guide.md` with setup instructions and FAQ
- **Presets**: Ready-made configurations for different project scales

### Changed
- **Agent definitions refactored**: Core-only agent files (~100-130 lines each, down from 104-323)
  - oyakata-neko: 185 -> ~110 lines (optional: arbitrator, capacity-escalation)
  - shigoto-neko: 323 -> ~150 lines (optional: whiteboard, heartbeat, polling, ISV, capacity, handoff)
  - genba-neko: 219 -> ~120 lines (optional: heartbeat, whiteboard, race-prevention, reflexion)
  - kurouto-neko: 104 -> ~85 lines (optional: ensemble-judge)
- **Rules slimmed**: Moved optional content to modules
  - `completion-gates.md`: Core 7 items (module-specific items in respective modules)
  - `review-protocol.md`: Core 3 principles + self-verification (TDD/JiT/ensemble/spec in modules)
  - `handoff-schema.md`: Moved to `modules/handoff-schema.md`
  - `spec-driven-review.md`: Moved to `modules/spec-driven-review.md`

### Module Catalog
| Module | Protocol | Default |
|--------|----------|---------|
| whiteboard | WHITEBOARD-001 | ON |
| heartbeat | HEARTBEAT-001 + POLLING-001 | ON |
| race_prevention | RACE-001 | ON |
| reflexion | Failure reflection | ON |
| isv | Intent State Vector | OFF |
| fides | Trust levels (FIDES) | OFF |
| capacity_escalation | CAPACITY-001 | OFF |
| arbitrator | Formal mediation | OFF |
| handoff_schema | Structured handoffs | OFF |
| ensemble_judge | SE-Jury Method | OFF |
| jit_tests | JiTTests | OFF |
| tdd_separation | TDD agent separation | OFF |
| spec_driven_review | Spec alignment review | OFF |

## [1.2.0] - 2026-03-09

### Added
- **Intent State Vector (ISV)**: Multi-dimensional vector for recording task intent, state, and results. Makes action reasoning observable, enabling success/failure pattern comparison and self-improvement loops
  - Intent dimensions (defined at task start): urgency, risk, complexity, novelty, purpose_alignment
  - State dimensions (updated during execution): confidence, progress, watchdog_level, retry_count
  - Result dimensions (recorded at completion): outcome, review_cycles, intervention_count
  - Anchor points table for consistent scoring across agents
  - Lite version (3 dimensions) for squad-level tasks
- ISV field added to handoff schema (`rules/handoff-schema.md`)
- ISV start values added to shigoto-neko task instruction format
- ISV result values added to shigoto-neko report format
- ISV recording added as completion gate item #10

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
