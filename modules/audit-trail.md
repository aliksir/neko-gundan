# Audit Trail Module

> **Module**: `audit_trail` | **Default**: OFF | **Scale**: Squad+

Records structured audit evidence across the software development lifecycle: requirements traceability, approval records, change management, and audit summary reports.

## Why

Neko Gundan already records process quality (checklists, metrics, ISV) but lacks **audit-ready** evidence:

- **Traceability gap**: No link from requirements → design → commits → tests
- **Approval records vanish**: Review approvals live in conversation context and disappear on compaction
- **Change management is scattered**: Reasons for changes depend on git commit messages alone
- **No consolidated view**: Auditors need a single entry point, not scattered artifacts

This module makes development auditable by persisting structured records in project-local files.

## Configuration

Set the output directory in your project's CLAUDE.md:

```markdown
### 監査証跡出力
- audit_output_dir: /path/to/audit/
```

If not configured, defaults to `{project_root}/audit/`.

## Output Files

One cumulative file per record type per project:

```
{audit_output_dir}/{project_name}_traceability.md   # Requirements traceability matrix
{audit_output_dir}/{project_name}_approvals.md       # Approval log
{audit_output_dir}/{project_name}_changes.md         # Change management ledger
{audit_output_dir}/{project_name}_audit-report.md    # Consolidated audit summary
```

---

## 1. Traceability Matrix

Links requirements to design documents, implementation commits, and test evidence.

### Template

```markdown
# Traceability: {project_name}
Updated: YYYY-MM-DD HH:MM

| ID | Requirement | Design | Commit | Test | Status |
|----|-------------|--------|--------|------|--------|
| REQ-001 | User authentication | plans/auth_design.md | abc1234 | test_auth.py:TestLogin | VERIFIED |
| REQ-002 | Data export | plans/export_design.md | — | — | PENDING |
```

### Status Values

| Status | Meaning |
|--------|---------|
| `PENDING` | Requirement defined, not yet implemented |
| `IMPLEMENTED` | Code committed, test not yet verified |
| `VERIFIED` | Implementation tested and confirmed working |
| `DEFERRED` | Explicitly moved out of scope (with reason) |

### Lifecycle

| When | Who | Action |
|------|-----|--------|
| Task decomposition | Shigoto-neko | Create matrix, assign REQ-IDs from plan's requirements/success criteria |
| Implementation complete | Genba-neko | Fill Commit column (hash + summary) |
| Test complete | Genba-neko | Fill Test column (file:class/function) |
| Completion gate | Shigoto-neko | Verify all REQs are VERIFIED or DEFERRED (with justification) |

### REQ-ID Convention

```
REQ-{NNN}  — Sequential within a project mission
```

REQ-IDs are scoped to a single mission (task batch). Cross-mission traceability uses the audit summary report.

---

## 2. Approval Log

Structured record of all approval decisions. Persists what currently vanishes in conversation context.

### Template

```markdown
# Approvals: {project_name}
Updated: YYYY-MM-DD HH:MM

| Date | Approver | Subject | Type | Verdict | Basis |
|------|----------|---------|------|---------|-------|
| 2026-03-14 16:00 | kurouto-neko | PR implementation | Code review | APPROVE | Rubric 4/4 PASS, confidence: high |
| 2026-03-14 15:30 | oyakata-neko | DB schema v2 | Design review | APPROVE | 6/6 gate items PASS |
| 2026-03-14 15:00 | commander | Plan: auth module | Plan approval | APPROVE | Scope confirmed |
```

### Approval Types

| Type | Who approves | When recorded |
|------|-------------|---------------|
| `Plan approval` | Oyakata-neko / Commander | After plan review |
| `Design review` | Reviewer (≠ designer) | After DB/API/UI design review |
| `Code review` | Kurouto-neko | After code review (APPROVE only — REQUEST_CHANGES not logged as approval) |
| `Gate approval` | Shigoto-neko | After completion gate passes |
| `Commander approval` | Commander (human) | When human explicitly approves |

### Verdict Values

| Verdict | Meaning |
|---------|---------|
| `APPROVE` | Approved to proceed |
| `CONDITIONAL` | Approved with noted conditions (recorded in Basis) |

Only positive verdicts are logged here. Rejections are tracked in the review protocol's normal flow.

### Who Records

| Event | Recorder |
|-------|----------|
| Code review approval | Kurouto-neko appends after issuing APPROVE verdict |
| Design review approval | Reviewer appends after design gate passes |
| Plan/Gate approval | Shigoto-neko appends |
| Commander approval | Oyakata-neko appends when human approves |

---

## 3. Change Management Ledger

Tracks scope changes, design pivots, and process weight escalations with reasons and impact analysis.

### Template

```markdown
# Changes: {project_name}
Updated: YYYY-MM-DD HH:MM

| ID | Date | Change | Reason | Impact | Approver | Status |
|----|------|--------|--------|--------|----------|--------|
| CHG-001 | 2026-03-14 | API auth method: JWT → OAuth2 | Security P1 finding | auth/, api/, tests/ | oyakata-neko | APPROVED |
| CHG-002 | 2026-03-14 | Added caching layer | Performance requirement | cache/, config/ | shigoto-neko | APPROVED |
```

### What Gets Recorded

| Trigger | Change type | Who records |
|---------|------------|-------------|
| Scope change (adding/removing features) | Scope | Shigoto-neko |
| Design pivot after review feedback | Design | Shigoto-neko |
| ESCALATION-001 (process weight upgrade) | Process | Shigoto-neko |
| OBJECTION-001/002/003 accepted | Decision | Shigoto-neko |
| Emergency fix / hotfix | Unplanned | Shigoto-neko |
| Commander's mid-task instruction change | Directive | Oyakata-neko |

### CHG-ID Convention

```
CHG-{NNN}  — Sequential within a project mission
```

### Status Values

| Status | Meaning |
|--------|---------|
| `PROPOSED` | Change requested, not yet approved |
| `APPROVED` | Change approved, implementation may proceed |
| `IMPLEMENTED` | Change applied and verified |
| `REJECTED` | Change rejected (with reason in Impact column) |

---

## 4. Audit Summary Report

Consolidates all audit artifacts into a single entry point for auditors. Generated at the completion gate.

### Template

```markdown
# Audit Report: {project_name} — {mission_summary}
Generated: YYYY-MM-DD HH:MM

## Mission Overview
- **Objective**: [What was built/changed]
- **Duration**: [Start date — End date]
- **Scale**: [Squad/Platoon/Battalion]
- **Process weight**: [Light/Standard/Strict]

## Traceability Summary
- Total requirements: {N}
- VERIFIED: {N} | IMPLEMENTED: {N} | PENDING: {N} | DEFERRED: {N}
- Coverage: {VERIFIED / Total}%
- Full matrix: [link to traceability file]

## Approval Summary
- Total approvals: {N}
- By type: Plan({N}), Design({N}), Code({N}), Gate({N}), Commander({N})
- Full log: [link to approvals file]

## Change Summary
- Total changes: {N}
- APPROVED: {N} | REJECTED: {N}
- Full ledger: [link to changes file]

## Commands & Permissions
| Category | Command/Action | Target | Count |
|----------|---------------|--------|-------|
| Git | git commit | {project} | {N} |
| Git | git push | {remote/branch} | {N} |
| Git | gh pr merge | PR #{N} | {N} |
| External | post_tweet | Tweet ID: {id} | {N} |
| File | Write (new) | {file1, file2, ...} | {N} |
| File | Edit | {file1, file2, ...} | {N} |
| Bash | {command} | {target} | {N} |

> Summarize commands with side effects. Pair with raw log for full details.

## Quality Evidence
- Checklist: [link to checklist file] — {PASS}/{Total} items
- Metrics: [link to metrics file]
- ISV: confidence={0.X}, outcome={0.X}, review_cycles={N}

## Artifacts
| Artifact | Path | Status |
|----------|------|--------|
| Plan | plans/{project}_*.md | Exists |
| Checklist | checklist/{date}_{project}.md | All PASS |
| Traceability | audit/{project}_traceability.md | Complete |
| Approvals | audit/{project}_approvals.md | Complete |
| Changes | audit/{project}_changes.md | Complete |
| Result report | result/{date}_{project}.md | Complete |
| Raw log | logs/raw-*.md | Complete |
| Metrics | metrics/{project}_metrics.md | Updated |
```

### When Generated

Shigoto-neko generates the audit summary as part of the completion gate, after all other gate items are checked.

---

## Scale Variants

| Scale | Traceability | Approvals | Changes | Commands | Summary |
|-------|-------------|-----------|---------|----------|---------|
| **Squad** | Lite (REQ-ID + commit only, no design column) | Review approvals only | On scope change only | Required | Skip |
| **Platoon** | Full | Full | Full | Required | Full |
| **Battalion** | Full | Full | Full | Required | Full |

### Squad Lite Traceability

```markdown
| ID | Requirement | Commit | Test | Status |
|----|-------------|--------|------|--------|
| REQ-001 | Fix auth bug | abc1234 | test_auth.py | VERIFIED |
```

No design column (squad tasks rarely have separate design docs).

---

## 5. Log Reconstruction (Rebuild)

Reconstructs audit logs after the fact — from git history, existing artifacts (plans/, result/, checklist/, logs/), and project files.

### Use Cases

| Scenario | What to rebuild | Primary data source |
|----------|----------------|-------------------|
| "Where did that file go?" | File history | `git log --follow --diff-filter=D`, `_deleted/` |
| "Who approved this change?" | Approval log | `result/*`, `git log --grep="APPROVE"`, raw logs |
| "What requirements did this task cover?" | Traceability | `plans/*`, `git log`, test files |
| "Why was the scope changed?" | Change ledger | `git log`, `result/*`, whiteboard archives |
| "Give me the full audit for task X" | Audit summary | All of the above, aggregated |

### Reconstruction Procedure

#### Approval Log Rebuild

```
1. Search result reports:  Grep "APPROVE|PASS|承認" in result/{project}*.md
2. Search raw logs:        Grep "APPROVE|verdict" in logs/raw-*{project}*.md
3. Search git history:     git log --grep="review" --grep="APPROVE" --all-match -- {project}/
4. Search whiteboards:     Grep "APPROVE|承認" in whiteboard/whiteboard-{project}*.md
5. Aggregate into approval log template (deduplicate by date + subject)
```

#### Traceability Rebuild

```
1. Read plan:              plans/{project}_*.md → extract requirements/success criteria
2. Assign REQ-IDs:         Sequential from plan items
3. Find commits:           git log --oneline -- {project}/ → match to requirements by message
4. Find tests:             Glob "{project}/**/test_*" or "**/*_test.*" → match to requirements
5. Verify status:          Run tests or check last CI result
6. Output traceability matrix
```

#### Change Ledger Rebuild

```
1. Compare plan vs result: Diff scope sections of plans/ and result/ for the project
2. Search for pivots:      Grep "ESCALATION|OBJECTION|scope|変更" in whiteboard/result/logs
3. Check git history:      git log --oneline -- {project}/ → identify non-trivial scope changes
4. Output change ledger with CHG-IDs
```

#### File Tracking ("Where did it go?")

```
1. git log --all --full-history -- "**/filename"     → full history including renames
2. git log --diff-filter=D -- "**/filename"           → when it was deleted
3. ls {project}/_deleted/                             → check safety archive
4. git log --follow -- "path/to/file"                 → track through renames
```

### Rebuild Output

Reconstructed logs are output to the same `audit/` directory as regular logs, with a `_rebuilt` suffix:

```
audit/{project}_approvals_rebuilt.md
audit/{project}_traceability_rebuilt.md
audit/{project}_changes_rebuilt.md
```

If the original file exists, the rebuild is saved separately (never overwrites). The user decides whether to merge or replace.

### Limitations

- Conversation context is lost after compaction — reconstructions from git/files may be incomplete
- Approval verdicts not recorded in result reports or raw logs cannot be recovered
- This is why recording at the time of action (the normal flow) is always preferred

---

## Completion Gate Item

When this module is active, add to the completion gate:

| # | Check | How to verify | Activation condition |
|---|-------|---------------|---------------------|
| 15 | Audit trail recorded | Traceability: all REQs VERIFIED or DEFERRED. Approvals: all reviews logged. Changes: all scope changes logged. Summary: generated (platoon+) | audit_trail: true |

---

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | Task decomposition (pre-dispatch) | Create traceability matrix with REQ-IDs from plan requirements |
| shigoto-neko | During work (on scope/design changes) | Append to change management ledger |
| shigoto-neko | Completion gate | Verify all REQs VERIFIED/DEFERRED, generate audit summary (platoon+) |
| kurouto-neko | Post-review (APPROVE verdict) | Append to approval log |
| genba-neko | Post-work (completion report) | Include commit hashes and test references for traceability |
| oyakata-neko | On commander approval / directive changes | Append to approval log / change ledger |
| oyakata-neko / shigoto-neko | On rebuild request | Execute reconstruction procedure, output to `audit/{project}_{type}_rebuilt.md` |
