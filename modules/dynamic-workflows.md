# Dynamic Workflows Module

> **Module**: `dynamic_workflows` | **Default**: OFF | **Scale**: Platoon+

This module integrates the official Claude Code **Dynamic Workflows** feature (and the `ultracode` effort) into the neko-gundan flow. Unlike modules that absorb ideas from external OSS, this covers the operational integration of a first-party Claude Code feature: **when** to use it, **at what scale/role**, and **how it coexists** with the existing neko-gundan flow.

This file is the canonical **SSOT**. Other files (the YAML module detail and the workflow template) point here.

## 0. Feature Facts (source of truth)

| Item | Detail |
|------|--------|
| What it is | Claude writes a JavaScript script that the runtime executes **locally** in the background, orchestrating sub-agents at scale |
| Where it runs | **Local** (up to 16 concurrent / CPU-bound; 1,000 agents total per run). Consumes the existing subscription usage pool |
| External billing | **None** (this is distinct from any cloud-execution path). It does **not** conflict with an "no external API / zero billing / no data leaving the machine" policy |
| Three launch paths | (1) the keyword `workflow` in a prompt (press `alt+w` to ignore a misfire); (2) `/effort ultracode` (xhigh + auto-orchestration, session-only; `/effort high` reverts); (3) the bundled `/deep-research <question>` |
| Intermediate results | Held in **script variables** (they do NOT consume the orchestrator's context — the key advantage) |
| Convergence | Independent agents adversarially cross-review to self-converge |
| Limits | No user input mid-run / resume within the same session / a fresh session starts from zero |
| Save | `/workflows` -> select run -> `s` -> the project `.claude/workflows/` (with a `neko-` prefix; **neko-gundan fixes saves to the project dir**, see §4) -> becomes a `/<name>` command |
| OFF | `/config` toggle / `disableWorkflows: true` (settings.json) / `CLAUDE_CODE_DISABLE_WORKFLOWS=1` |
| Official doc | https://code.claude.com/docs/en/workflows |

## 1. Four-Way Usage (sub-agent / skill / TeamCreate / Dynamic Workflows)

The neko-gundan scale vocabulary mapped against the four delegation mechanisms. The decision axes (who holds the plan / where intermediate results live / scale) follow the official doc.

| Scale | First choice | Plan holder | Intermediate results | Scale | Workflow handling |
|-------|--------------|-------------|----------------------|-------|-------------------|
| **Recon** (investigation / 1 file) | sub-agent (Explore) / skill | orchestrator context | orchestrator context | 1 agent | Overkill, do not use |
| **Squad** (1-2 files) | skill / shigoto-neko solo | shigoto-neko | shigoto-neko context | 1-2 agents | Not needed |
| **Company** (3-5 files / design judgment) | TeamCreate (oyakata -> shigoto -> genba) | oyakata + shigoto (dashboard) | plan / design / dashboard files | 3-several agents | Conditional (only when §2 applies) |
| **Battalion** (6+ files / large) | TeamCreate (hierarchy required) / **Workflow delegation if §2 applies** | TeamCreate=oyakata/shigoto, WF=JS script variables | TeamCreate=artifact files, WF=script variables | TeamCreate=several-to-dozens, WF=up to 16 concurrent / 1000 total | Delegate under §2 conditions |

### Essential differences between the four

- **sub-agent**: a single independent delegation; the plan is held by the caller (the orchestrator).
- **skill**: a packaged, self-contained reusable workflow; the plan follows the prompt.
- **TeamCreate (neko-gundan)**: a persistent team + a shared task list + **human-readable artifacts**. Review discipline (implementer != reviewer, etc.) works through artifact files. Strong for staged human approval / HITL.
- **Dynamic Workflows**: local JS orchestrating many sub-agents. Intermediate state lives in **script variables** (no orchestrator context cost). Adversarial self-convergence. No input mid-run.

### The one-liner to memorize

> **TeamCreate** = work that needs human mid-step approval + human-readable artifacts.
> **Dynamic Workflows** = exploratory work with no mid-step approval that benefits from massive parallelism + self-convergence.
> The two are **complementary**, not competing.

## 2. Delegation Decision (orchestrator)

Precondition: the feature is ON via `/config`. If it is OFF or not yet rolled out, this section does not apply — fall back to TeamCreate (fail-safe).

### When to "consider" delegating

The scale is **Battalion** (6+ files or large) **AND** one of the following applies (OR; the oyakata-neko makes the final call):

- (a) **cross-codebase audit**: a full-scan style task where no human mid-step approval is needed
- (b) **large mechanical migration**: a high volume of mechanical conversions with a fixed pattern
- (c) **cross-verification research**: where independent agents' adversarial cross-review should drive convergence

### When NOT to delegate (keep TeamCreate)

- Each phase needs the user's / orchestrator's **mid-step approval** (unsuitable: no input mid-run)
- Human-readable **staged artifacts** (plan / design / dashboard) are required for inspection
- **Company scale or below** (overkill)
- **CPU contention**: avoid launching a Workflow while a TeamCreate (shigoto + genba) is running (16 concurrent local agents would starve the CPU and bring both down)

### Constraints to observe when delegating

- Keep in mind: 16 concurrent / 1000 total per run / no input mid-run / resume within the same session
- Intermediate results stay in script variables = the orchestrator's context is not consumed (the advantage)
- If saving after a run, always `/workflows` -> `s` -> the **project `.claude/workflows/`** with a `neko-` prefix (see §4 namespace collision defense)
- Does not conflict with a no-external-API / zero-billing policy (local execution, existing subscription usage pool)

## 3. Review Discipline When Delegating to a Workflow

Core idea: the Workflow's internal adversarial cross-review is a **preliminary screening** — a separate layer from neko-gundan's implementer != reviewer / Adversarial 2nd-Pass / Evidence Level Ladder / 5-phase review.

| Aspect | Inside the Workflow | Correspondence with neko-gundan discipline |
|--------|---------------------|--------------------------------------------|
| Adversarial cross-review | Self-convergence | A **preliminary screening** for the Adversarial 2nd-Pass. Not a final judgment |
| implementer != reviewer | Internal agents are independent, but the final APPROVE owner is ambiguous | The **kurouto-neko reviews run artifacts OUTSIDE the Workflow**. The orchestrator does not double as the final reviewer even after delegating |
| Evidence Level Ladder | Evidence lives in script variables | After the run, dump evidence to result/audit before the kurouto-neko applies the ladder |
| 5-phase review | May run Map -> ... -> Validation internally | Map the WF output onto the 5-phase artifacts and review them |
| Final APPROVE | Not final on the WF alone | The **kurouto-neko reviews the run artifacts OUTSIDE the Workflow and APPROVEs**. This is the only pass judgment |

### Four explicit rules

1. The Dynamic Workflow's internal adversarial review is a "preliminary screening." It does **not** replace neko-gundan's final review (kurouto-neko).
2. Even for battalion work delegated to a Workflow, the **final APPROVE is always performed by a kurouto-neko OUTSIDE the Workflow**. The orchestrator who launched the Workflow doubling as the final reviewer is **explicitly forbidden as an implementer != reviewer violation**.
3. Dump run artifacts to result/audit before they become review targets (the ladder cannot be applied while they remain script variables).
4. The 3-cycle limit and arbitrator escalation apply **OUTSIDE** the Workflow (the neko-gundan review loop). They are counted separately from the Workflow's internal convergence count.

## 4. Namespace Collision Defense (accident prevention)

The home-dir workflow procedure docs (bug-fix / new-feature / refactor / security-audit / research) are **procedure docs (the how-to)** Read by the start-gate routing table. Dynamic Workflow saved scripts use the same `.md` extension but contain JS orchestration — mixing them causes the gate to **mistakenly Read the JS as a procedure doc**.

### Defense (3-point set)

- (i) **Fixed save location**: Dynamic Workflow outputs are saved only under the project `.claude/workflows/` with a `neko-` prefix. They are **never** saved to the home `~/.claude/workflows/` (physically separated from the procedure-doc directory).
- (ii) **Start-gate note**: add a note to the start gate stating that `neko-*` workflows are OUT of the routing table's Read scope, and that delegation is decided per the oyakata-neko's Dynamic Workflows delegation judgment (a naming convention alone is insufficient, because the routing-table logic does not inspect the prefix).
- (iii) **Document the role difference**: clarify the difference between a procedure doc (the how-to) and a Dynamic Workflow (an execution engine) in both the SSOT and the pointers.

## 5. Non-Interference with the Existing Harness

- The review-protocol gains a "review discipline when delegating to a Workflow" section (append-only, no breaking changes). It complements the Adversarial 2nd-Pass / Evidence Level Ladder / 5-phase review.
- The oyakata-neko gains a "Dynamic Workflows delegation judgment" section (append-only). It is orthogonal to the scale-judgment matrix and the formation constraints.
- The start gate gains only an appended note (the routing table itself is not modified).
- Role-corresponds with the 5-phase review (Map -> ... -> Validation).
- It is a separate track from the autonomous loop. An unattended one-shot loop differs from a Workflow's massive-parallel self-convergence.
- The autopilot module (`modules/autopilot.md`) is OUT of scope here; coordination with autopilot is a future task.

## 6. Stocktake / Exit Conditions

Because this is a research preview, behavior, deactivation, or command names may change.

- Re-verify at the preview -> GA migration (saved-WF format compatibility, command names, the effort menu).
- Consider promoting to full operation if the following are observed:
  - Workflow delegation is applied at battalion scale once a month or more.
  - A reusable workflow (see `templates/workflow-template.md`) is used in real runs once a month or more.
  - The context-free nature of Workflow intermediate results actually relieves the length pressure of battalion-scale work.
- If none apply, keep it as a dormant rule (do not delete; reference only).

## 7. References

- Official doc: https://code.claude.com/docs/en/workflows
- Reusable workflow template: `templates/workflow-template.md`
- Related modules: `modules/arbitrator.md` (arbitrator escalation), `modules/review-output.md` (review discipline), `modules/race-prevention.md` (file contention)
