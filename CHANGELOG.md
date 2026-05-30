# Changelog

## [1.11.0] - 2026-05-30

### Added
- **Dynamic Workflows support (research preview)**: New SSOT `modules/dynamic-workflows.md` documenting Claude Code's Dynamic Workflows feature — Claude writes a JavaScript orchestration script that the runtime executes **locally** in the background, coordinating many sub-agents at scale (up to 16 concurrent, 1000 agents total per run). Runs against the existing subscription usage pool: **no external API billing, no data leaving the machine**. Intermediate results live in script variables (they do not consume the orchestrator's context), and independent agents adversarially cross-review to self-converge. Three launch paths: the keyword `workflow` in a prompt, `/effort ultracode`, and the bundled `/deep-research`. Official doc: https://code.claude.com/docs/en/workflows
- **`yaml/modules/dynamic-workflows.yaml`**: Machine-readable module config (toggle, default state, applicable scale).
- **`templates/workflow-template.md`**: Reusable template for saving Dynamic Workflow scripts. Saved runs go under the **project** `.claude/workflows/` with a `neko-` prefix (never the home `~/.claude/workflows/`, which holds the routing-table procedure docs) so the gates-start routing table never reads a JS orchestration script as a how-to procedure doc.
- **Mirror sections appended** to `agents/oyakata-neko.md` (battalion-scale delegation decision: cross-codebase audit / large mechanical migration / cross-verification research — and when NOT to delegate, with a fail-safe fallback to TeamCreate), `rules/review-protocol.md` (review discipline — the Workflow's internal cross-review is only a preliminary screening; **final approve is always performed by a kurouto-neko outside the Workflow**, and the orchestrator that launched the Workflow must not double as the final reviewer), `gates/gates-start.md` (note that `neko-*` workflows are out of the routing table's Read scope), and `docs/WORKFLOW.md` (pointer to the SSOT). `README.md` and `README.ja.md` updated to mention the feature. The four-way usage distinction (sub-agent / skill / TeamCreate / Dynamic Workflows) is documented as complementary, not competing.
- **neko-kensa automated analysis integrated into the review workflow** (commit `e0d8a0c`).
- **`examples/README.md`** added to walk through template customization (commit `2a1f8f2`, #121).
- **README CI/Release badges and a 1-Minute Demo** added (commit `486fc93`, #120).

### Changed
- **GitHub Actions bumped to v6** (commit `486fc93`, #120).
- **LF line endings enforced** via `.gitattributes` (`* text=auto eol=lf`) (commit `6f325fb`, #119).

### Documentation
- **Code provenance & license check** added to the "Safety Built In" section of the README (commit `a02c999`).
- **Three review nits from PR #120/#121** bundled into a single cleanup PR (commit `a306c82`, #122).

### Fixed
- **CI failures fixed**: pytest install plus shellcheck SC2168/SC2164/SC2155/SC2034 (commit `e2a1ee6`, #118).

> Dynamic Workflows is a research preview — behavior and commands may change. Re-verify at the preview→GA migration. If the feature is off or not yet rolled out, treat the delegation guidance as a dormant rule and fall back to TeamCreate.

## [1.10.2] - 2026-05-24

### Fixed
- **`.github/workflows/ci.yml` triggers on `master`** (commit `b9a716a`): The repository default branch is `master`, but the CI workflow listened for push/pull_request on `main` only. As a result, none of the recent v1.10.x commits triggered CI runs. Switch both `push.branches` and `pull_request.branches` from `[main]` to `[master]`. Reported by external code review (Codex), 2026-05-24.
- **`.github/workflows/ci.yml` shellcheck nullglob guard** (本 v1.10.2 release): `shellcheck scripts/*.sh` fails when the glob expands to no files. Guard with `shopt -s nullglob` + array length check so an empty match yields zero args and shellcheck exits 0 with an informative message. Surfaced by kurouto-neko review of the v1.10.2 release candidate.
- **`scripts/commit-guard.mjs` flag variants** (commit `96d381b`): `extractCommitMessage` now recognises `-am`, `-ma`, `-aSm`, `--message`, `--message=...` in addition to the original `-m`. Previously a `git commit -am "..."` would silently pass the CL-description bad-pattern check, defeating the v1.10.0 guard.

### Documentation
- **README parity update** (commits `871856f` + `eef7895`): `README.md` / `README.ja.md` / `README.koneko.md` brought into feature parity for v1.10.x — Safety Built In section adds physical switches (cwc-derived) + nightly autopilot guards, Implementer != Reviewer section adds Adversarial 2nd-Pass + Evidence Level Ladder, Key Features adds Exploration Mode section, Acknowledgments adds `cwc-long-running-agents` (Apache-2.0) + `clearwing` (MIT). Follow-up Nit fix in `eef7895` corrects exploration-mode persistence claim (`_explored/` → `lessons/`).

### Misc
- **First GitHub Releases published retroactively** (out-of-band): `v1.10.0` (commit `b1505ba`) and `v1.10.1` (commit `3552d56`) annotated tags + GitHub Releases were backfilled on 2026-05-24. `v1.10.2` is the first release where the tag and release ship together.

## [1.10.1] - 2026-05-10

### Added
- **schtask `nightly-enqueue-daily-research`**: Daily 22:00 JST trigger to auto-enqueue `daily-research` jobs into `queue/nightly/{YYYYMMDD}_daily-research.json`. Closes the gap discovered during stage-2 cutover (5/6) where enqueue was not automated, leading to 5/8 day 4 / 5/9 day 5 empty-queue runs. The 90-minute gap to `nightly-runner` (23:30) absorbs schtask startup delay
- **`kidou/_do_enqueue_daily-research.bat`**: Wrapper script invoked by the new schtask. Calls `node scripts/nightly-runner.mjs --queue-add daily-research`, logs to `C:\work\logs\nightly-runner.log`, propagates exit code via `exit /b %errorlevel%`
- Principal copied from existing `nightly-runner` schtask to ensure consistent execution context (UserId=aliks, RunLevel=Limited, LogonType=Interactive)

### Removed
- **Budget enforcement (2026-05-09 batch)**: Following migration to Claude Code Pro plan (flat-rate), per-job and per-night budget caps are no longer required. Removed:
  - `--max-budget-usd` CLI argument passed to `claude` (was `$2.00` default per job)
  - `policy.limits.max_total_budget_usd` (was `$30.00` per night)
  - `STATUS.SKIPPED_BUDGET` status and budget-tracking aggregation in `nightly-runner.mjs`
  - The `max_budget_usd` field is retained in `rules/nightly-policy.yml` per-job entries for `parseYaml` smoke compatibility (declared as a reference value, not enforced at runtime)
  - Cost-recording (`cost_usd` aggregation in results) is retained
  - Details: `result/20260509_nightly-budget-removal.md`

### Misc
- **`.gitignore`**: ignore `queue/nightly/` (per-environment runtime queue records) and `.cache/`
- **`PROGRESS.md`**: append-only task log added (kaizen-fullbatch Phase 6, 2026-05-08)

## [1.10.0] - 2026-05-07

### Added
- **`hooks/kill-switch.sh`**: Physical kill switch for all tool calls. While `$AGENT_STOP_FILE` (default: `~/.claude/AGENT_STOP`) exists, every tool call is blocked. Engage with `touch ~/.claude/AGENT_STOP`, resume with `rm`. Inspired by [anthropics/cwc-long-running-agents](https://github.com/anthropics/cwc-long-running-agents) (Apache-2.0)
- **`hooks/steer.sh`**: Mid-run redirect channel. When `$AGENT_STEER_FILE` (default: `~/.claude/STEER.md`) has content, surface it as `OPERATOR STEERING:` once at the next `PreToolUse`, then clear the file. Useful for redirecting long-running / nightly jobs without restart. Inspired by [anthropics/cwc-long-running-agents](https://github.com/anthropics/cwc-long-running-agents) (Apache-2.0)
- **Hooks Guide updates**: New "Kill Switch" and "Steer" sections in `docs/hooks-guide.md`

### Fixed
- **`scripts/nightly-runner.mjs` payload delivery (commit `1686c44`)**: `policy.yml` `prompt_template` now reaches `buildClaudeCmd` via new `mergePolicyPromptTemplates()`. New `expandTemplate()` for `${VAR}` placeholder substitution. `parseYaml` now supports pipe block scalar (`|`). Added `Bash(git checkout|switch|branch:*)` to `--allowedTools` so feature-branch commits actually happen
- **`rules/nightly-policy.yml`**: `daily-research` `prompt_template` rewritten to a 7-step procedure (cd → checkout → arxiv → append → commit) so the nightly job reaches the commit step

### Changed
- **`hooks/` block protocol convention**: Both new hooks use `{"decision":"block","reason":"..."}` on stdout + `exit 2`, matching existing `commit-guard.mjs` / `nightly-guard.mjs`. Documented in inline comments

## [1.9.0] - 2026-04-04

### Added
- **CASCADE-001 module**: Task dependency graph with `←` notation on whiteboard. Automatic cascade blocking when upstream task fails. POLLING-001 suppression for BLOCKED tasks
- **FANOUT-001 module**: Structured 3-phase parallel result integration (Fan-Out → Collect → Aggregate). Includes collect checklist, contradiction/duplicate detection, and whiteboard Aggregation Result template
- **raw-log token tracking**: Optional `resource_usage` block (tokens, duration, tool_calls, errors) in genba-neko completion reports. Resource Summary table in raw log files

### Changed
- **shigoto-neko pre-dispatch gate**: Added dependency graph and output contract items (conditional — skip for independent tasks / single agent)
- **genba-neko pre-work**: Added dependency graph status check before starting work
- **whiteboard template**: Added Task Dependency Graph and Aggregation Result sections

## [1.8.0] - 2026-03-17

### Added
- **Mandatory Design Phase**: `designs/` added as required artifact for all commits. Flow is now Plan → Design → Implement → Quality Check
- **Phase-specific gates**: Design/Implement/Review/Test gates added to `completion-gates.md` for independent phase execution
- **Phase file requirements table**: README (EN/JA) documents required inputs and outputs per phase
- **Audit Commands & Permissions section**: `modules/audit-trail.md` now includes command/permission summary table
- **Actionable hook error messages**: gate-guard and commit-guard show specific file creation hints on block

### Fixed
- **commit-guard timezone bug**: Changed from UTC (`toISOString`) to local time — fixes off-by-one date in JST+9 and similar timezones
- **Implement start gate relaxed**: `plans/` changed from required to recommended (design doc is the true prerequisite from previous phase)
- **Local-specific paths removed**: Hardcoded `C:\work` replaced with `NEKO_WORK_DIR` environment variable
- **Local metaDirs removed**: `kidou`, `scratch`, `claude-skills`, `依頼事項` removed from public hooks

### Changed
- **Review gates**: Added reference source documentation requirement (plan review → none, design review → plan, code review → design)

## [1.7.2] - 2026-03-13

### Added
- **Faceted Prompting module** (`modules/faceted-prompting.md`): Prompt design guideline based on Separation of Concerns
  - 5 facets: Persona, Knowledge, Instruction, Output Contract, Policy
  - Recency Effect placement strategy: Policy/constraints at the END of agent definitions for stronger LLM adherence
  - Mapping to Neko Gundan's existing agent structure
  - Guidelines for creating and modifying agent definitions

### Changed
- **All 4 agent definitions restructured** to follow Faceted Prompting order
  - Behavioral Rules, Safety Tiers, OBJECTION protocols moved to `## Policy (Recency Zone)` section at file end
  - All existing content preserved — section order change only, no content modifications
  - Each Policy section includes reference note to `modules/faceted-prompting.md`
- **neko-gundan.config.yaml**: Added `faceted_prompting` module under new "プロンプト設計系" category

### Thanks
- Inspired by nrslib's [TAKT SpeakerDeck presentation](https://speakerdeck.com/nrslib/) on AI coding agent quality assurance

## [1.7.1] - 2026-03-13

### Added
- **Gate Guard hook** (`hooks/gate-guard.mjs`): PreToolUse hook that enforces start gate compliance
  - Blocks Edit/Write on project source code when `plans/` or `checklist/` files are missing
  - Mechanically prevents gate skipping — LLM interpretation alone is no longer sufficient
  - Auto-skips meta directories (plans/, checklist/, result/, etc.) and meta files (CLAUDE.md, handover.md)
  - Cross-platform: Windows + Unix compatible (uses `process.stdin.fd`)

## [1.7.0] - 2026-03-10

### Added
- **OBJECTION-003 protocol**: Kurouto-neko can now raise design-level objections during review
  - Trigger conditions: flawed instructions, architecture problems, security design issues
  - Distinct from review feedback: "code correctly implements a flawed design" → escalate
- **Rubric Aggregation Logic**: Explicit decision rules for kurouto-neko's 5-aspect rubric
  - Aspect priority: Safety > Correctness > Testing > Maintainability > Purpose Alignment
  - Any FAIL → REQUEST_CHANGES, confidence low → ESCALATE
- **Progress Visibility module** (`modules/progress-visibility.md`): Dashboard update protocol
  - Defines what/when/who for dashboard updates
  - Structured update triggers (mission start, task assignment, completion, blockers)
- **Objection Flow module** (`modules/objection-flow.md`): Unified OBJECTION recording format
  - Whiteboard recording template for all OBJECTION types (001/002/003)
  - Resolution tracking (OPEN/ACCEPTED/REJECTED)
- **Koneko-neko Design Intent section**: Documents intentional protocol exclusions with rationale
  - Explicit "What IS Maintained" list (implementer≠reviewer, evidence gates, safety tiers)

### Changed
- **Module-to-action integration**: All modules now specify Integration Points (agent/phase/action)
  - genba-neko: Whiteboard read mandatory for platoon+ (was "if exists"), Heartbeat checkpoints in work procedure
  - shigoto-neko: Progress Monitoring section with polling protocol and silence pattern detection
  - Active Modules sections converted from bullet lists to tables with Integration Phase column
- **SSOT unification**: Completion gate items centralized in `rules/completion-gates.md`
  - Module-specific gate items (#8-#13) documented in single canonical table
  - Process Weight Variants section added (Light/Standard/Strict scope definitions)
  - `neko-gundan.config.yaml` annotated with gate item numbers
- **Light mode clarification**: Self-check definition explicitly documented
  - What's allowed (tests, lint, diff check) vs what requires independent review
  - Exception to "implementer ≠ reviewer" limited to Light mode only, with ESCALATION-001 safety net
- **Review protocol**: Process Weight Exception section added to `rules/review-protocol.md`

### Fixed
- **H3**: Modules existed as documents but weren't integrated into agent action steps
- **H5**: Whiteboard read was conditional ("if exists") despite mandatory creation in pre-dispatch gate
- **H6**: HEARTBEAT-001 listed as module but not in genba-neko's work procedure
- **H7**: POLLING-001 defined in module but not in shigoto-neko's behavioral flow
- **M5→H**: Kurouto-neko had no way to raise objections (OBJECTION-003 added)
- **M11→H**: Progress visibility had no structured protocol (module added)
- **H1**: Light mode "self-check allowed" contradicted "implementer ≠ reviewer" (scope clarified)
- **H4**: Gate definitions scattered across 4 files (SSOT unified in completion-gates.md)
- **H8**: Koneko protocol exclusions were undocumented (Design Intent section added)

## [1.6.1] - 2026-03-10

### Changed
- **Completion gate enforcement**: Added mandatory Gate Execution Protocol
  - Forced Read: agents must read `completion-gates.md` before starting — memory-based execution is prohibited
  - Sequential execution: items processed one at a time with evidence recorded per step
  - Item count check: total item count reported and verified to prevent skipped items
  - Updated `shigoto-neko.md` with enforced gate procedure

## [1.6.0] - 2026-03-10

### Added
- **koneko mode**: Lightweight version for PRO-tier Claude Code users
  - `koneko-neko` agent: Simplified 3-aspect reviewer (correctness, safety, testing)
  - `koneko-gates` rule: 3-item completion check (vs 7 items in full version)
  - 1 agent call per task (vs 3-5 in full Neko Gundan)
  - Safety tiers and `_deleted/` buffer included
  - No multi-agent hierarchy, no parallel execution, no modules
  - Upgrade path documented: koneko → quality+security → all
  - `--downgrade` flag: safely retire unneeded files to `_deleted/` when switching modes
  - Downgrade preserves directory structure in `_deleted/neko-gundan-YYYYMMDD/`
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
- ISV field added to handoff schema (`modules/handoff-schema.md`)
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
