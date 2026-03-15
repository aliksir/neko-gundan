# Completion Gates

Quality checkpoints that must be passed before declaring any task complete. No exceptions, even for single-line changes.

## Nano Start Gate (Recon / All Scales)

Every request — not just platoon+ — goes through at least a nano gate. Takes 10 seconds.

| # | Check | How to verify |
|---|-------|---------------|
| 1 | **Target identified** | What project/topic? If cross-project, note `[cross-project]` |
| 2 | **Desired output confirmed** | What does the commander want? (answer? file change? record?) |

- No file output required — mental confirmation is sufficient
- Pure greetings/chat are exempt — **but** if chat leads to a request ("look into this", "add that"), escalate immediately

### Escalation Rules (Mandatory)

**When development, modification, or file changes occur during a nano-gated task, escalate to Squad Start Gate immediately.**

**On escalation, execute these steps IN ORDER (before writing any code):**

1. Create `plans/YYYYMMDD_{task}.md` — write scope + success criteria
2. Create `checklist/YYYYMMDD_{task}.md` — write work items
3. **Then** start implementation
4. Create `result/YYYYMMDD_{task}.md` on completion

**"Code first, plan later" is prohibited.** Plan comes first, code comes second.
Even when an external review (e.g., Codex) already provides a fix list, transcribe it into a plan before starting.

"Started as recon, turned into development? Stop. Write the plan. Then code."

## Start Gate (Before Beginning Work — Squad+)

Execute before starting any squad+ mission. The gate is **not complete until all artifacts exist**.

| # | Check | How to verify |
|---|-------|---------------|
| 1 | Task scope is clear | Purpose + success criteria defined |
| 2 | Target files identified | File list exists |
| 3 | No unresolved blockers | Check dashboard/whiteboard |
| 4 | Current state understood | Read target files, `git status` |
| 5 | Plan document created | `plans/{project}_*.md` exists with scope, steps, success criteria |
| 6 | QA/Work checklist created | `checklist/{date}_{project}.md` exists with work items + QA items derived from the plan |
| 7 | Dashboard initialized (Platoon+) | `status/dashboard.md` populated with What/Why/Who/Constraints/Current State |
| 8 | **Artifact existence confirmed** | `ls` confirms plan + checklist (+ dashboard for Platoon+) all exist. **Gate incomplete until all artifacts are present** |

### Artifact Set Rule (Mandatory)

**1 task = 1 matched set.** Plan, checklist, result report, raw log, and audit log must all share the same `{task_name}` and correspond 1:1.

```
plans/20260315_feature-x.md        ← plan
checklist/20260315_feature-x.md    ← checklist
result/20260315_feature-x.md       ← result report
```

- Even when multiple tasks run in one session, create **separate artifact sets per task** (never merge into one report)
- A plan without a matching report (or vice versa) is an inconsistency — fix it before closing

## Pre-Report Checkpoint (All Scales — Unconditional)

**Fires unconditionally before reporting "done" to the commander. Independent of gate scale, escalation state, or task classification.**

The trigger is the act of reporting itself — not a gate decision.

| # | Check | Question |
|---|-------|----------|
| 1 | **Request-result alignment** | Does what I did match what the commander asked? |
| 2 | **Evidence of correctness** | Do I have proof it works/exists? (command output, file check, test result) |
| 3 | **Artifact status** | Are plan/checklist/report needed? If yes, do they exist? |

Mental confirmation only — no file output required. But if #3 reveals missing artifacts, create them before reporting.

"Don't say YOSHI until you've actually looked."

---

## Completion Gate (Before Saying "Done")

Every item must be checked with evidence. "I confirmed it" is not evidence — "Here's the command output showing it works" is.

### Gate Execution Protocol (Mandatory)

1. **Forced Read**: Read this section before starting the gate. **Memory-based gate execution is prohibited.** A gate started without reading the source of truth is invalid.
2. **Sequential execution**: Process items from #1 in order, one at a time. For each item: run verification command → record evidence → move to next. Do not batch-mark items as "done."
3. **Item count check**: Report the total in the result: "**N items checked (PASS: X, N/A: Y)**". If the total doesn't match the expected count, there are missing items.

### Checklist: Created at Planning, Verified at Gate

The task checklist is created at the **start of planning** (not at gate time). See `modules/checklist-export.md` for the template and lifecycle.

At the completion gate, verify:
1. All checklist items are PASS or N/A (no unchecked items remain)
2. The checklist file exists in the configured output directory
3. Task-specific review items have been verified by kurouto-neko (platoon+)

### Gate Items (7 core + module additions)

| # | Check | How to verify | Evidence format |
|---|-------|---------------|--------------------|
| 1 | All success criteria met | Run tests, verify output | Test results / command output |
| 2 | No unintended changes | `git diff` review | Diff output showing only intended changes |
| 3 | Tests pass | Run test suite | Test pass/fail output |
| 4 | No new lint errors | Run linter | Linter output |
| 5 | No uncommitted new files | `git status` | Status output showing clean state |
| 6 | Existing features not broken | Run full test suite or smoke test | Test results |
| 7 | Files not accidentally deleted | Compare with start state | `git status` / file listing |

### Module-Specific Gate Items (When Active)

These items are added to the gate when the corresponding module is enabled in `neko-gundan.config.yaml`.

| # | Module | Check | How to verify | Activation condition |
|---|--------|-------|---------------|---------------------|
| 8 | whiteboard | Whiteboard archived | Move to archive, update dashboard | whiteboard: true |
| 9 | checklist_export | All checklist items PASS/N/A | Checklist file verified, no unchecked items | checklist_export: true |
| 10 | quality_metrics | Metrics updated | Metrics file updated with current task | quality_metrics: true |
| 11 | isv | ISV recorded | Result dimensions filled, appended to ISV log | isv: true |
| 12 | linter_protection | No linter config weakened | Diff shows no linter rule removals | linter_protection: true |
| 13 | reflexion | Failure reflection recorded (if applicable) | Reflexion section in report | reflexion: true AND task had failures |
| 14 | progress_visibility | Dashboard finalized | `status/dashboard.md` has final status, completion %, "Mission: COMPLETE" | Platoon+ AND progress_visibility: true |
| 15 | audit_trail | Audit trail recorded | Traceability: all REQs VERIFIED or DEFERRED. Approvals: all reviews logged. Changes: all scope changes logged. Summary: generated (platoon+) | audit_trail: true |
| 16 | test_plan | Test plan completed | Test plan matrix exists, all unit test items (normal + abnormal) and integration test items checked. `[N/A]` if no code changes (docs/config only) | Test phase was executed (manually or via `/neko-gundan test`) |

> **Total item count** = 7 (core) + active module items. Verify your count matches `neko-gundan.config.yaml` active modules.

## Process Weight Variants

Completion gate scope varies by process weight (see `modules/process-weight.md`):

| Weight | Gate Scope | Review |
|--------|-----------|--------|
| **Light** | Quick gate: items #1, #2, #5 only (tests pass + no unintended diff + clean state) | Self-check allowed |
| **Standard** | Full gate: all core items (#1-#7) + active module items | Independent reviewer required |
| **Strict** | Full gate + ensemble judge + mandatory ISV | Independent reviewer + ensemble |

Default is **Standard** unless specified otherwise.

### Light Mode and Review Protocol

Light mode allows self-check as an **exception** to the "implementer ≠ reviewer" principle (see `rules/review-protocol.md`).
This exception applies ONLY to Light mode. Standard and Strict modes enforce independent review without exception.

Light mode includes automatic escalation (ESCALATION-001): if the task turns out to be more complex than expected,
the process weight is upgraded to Standard, and independent review becomes mandatory.

## Gate Evidence Format

Record gate results in a table:

```markdown
| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Success criteria | PASS | `npm test` output: 42 passed, 0 failed |
| 2 | No unintended changes | PASS | `git diff` shows only 3 target files |
| ... | ... | ... | ... |
```

## Rules

- All items must be `PASS` or `N/A` (with justification)
- If any item is `FAIL`, fix before declaring complete
- Shigoto-neko executes the gate; kurouto-neko independently verifies
- "I'll check later" is prohibited — check now or don't declare done

## File Deletion Safety

When deleting files:
1. Move to `_deleted/` directory first (never instant-delete)
2. Verify no references to the file remain
3. Next session can confirm and permanently remove
