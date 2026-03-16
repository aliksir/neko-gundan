# Neko Gundan - Multi-Agent Orchestration for Claude Code

> **New here?** Install the skill, then run `/welcome-neko` in Claude Code — interactive setup, no manual config needed!
> ```bash
> # Install the skill
> git clone https://github.com/aliksir/neko-gundan.git
> cp -r neko-gundan/skills/welcome-neko ~/.claude/skills/
> # Then in Claude Code, type: /welcome-neko
> ```

**[日本語版 README はこちら](README.ja.md)** | **On PRO plan? → [Koneko Gundan (Lite version)](README.koneko.md)**

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

## Quick Pick — "Just Tell Me What to Install"

| Your situation | Recommended install | Why |
|----------------|-------------------|-----|
| Solo dev, want a safety net | `security` | Zero agents. Just rules that prevent accidental deletion and unsafe operations |
| Small product, quality matters | `quality+security` | 1 reviewer agent + safety rules. Best cost/benefit starting point |
| Multi-file features, team-scale changes | `all` | Full team structure. Standard weight for most tasks, strict for releases |

Start light, add more later. You can always run `install.sh` again with additional modes.

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
bash neko-gundan/scripts/shitsuke-apply.sh  # Sync modules to .claude/rules/
bash neko-gundan/scripts/setup.sh            # Initialize runtime directories
```

### Post-Install Setup

The installer copies files and shows required settings. Two things to configure:

1. **Add the CLAUDE.md snippet** the installer shows you
2. **Enable the Gate Guard hook** (required) — prevents agents from skipping the planning phase by blocking code edits until `plans/` and `checklist/` files exist. Without this hook, gate compliance depends entirely on agent instructions, which can be forgotten after context compaction. The installer prints the exact JSON to add to your `settings.json`. [Details below](#gate-guard-hook).

### Updating

Already installed? Pull the latest neko-gundan and check what changed:

```bash
cd neko-gundan && git pull
bash scripts/install.sh --update all ./your-project
```

The updater shows a diff for each changed file and lets you choose per file — overwrite, keep yours, or see the full diff first. Files you haven't customized update silently.

**Recommended merge strategy by file type:**

| File type | Strategy | Reason |
|-----------|----------|--------|
| `rules/*.md` | Accept upstream | Protocol improvements; your customizations go in config, not rules |
| `agents/*.md` | Accept upstream | Agent behavior updates; project-specific tweaks go in CLAUDE.md |
| `modules/*.md` | Accept upstream | Module definitions are framework-managed |
| `neko-gundan.config.yaml` | **Keep yours** | Your project's module ON/OFF choices |
| `CLAUDE.md` snippet | **Manual review** | Merge new features with your project-specific instructions |
| `scripts/*.sh` | Accept upstream | Bug fixes and new features |

## Update Checker

The installer records which modes and files you installed in `~/.claude/.neko-gundan-manifest.json`. The update checker uses this to tell you when a new version is available.

**Manual check:**

```bash
bash neko-gundan/scripts/check-update.sh
# or force-check (skip 24h cache):
bash neko-gundan/scripts/check-update.sh --force
```

If a new version is available:

```
🔔 猫軍団: 新バージョン v1.8.0 が利用可能です（現在: v1.7.0）
   インストール済みモード: quality+implement
   → bash neko-gundan/scripts/install.sh --update quality+implement ./your-project
```

**Automatic check at session start (opt-in):**

Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "bash ~/.claude/neko-gundan/scripts/check-update.sh &",
        "timeout": 10000
      }
    ]
  }
}
```

The check runs in the background and only notifies you when an update exists. No automatic updates — just a notification.

**Notes:**
- Results are cached for 24 hours (`~/.claude/.neko-gundan-update-cache`)
- No network call if curl is not available — fails silently
- The manifest (`~/.claude/.neko-gundan-manifest.json`) is created automatically by the installer

### Gate Guard Hook

**Required.** Mechanically enforces start gate compliance. Blocks `Edit`/`Write` on project source code when `plans/` or `checklist/` files are missing — prevents the agent from skipping the planning phase. Without this hook, agents may skip planning after context compaction.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit",
        "hooks": [{ "type": "command", "command": "node path/to/hooks/gate-guard.mjs", "timeout": 3 }]
      },
      {
        "matcher": "Write",
        "hooks": [{ "type": "command", "command": "node path/to/hooks/gate-guard.mjs", "timeout": 3 }]
      }
    ]
  }
}
```

The hook checks `plans/` and `checklist/` directories for files matching the project name. Meta directories and meta files (CLAUDE.md, handover.md, etc.) are excluded so gate artifacts can still be created.

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

### Mandatory Design Phase

Every task follows the flow: **Plan → Design → Implement → Quality Check**. The design document (`designs/`) is a required artifact — even for small changes.

- **Code changes**: Write design rationale (why this approach, what alternatives were considered)
- **No code changes** (docs, config): Create the file with "No design target" and the reason
- The `commit-guard` hook blocks commits when `designs/` is missing

This ensures you can always trace back *why* something was built the way it was — not just *what* was changed.

### Phase-Based Independent Execution

Run individual phases without going through the full pipeline. Useful when humans or other AIs handle some phases.

```bash
/neko-gundan design "Add user auth"       # Design only — no implementation
/neko-gundan implement "plans/auth.md"     # Implement from a plan (human or AI-written)
/neko-gundan review "feature/auth branch"  # Review only — no modifications
/neko-gundan test "src/auth/"              # Test & quality check only
/neko-gundan "Add user auth"              # Full flow (default)
```

Each phase has its own lightweight gates. Input templates are in `templates/` — format matching is not required, as long as the minimum fields (scope, success criteria) are readable. See [WORKFLOW.md](docs/WORKFLOW.md#phase-based-independent-execution) for details.

#### Phase File Requirements

| Phase | Required Input | Output | Auto-created if missing |
|-------|---------------|--------|------------------------|
| `design` | Purpose file (if exists) | `plans/`, `designs/` | designs/ template |
| `implement` | `designs/*.md` (recommended); `plans/*.md` (required if no designs) | Source code, commits | designs/ (with "No design target") |
| `review` | Plan / design / code (reference source varies by target type) | Review report | — |
| `test` | Source code, test plan (matrix) | Test results | — |
| (full flow) | — | All of the above | — |

> **Missing files?** Each phase checks for required inputs at its start gate. If a required file is missing, the command tells you exactly which file is needed and where to create it — instead of silently failing.

The **test phase** includes structured test planning with a coverage matrix:

```
1. Read target code → list all functions/features
2. Create test plan with matrix (function × aspect)
3. Present to commander → approval
4. Unit tests (normal + abnormal cases mandatory)
5. Integration tests (cross-feature scenarios mandatory)
6. Record results in matrix → report
```

| Aspect | Required | Description |
|--------|----------|-------------|
| Normal cases | **Yes** | Expected input → expected output |
| Abnormal cases | **Yes** | Invalid input, null, type mismatch, unauthorized |
| Boundary values | Recommended | 0/1/MAX, empty string, upper limit ±1 |
| State transitions | When applicable | Before/after state changes |

### Agents That Push Back

Agents have an **obligation** to object to bad instructions — not just follow them.

- **OBJECTION-001** (worker -> manager): "This instruction will break things"
- **OBJECTION-002** (manager -> general): "This strategy contradicts our goal"

Each objection requires: **Facts + Concerns + Alternative Proposal**

### Evidence-Based Quality Gates

Every task must pass a gate with recorded evidence. "I confirmed it" is not allowed — only "here's the proof." This includes **hands-on verification**: agents must actually run the code they wrote and record the output, not just claim it works.

```
| # | Item               | Status | Evidence                              |
|---|---------------------|--------|---------------------------------------|
| 1 | Tests pass          | PASS   | `npm test`: 42 passed, 0 failed       |
| 2 | Live verification   | PASS   | CLI output confirms expected behavior |
| 3 | No unintended diff  | PASS   | `git diff` shows only target files    |
| 4 | Objections resolved | PASS   | No [OBJECTION] tags on whiteboard     |
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

**Reference thresholds** (starting points — adjust per project):

| Metric | Healthy | Watch | Action needed |
|--------|---------|-------|---------------|
| Gate pass rate | 70-95% | 50-70% or >95% | < 50% |
| Skip rate | < 20% | 20-35% | > 35% |
| Avg review cycles | 1.2-2.0 | 1.0 (sustained) or > 2.5 | > 3.0 or sustained 1.0 for 5+ tasks |
| Human interventions | 0.2-1.0/task | 0 for 10+ tasks | Sustained 0 (no oversight?) |

*A sustained 1.0 review cycle average is suspicious — it may mean reviews aren't substantive. Some pushback is healthy.*

Enable `quality_metrics` in your config (ON in `full` preset) and set the output path in CLAUDE.md:

```yaml
metrics_output_dir: "./_metrics/"
```

### Raw Log — Full Audit Trail

"What did you check before saying YOSHI?" Raw logs record **every action** an agent took — every file read, every edit with the full diff, every command with its output, and every decision with its reasoning.

```markdown
### [09:41:03] Edit src/checks/inbound.js:31
```diff
+ /\b(?:Invoke-Expression|IEX)\s*[\s(]/i,
+ /\bStart-Process\b/i,
```

### [09:41:05] Bash node -e "const {CHECKS}..."
```
IN-002 patterns: 16
```
exit: 0
```

Logs are generated **after work is complete** (not during execution) by cross-referencing `git diff` with agent-reported actions. No runtime overhead — just a full record when you need it.

Enable `raw_log` in your config (ON in `full` preset):

```yaml
shitsuke:
  raw_log: true
```

<details>
<summary>Full sample output →</summary>

See [logs/raw-raw-log-module-20260314.md](logs/raw-raw-log-module-20260314.md) for a real example — the raw log generated from adding this module itself.

Includes: every file edit with full diff, bash commands with output, decision rationale, and git diff cross-check.

</details>

### Audit Trail — Development Audit Evidence

"Can you prove who approved what, and when?" The audit trail module records four types of structured evidence that persist beyond conversation context:

| Record | What it captures | File |
|--------|-----------------|------|
| **Traceability matrix** | Requirement → Design → Commit → Test | `audit/{project}_traceability.md` |
| **Approval log** | Who approved what, when, and why | `audit/{project}_approvals.md` |
| **Change ledger** | Scope changes with reason and impact | `audit/{project}_changes.md` |
| **Audit summary** | Consolidated view of all evidence | `audit/{project}_audit-report.md` |

Traceability uses REQ-IDs assigned during task decomposition. Each requirement is tracked from definition through implementation and test verification:

```markdown
| ID | Requirement | Commit | Test | Status |
|----|-------------|--------|------|--------|
| REQ-001 | User auth | abc1234 | test_auth.py:TestLogin | VERIFIED |
| REQ-002 | Data export | — | — | PENDING |
```

Approval records capture what currently vanishes in conversation context — review verdicts, design sign-offs, and commander approvals, all with timestamps and basis.

Need logs after the fact? The rebuild feature reconstructs audit records from git history, result reports, and raw logs — so "where did that file go?" and "who approved this?" are always answerable:

```
Approval log rebuild:   result/ + raw-log + git history → approvals_rebuilt.md
Traceability rebuild:   plans/ + git log + test files   → traceability_rebuilt.md
File tracking:          git log --follow + _deleted/    → full rename/delete history
```

Enable `audit_trail` in your config (ON in `full` preset):

```yaml
shitsuke:
  audit_trail: true
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

| Mode | What it solves | Agents needed? | Plan |
|------|---------------|----------------|------|
| **koneko** | Quality on a budget | 1 (lightweight reviewer) | PRO |
| **quality** | Self-review, unverified "done" | 1 (reviewer) | MAX 5+ |
| **implement** | Large multi-file changes | 2 (manager + worker) | MAX 5+ |
| **plan** | Complex task decomposition | 1 (general) | MAX 5+ |
| **security** | Accidental deletion, unsafe operations | None (rules only) | Any |

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

#### When Light Is Enough

Typo fixes, comment edits, log message changes, CSS tweaks, test renames, config value updates, dependency version bumps, README edits, import reordering, dead code removal.

#### When to Use Standard or Higher

Database migrations, new API endpoints, authentication changes, file deletion logic, multi-service integration, deployment config, permission/access control, data model changes.

If in doubt, start light — agents will escalate if they spot risk (ESCALATION-001).

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
| Quality trends | No visibility until something breaks | **Metrics track** gate pass rate, skip rate, review cycles |

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

#### Where Neko Gundan Loses

Being honest about trade-offs:

| Dimension | Neko Gundan loses to | Why |
|-----------|---------------------|-----|
| **Role variety** | VoltAgent, wshobson/agents | We have 4 roles. They offer 100+. If you need a specialized "data analyst" or "DevOps" agent, look there |
| **Flow flexibility** | LangGraph, CrewAI | We enforce a fixed hierarchy (general → manager → worker → reviewer). If you need arbitrary DAG workflows, code-based frameworks win |
| **Lightweight speed** | Standard Claude Code subagents | Any framework adds overhead. For quick one-off tasks, raw subagents are faster and cheaper |
| **Language/runtime support** | Code-based frameworks | We're Claude Code only. They support multiple LLM providers and runtimes |

We optimize for one thing: **proof that the work is correct**. If that's not your bottleneck, simpler tools are better tools.

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

## Case Studies

Real examples from projects using Neko Gundan (details anonymized).

<details>
<summary>Case A: Adding authentication — how a platoon-scale task flows</summary>

**Task:** Add user authentication to a web dashboard (new API endpoints + UI + DB changes).

**What happened:**
1. Oyakata-neko assessed: 5 files, DB migration, new API — platoon scale (standard weight)
2. DB design gate caught a missing index on `users.email` before any code was written
3. Shigoto-neko split work: genba-neko A (API + DB), genba-neko B (UI components)
4. Race prevention: API routes assigned to A, React components to B — no file overlap
5. Kurouto-neko review found a session token stored in localStorage (security risk) — sent back for fix
6. Second review cycle: PASS. Total: 2 review cycles, 0 human interventions

**Without the framework:** The localStorage issue would likely have shipped. A single agent reviewing its own auth implementation tends to miss the same security assumptions it made while writing.

</details>

<details>
<summary>Case B: "Just a config change" that wasn't — process weight escalation</summary>

**Task:** "Update the database connection config, light mode."

**What happened:**
1. Started as light weight (config value update — should be simple)
2. Genba-neko discovered the config change required a DB migration (schema version bump)
3. Filed ESCALATION-001: Light → Standard, reason: "DB migration affects 3 tables"
4. Shigoto-neko approved. Full gates activated — migration tested with rollback verification
5. Completion gate caught an issue: migration worked forward but rollback dropped a column with data

**Without the framework:** "Config change" → quick edit → deployed → migration fails in production → manual rollback → data questions. The escalation protocol turned a potential incident into a clean, verified change.

</details>

<details>
<summary>Case C: Gate catches a silent breakage</summary>

**Task:** Refactor utility functions across 4 files (standard weight).

**What happened:**
1. Genba-neko completed the refactor. All target files updated, code looked clean
2. Completion gate item #2: `git diff` check — revealed an unintended change in an unrelated test file (auto-import rewrite by the editor)
3. Gate status: FAIL. Genba-neko reverted the unintended change
4. Second gate pass: PASS. The unrelated test file was confirmed unchanged

**Without the framework:** The extra diff would have been committed silently. It might have been harmless — or it might have broken a test that someone else was depending on. The gate caught it in 30 seconds; debugging it later would have taken much longer.

</details>

## Trade-offs

**You are still the boss.** Neko Gundan adds AI-to-AI review, but it does not replace human judgment. The reviewer agent and the implementer agent share the same model family, so they can share the same blind spots. Evidence gates (`npm test`, `git diff`) catch mechanical errors, but architectural decisions and business logic still need a human's final call. Think of it as "better first draft" — not "no review needed."

**More agents = more tokens.** A platoon-scale task (3 agents) uses roughly 2-3x the tokens of doing it solo. Use [Process Weight](docs/process-weight.md) to keep costs in check — say "light mode" for quick fixes so you skip the full ceremony.

**What you gain vs. what you spend:**

| You spend more on | You spend less on |
|---|---|
| Tokens (2-3x at platoon scale) | Debugging agent-introduced bugs |
| Initial response time | Recovering from accidental file deletion |
| Prompt complexity in `.claude/` | Re-reviewing "completed" work that wasn't actually verified |
| Learning the mode/weight system | Figuring out what went wrong after a bad change |

The safety rules (`security` mode) cost almost nothing — they're prompt rules, not extra agent calls. Start there if you want the safety net without the token cost.

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
- The foundational idea — multi-agent orchestration with Claude Code — came from [this article by おしお](https://zenn.dev/shio_shoppaize/articles/5fee11d03a11a1)
- Inspired by the [Shigoto-neko / Genba-neko](https://dic.nicovideo.jp/a/%E4%BB%95%E4%BA%8B%E7%8C%AB) internet meme characters
- Review protocol inspired by [takt](https://www.npmjs.com/package/takt) orchestration tool
- Reflexion pattern from [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366)
