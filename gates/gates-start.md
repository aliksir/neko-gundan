# Start Gate Definitions

> Read this file with the `Read` tool at task start. Never execute gates from memory.

---

## Nano Start Gate (Recon — 2 items)

For recon tasks (questions, research, single-file checks). Takes 10 seconds.

| | Check | How |
|---|-------|-----|
| [ ] | **Identify target** | What project, what scope? Cross-project → mark `[cross-project]` |
| [ ] | **Confirm deliverable** | What does the commander want? (answer? file change? record?) |

### Execution
1. Confirm the 2 items mentally (no file output required)
2. If the target is tied to a project, `git status` is recommended
3. If investigation reveals this is squad-scale or above, upgrade immediately

### Upgrade Rules (Mandatory)

**Even if started as nano, upgrade to mini start gate or above the moment development, modification, config change, or file creation occurs.**

#### Mechanical Upgrade Criteria

Auto-upgrade when any condition is met:

| Condition | Upgrade to |
|-----------|-----------|
| 3+ files changed AND includes design decisions | Platoon |
| Includes DB / API / architecture changes | Platoon |
| 6+ files changed | Battalion |

**Timing**: Judge at planning when impact scope is identified. Re-judge immediately if scope expands during implementation.

**On upgrade, do these BEFORE writing any code:**
1. Create `plans/YYYYMMDD_{task}.md` (scope + success criteria)
2. Create `checklist/YYYYMMDD_{task}.md` (work items)
3. Then start implementation
4. Create `result/YYYYMMDD_{task}.md` at completion

**"Code first, docs later" is prohibited. Plan first, code second.**
Even when an external review (e.g. Codex) already provides a fix list, transcribe it as scope in the plan before starting.

### Artifact Scaling Rules (Mandatory)

**Artifacts scale with task size. Don't create more than needed.**

| Scale | Required artifacts | Count |
|-------|-------------------|-------|
| Recon | None | 0 |
| Squad | plans + result + designs + test-plan | 4 |
| Platoon+ | All 9 (plans/designs/checklist/test-plan/audit/logs/result/metrics/whiteboard) | 9 |

- Squad: designs/test-plan can contain "No design needed" / "No tests needed" + reason. The file itself is required
- Platoon+: All 9 required. `commit-guard` blocks commits missing the core 6 (plans/designs/test-plan/audit/logs/result)

**Use the same `{task}` name across all artifacts for 1-to-1 correspondence.**

- Naming: `YYYYMMDD_{task}` across all artifacts
- Even when processing multiple tasks in one session, **create separate artifact sets** (never merge into one report)
- A plan without a report (or vice versa) is inconsistent. They must exist as a pair
- **Metrics go in a separate cumulative file**, not in the report. The report links to metrics only

### Artifact Completion Timing (No Backfilling)

**"Create template at start → scramble to fill before commit" is prohibited. Each artifact must be complete at its phase boundary.**

| Artifact | Complete by | Checkpoint |
|----------|-----------|-----------|
| Plan | **Start gate completion** (before work) | No plan = code doesn't exist |
| Checklist | **Plan creation** (before work) | List work + QA items before starting |
| Design doc | **Design phase completion** (before impl) | Implementation starts after design review |
| Test plan | **Design completion** (before impl) | Create test matrix skeleton with design |
| Audit log | **Incrementally at each phase** | Record approvals, scope changes as they happen |
| Raw log | **Incrementally during work** | Record Read/Edit/Bash actions as they happen |
| Report | **Before completion gate** | Aggregate all phase results |
| Metrics | **At completion gate** | Append task row + recalculate summary |

**Principle: Everything except report and metrics should be complete at phase boundary, not just before commit.**

---

## Mini Start Gate (Squad — 7 items)

Record **evidence** (command output or summary) for each item.

| | Check | How |
|---|-------|-----|
| [ ] | **git status / git log** | Run `git status` + `git log --oneline -5` in the project directory |
| [ ] | **Purpose check** | Read `Purpose/{project}.md`. New project with no file → record `[new]` |
| [ ] | **Impact scope** | List files and features that will change |
| [ ] | **Task type + workflow** | Determine task type from the request, load the matching workflow. See "Task Type Routing Table" below. No match → `[N/A]` |
| [ ] | **Create plan** | Write plan in `plans/YYYYMMDD_{project}.md` (scope, steps, success criteria) |
| [ ] | **Create checklist** | Write work + QA items in `checklist/YYYYMMDD_{project}.md` |
| [ ] | **Create artifact templates** | Create the following 2 template files (content filled in later phases): |
|     |  | `designs/YYYYMMDD_{project}.md` — Design direction, changes, rationale |
|     |  | `test-plan/YYYYMMDD_{project}.md` — Test targets and matrix skeleton |

### Task Type Routing Table

Auto-determined from request keywords. Manual `/route` is not required (but OK to use).

| Task type | Keywords | Workflow |
|-----------|----------|----------|
| Bug fix | bug, error, broken, test failing, not working, fix | `bug-fix` |
| New feature | add, implement, create, new | `new-feature` |
| Refactoring | refactor, clean up, duplicate, DRY | `refactor` |
| Security audit | security, vulnerability, audit | `security-audit` |
| Research | investigate, how, why, compare, research | `research` |
| Documentation | docs, README, doc | `new-feature` (skip implementation) |

**Gates vs Workflows**: Gates = what to check (checklist). Workflows = how to proceed (procedure). Apply both.

### Execution
1. **Force Read**: Read this file first
2. **Fixed order**: Complete top to bottom. Record "**7 of 7 items checked (PASS: X, N/A: Y)**" in the plan

---

## Full Start Gate (Platoon+ — 12 items)

**Run immediately upon receiving a development/modification request. No exceptions, even for continued sessions.**
**Plans (plans/) and reports (result/) are mandatory for all tasks.**

Record **evidence** (command output or summary) for each item.

| | Check | How |
|---|-------|-----|
| [ ] | **git status / git log** | Run `git status` + `git log --oneline -5` in the project directory |
| [ ] | **handover.md check** | Read if exists. If not → `[N/A]` |
| [ ] | **dev-lessons search** | `Grep pattern="[project-name]"` + tech tags. Review matching lessons' action items |
| [ ] | **Purpose check** | Read `Purpose/{project}.md`. New project → record `[new]` (create during planning) |
| [ ] | **Archived files check** | `ls {project}/_deleted/` |
| [ ] | **Task type + workflow** | Determine task type, load matching workflow. See mini start gate's routing table. No match → `[N/A]` |
| [ ] | **Create whiteboard (mandatory)** | Check `whiteboard/whiteboard-{project}*`. Reuse existing or create new (WHITEBOARD-001 template). Cannot skip |
| [ ] | **Create plan** | Write plan in `plans/YYYYMMDD_{project}.md`. Include scope, steps, success criteria |
| [ ] | **Create checklist** | Extract work + QA items from plan → `checklist/YYYYMMDD_{project}.md` |
| [ ] | **Create artifact templates** | Create the following 5 template files (content filled in later phases): |
|     |  | `designs/YYYYMMDD_{project}.md` — Design direction, changes, rationale |
|     |  | `test-plan/YYYYMMDD_{project}.md` — Test targets and matrix skeleton |
|     |  | `audit/YYYYMMDD_{project}.md` — Traceability + approval log + change management |
|     |  | `logs/YYYYMMDD_{project}.md` — Raw log header (date, scale, team) |
| [ ] | **Initialize dashboard** | Write operation overview (What/Why), team (Who), constraints, current state in `status/dashboard.md` |
| [ ] | **Verify all artifacts exist** | `ls plans/ designs/ checklist/ test-plan/ audit/ logs/ whiteboard/ status/dashboard.md` |

### Execution
1. **Force Read**: Read this file first. **Gates executed from memory are invalid**
2. **Fixed order**: Complete items top to bottom, one at a time. Run verification command → record evidence for each
3. **Item count check**: All 12 items. Record "**12 of 12 items checked (PASS: X, N/A: Y)**" in the plan

**Flow**: Start gate → Plan → Design → Design review → Implement → Quality check
- Run DB/API/UI design during design phase (if applicable)
- No DB → record DB design as `[N/A]` and skip
- No API/UI needed → same treatment

---

## Note: neko-* Dynamic Workflows are out of the routing table

Saved Dynamic Workflow run scripts (`neko-*` prefixed `.md` files under the project `.claude/workflows/`) are **OUT of this gate's Task Type Routing Table Read scope**. They are execution engines (JavaScript orchestration), not procedure docs, so the routing table must never Read them as workflows. Delegation decisions about Dynamic Workflows are made via `agents/oyakata-neko.md` §Dynamic Workflows 委譲判断 and `modules/dynamic-workflows.md` (SSOT). Research preview — behavior/commands may change; re-verify at GA.

