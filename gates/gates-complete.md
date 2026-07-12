# Completion Gate Definitions

> Read this file with the `Read` tool before reporting completion. Never execute gates from memory.

---

## Pre-Report Checkpoint (All scales — unconditional)

**Regardless of gate scale or upgrade status, pass this before reporting "done" to the commander.**

Triggers on the act of "about to report", not on scale classification.

| # | Check | Question |
|---|-------|----------|
| 1 | **Request ↔ result match** | Check each success criterion in the plan one by one — all must be PASS or N/A. If no plan (recon), re-read the commander's request, list requirements, confirm each. **"Roughly matches" is prohibited — judge PASS/FAIL per item** |
| 2 | **Evidence of working** | Show proof it "works/exists", not just "I did it". Acceptable: command output / test results / `ls` file existence / screenshot / browser check. **"Should work because I changed it" is not evidence**. **For config changes**: evidence is the **verification output** (e.g. curl 200, nslookup showing new IP), not the change command itself. See `rules/post-change-verification.md` |
| 3 | **Artifact bulk check** | Run `artifact-check.sh {project}` to mechanically verify all required artifacts exist. Create any missing ones before reporting. **Script execution required, not mental check** |
| 4 | **Plan/checklist completion** | `grep "- \[ \]" plans/YYYYMMDD_{task}.md checklist/YYYYMMDD_{task}.md` to detect unchecked items. If actually done → update to `- [x]`. If not done → record skip reason. **Even when oyakata-neko worked directly, no exceptions** |
| 5 | **Project list update** | New project → add to project registry. Existing → update version info |

#1-2: mental check OK. **#3: script execution required** (mental-only is invalid). **#4: grep execution required**. #5: execute based on new/existing status.

---

## Mini Completion Gate (Squad — 14 items)

Record **evidence** in the report for each item. Evidence-free checks are invalid.

| # | Check | How |
|---|-------|-----|
| 1 | **Checklist execution** | Verify each item in `checklist/YYYYMMDD_{project}.md` |
| 2 | **git status check** | `git status` — clean or committed |
| 3 | **Live functionality test** | Actually run the implemented feature. Record command + output. **For config changes**: verify change → apply (restart/reload) → **confirm the goal is achieved** (not just "config is in place"). Delayed checks (cron/DNS) → record in handover. `[N/A]` only when: docs-only with **zero code AND zero config changes**. Config changes with remote access (SSH etc.) → N/A prohibited |
| 4 | **Design review** | Designer != reviewer. Review the design doc (Sonnet+). `[N/A]` only when ALL of: (a) zero new files AND (b) zero interface changes AND (c) zero dependency additions. Any one doesn't apply → review required |
| 5 | **`/simplify`** | Run on changed files (someone other than the implementer) |
| 6 | **Design doc completion** | `designs/YYYYMMDD_{project}.md` has content (not empty template). No design needed → record reason (file required) |
| 7 | **Test plan completion** | `test-plan/YYYYMMDD_{project}.md` has content. No tests needed → record reason (file required) |
| 8 | **Metrics update** | Append task row to `metrics/{project}_metrics.md` + recalculate summary. **Report links to metrics, doesn't include them** |
| 9 | **Purpose update** | Update if features were added. No change → `[N/A]` |
| 10 | **All artifacts confirmed** | `ls plans/ designs/ checklist/ test-plan/ result/ metrics/` — verify existence |
| 11 | **Project list updated** | Pre-report checkpoint #5 completed? New → added. Existing → version updated |
| 12 | **Report honesty** | Disclose any unchecked items. Record intervention_count in the report |
| 13 | **neko-kensa automated check** | For tasks with code changes: run `neko-kensa lint` + `neko-kensa deps`, record results in report. code-graph not indexed or unsupported language → `[N/A]`. Docs-only changes → `[N/A]` |
| 14 | **Procedure creation judgment** | Should this work be proceduralized? 3 criteria: done 2+ times OR will recur / steps are non-obvious. If yes → create in `procedures/` or record as future task. If a procedure was used → confirm `execution-log.md` is updated. Not applicable → `[N/A]` |

### Execution
1. **Force Read**: Read this file first
2. **Fixed order**: Complete #1 through #14. Record "**14 of 14 items checked (PASS: X, N/A: Y)**" in the report

---

## Full Completion Gate (Platoon+ — 22 items)

### Execution (Mandatory)
1. **Force Read**: Read this file first. **Gates executed from memory are invalid**. Gates started without Read are void
2. **Fixed order**: Complete #1 through #22, one at a time. Run verification → record evidence. Don't batch-mark as "done"
3. **Item count check**: All 22 items. Record "**22 of 22 items checked (PASS: X, N/A: Y)**" in the report. If total != 22, something is missing

Record **evidence** in the report for each item. Evidence-free checks are invalid.

| # | Check | How |
|---|-------|-----|
| 1 | **Checklist execution** | Verify items in `checklist/YYYYMMDD_{project}.md` via Read/Grep/tests |
| 2 | **git status check** | `git status` — clean or committed |
| 3 | **Live functionality test** | Actually run the feature. Record command + output. `[N/A]` only when: (a) docs-only with zero code changes OR (b) config-only with no local runtime. **If neither applies, N/A is prohibited** |
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
| 20 | **neko-kensa automated check** | For tasks with code changes: run `neko-kensa lint` + `neko-kensa deps` + `neko-kensa dead` (with entry points), record results in report. code-graph not indexed or unsupported language → `[N/A]`. Docs-only → `[N/A]` |
| 21 | **Procedure creation judgment** | Should this work be proceduralized? 3 criteria: done 2+ times OR will recur / steps are non-obvious. If yes → create in `procedures/` or record as future task. If a procedure was used → confirm `execution-log.md` updated. Not applicable → `[N/A]` |
| 22 | **Item count check** | Verify #1-#21 are all addressed. **Total must be 22 items** |

**Execution responsibility**: Start gate = oyakata-neko. Completion gate = shigoto-neko executes → kurouto-neko verifies.
