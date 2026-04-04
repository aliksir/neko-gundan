# Completion Gate Definitions

> Read this file with the `Read` tool before reporting completion. Never execute gates from memory.

---

## Pre-Report Checkpoint (All scales — unconditional)

**Regardless of gate scale or upgrade status, pass this before reporting "done" to the commander.**

Triggers on the act of "about to report", not on scale classification.

| # | Check | Question |
|---|-------|----------|
| 1 | **Request ↔ result match** | Does what you actually did match what the commander asked for? |
| 2 | **Evidence of working** | Do you have proof it "works/exists", not just "I did it"? (command output, file existence, test results) |
| 3 | **Artifact bulk check** | Run `artifact-check.sh {project}` to mechanically verify all required artifacts exist. Create any missing ones before reporting. **Script execution required, not mental check** |
| 4 | **Plan/checklist completion** | `grep "- \[ \]" plans/YYYYMMDD_{task}.md checklist/YYYYMMDD_{task}.md` to detect unchecked items. If actually done → update to `- [x]`. If not done → record skip reason. **Even when oyakata-neko worked directly, no exceptions** |
| 5 | **Project list update** | New project → add to project registry. Existing → update version info |

#1-2: mental check OK. **#3: script execution required** (mental-only is invalid). **#4: grep execution required**. #5: execute based on new/existing status.

---

## Mini Completion Gate (Squad — 12 items)

Record **evidence** in the report for each item. Evidence-free checks are invalid.

| # | Check | How |
|---|-------|-----|
| 1 | **Checklist execution** | Verify each item in `checklist/YYYYMMDD_{project}.md` |
| 2 | **git status check** | `git status` — clean or committed |
| 3 | **Live functionality test** | Actually run the implemented feature and confirm it works as expected. Tests, CLI execution, browser check, etc. Record command and output as evidence. No test target (docs only, etc.) → `[N/A]` with reason |
| 4 | **Design review** | Designer != reviewer. Review the design doc (Sonnet+). If "No design needed" → `[N/A]` |
| 5 | **`/simplify`** | Run on changed files (someone other than the implementer) |
| 6 | **Design doc completion** | `designs/YYYYMMDD_{project}.md` has content (not empty template). No design needed → record reason (file required) |
| 7 | **Test plan completion** | `test-plan/YYYYMMDD_{project}.md` has content. No tests needed → record reason (file required) |
| 8 | **Metrics update** | Append task row to `metrics/{project}_metrics.md` + recalculate summary. **Report links to metrics, doesn't include them** |
| 9 | **Purpose update** | Update if features were added. No change → `[N/A]` |
| 10 | **All artifacts confirmed** | `ls plans/ designs/ checklist/ test-plan/ result/ metrics/` — verify existence |
| 11 | **Project list updated** | Pre-report checkpoint #5 completed? New → added. Existing → version updated |
| 12 | **Report honesty** | Disclose any unchecked items. Record intervention_count in the report |

### Execution
1. **Force Read**: Read this file first
2. **Fixed order**: Complete #1 through #12. Record "**12 of 12 items checked (PASS: X, N/A: Y)**" in the report

---

## Full Completion Gate (Platoon+ — 20 items)

### Execution (Mandatory)
1. **Force Read**: Read this file first. **Gates executed from memory are invalid**. Gates started without Read are void
2. **Fixed order**: Complete #1 through #20, one at a time. Run verification → record evidence. Don't batch-mark as "done"
3. **Item count check**: All 20 items. Record "**20 of 20 items checked (PASS: X, N/A: Y)**" in the report. If total != 20, something is missing

Record **evidence** in the report for each item. Evidence-free checks are invalid.

| # | Check | How |
|---|-------|-----|
| 1 | **Checklist execution** | Verify items in `checklist/YYYYMMDD_{project}.md` via Read/Grep/tests |
| 2 | **git status check** | `git status` — clean or committed |
| 3 | **Live functionality test** | Actually run the feature. Tests, CLI, browser, etc. Record command + output. No test target → `[N/A]` with reason |
| 4 | **Design doc completion** | `designs/YYYYMMDD_{project}.md` has design direction and rationale. No design → record "No design needed" + reason (file required) |
| 5 | **Test plan completion** | `test-plan/YYYYMMDD_{project}.md` matrix fully executed (no `[ ]` remaining). No tests → record reason (file required) |
| 6 | **Audit log completion** | `audit/YYYYMMDD_{project}.md` has traceability (all REQs VERIFIED/DEFERRED), approval records, change management |
| 7 | **Raw log completion** | `logs/YYYYMMDD_{project}.md` has all agent action traces (Read/Edit/Bash/Decision, etc.) |
| 8 | **Metrics update** | Append task row to `metrics/{project}_metrics.md` + recalculate. **Report links to metrics only** |
| 9 | **Purpose update** | Update on feature additions. No change → `[N/A]` |
| 10 | **Invariant check** | Verify all invariants in Purpose file. Not defined → `[N/A]` |
| 11 | **File deletion archival** | `ls {project}/_deleted/`. No deletions → `[N/A]` |
| 12 | **`/simplify`** | Run on changed files (not by the implementing genba-neko). simplify does NOT replace kurouto-neko review |
| 13 | **Kurouto-neko review** | Independent review by Opus agent other than the implementer (per review-protocol) |
| 14 | **Whiteboard archive** | Confirm saved in `whiteboard/` → clear dashboard.md → git commit |
| 15 | **All artifacts confirmed** | `ls plans/ designs/ checklist/ test-plan/ audit/ logs/ result/ metrics/` — verify existence |
| 16 | **ISV record** | Fill result dimensions, append to ISV log. Recon → `[N/A]` |
| 17 | **All checks filled** | Verify #1-#16 have no unchecked items (intermediate verification) |
| 18 | **Project list updated** | Pre-report checkpoint #5 completed? New → added. Existing → version updated |
| 19 | **Report honesty** | Disclose unchecked items. intervention_count must be based on conversation facts |
| 20 | **Item count check** | Verify #1-#19 are all addressed. **Total must be 20 items** |

**Execution responsibility**: Start gate = oyakata-neko. Completion gate = shigoto-neko executes → kurouto-neko verifies.
