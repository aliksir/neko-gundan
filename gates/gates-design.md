# Design & Phase Gate Definitions

> Read this file during the design phase or when executing `/neko-gundan <phase>`.

---

## Planning Gate (Platoon+)

- [ ] **Scope exclusion**: Explicitly state what is NOT in scope
- [ ] **Success criteria (Sprint Contract)**: Write success criteria as checklist items (`- [ ]`). Each must be PASS/FIX binary. **Vague words prohibited** ("good", "appropriate", "sufficient", "clean", "correct", "readable", "efficient", "optimal", "stable", "high-quality", "user-friendly", "problem-free"). Recommended for squad too
- [ ] **Verifiability check**: Each success criterion must have a stated verification method: (a) command output (test/lint/build/grep), (b) file existence/content (ls/Read/Grep), or (c) browser/CLI operation result. Items without verification method → make concrete or delete. "Visual check" is last resort. Recommended for squad too
- [ ] **Plan review**: Request review from kurouto-neko (or non-implementer Opus). REQUEST_CHANGES → fix → proceed to task decomposition only after APPROVE

---

## DB Design Gate (All scales — mandatory when DB changes exist)

**Artifact**: `plans/{project}_db_design.md` (includes ER diagram/schema definition)
**Even small changes (column additions) must pass. Small changes affect future changes.**

| | Check | Aspect |
|---|-------|--------|
| [ ] | **ER diagram / schema definition** | Table structure and relations are documented |
| [ ] | **Normalization** | 3NF or higher. Document reasons for any denormalization |
| [ ] | **Index design** | Indexes defined for major query patterns |
| [ ] | **Naming convention** | snake_case, consistency with existing tables/columns |
| [ ] | **Extensibility** | Impact analysis for future changes (column additions, table splits) |
| [ ] | **Migration** | Impact on existing data, rollback procedure |

**DB review**: Designer != reviewer (per review-protocol).

---

## API/UI Design Gate (When applicable)

Start after DB design review passes. API and UI design can run in parallel.

| | Check | Aspect |
|---|-------|--------|
| [ ] | **Endpoint / screen list** | All required APIs and screens identified |
| [ ] | **DB design alignment** | DB schema and API/UI data flow are consistent |
| [ ] | **Review passed** | Designer != reviewer confirmed |

---

## Pre-Execution Fact-Check Gate (For irreversible actions)

**Applies to**: Social media posts, git push (public repos), external API calls with side effects, package publishing, etc.

| | Check | How |
|---|-------|-----|
| [ ] | **Action method** | Check if the action dispatch table specifies a required method for this type of action |
| [ ] | **Fact verification** | Verify objective facts (versions, numbers, URLs, names) against source files. **Never fill from LLM memory** |
| [ ] | **Draft presentation** | Present public-facing content with fact-check results to commander for approval |

Unknown facts → ask the commander, don't guess. "Probably correct" is not acceptable.

---

## Module Addition Gate (When adding modules/protocols to neko-gundan)

"Writing a document != deployment complete." Pass all of the following.

| | Check | Content |
|---|-------|---------|
| [ ] | **Module document created** | Protocol definition in `modules/` or `docs/` |
| [ ] | **Behavior flow integration** | Incorporated into target agent's action steps, added to `agents/*.md` |
| [ ] | **Gate reflection** | Added as verification item to start/completion gates (if applicable) |
| [ ] | **SSOT declared** | Source of truth location is explicitly stated |
| [ ] | **git commit** | Committed as module deployment completion |

---

## Phase-Specific Gates (For `/neko-gundan <phase>`)

> Used when executing phases independently.
> For full end-to-end flow (no arguments), use the regular nano/mini/full start and completion gates.
> Templates in `templates/` for reference (exact format match not required).

---

### Design Start Gate (4 items)

| | Check | How |
|---|-------|-----|
| [ ] | **Identify target project** | Which project? New → `[new]`. Existing → read `Purpose/{project}.md` |
| [ ] | **Verify design inputs** | Is all information needed for design available (verbal/docs/URLs)? Ask commander if missing |
| [ ] | **Check existing designs** | `ls plans/{project}_* designs/{project}_*` for existing plans/designs. Decide: add/update, not overwrite |
| [ ] | **Create design template** | Create `designs/YYYYMMDD_{project}.md` (direction, changes, rationale skeleton) |

### Design Completion Gate (5 items)

| | Check | How |
|---|-------|-----|
| [ ] | **Plan exists** | Plan in `plans/` with scope, success criteria, and exclusions |
| [ ] | **Design doc complete** | `designs/YYYYMMDD_{project}.md` has direction, changes, rationale. No design → record reason (file required) |
| [ ] | **Required designs done** | DB/API/UI design — all needed ones complete. Unneeded → `[N/A]` |
| [ ] | **Test plan determined** | Will verification occur during this task (script execution, CLI output, browser check, build, etc.)? **Yes**: create test matrix skeleton in `test-plan/` (ID, feature, aspect, expected result). **Abnormal cases required**: matrix must include error cases (invalid input, boundary values, error handling, permission violations, timeouts). Zero abnormal cases → reject as incomplete. **No**: record "No test target" + reason in `test-plan/`. **Decision criteria**: if plan/design mentions "verify", "test", "confirm behavior" → Yes. Pure doc edits / config text changes only → No |
| [ ] | **Design review done** | Designer != reviewer confirmed (per review-protocol) |

---

### Implement Start Gate (4 items)

> Design doc (designs/) is the recommended input. If absent, verify plan has justification for skipping design.

| | Check | How |
|---|-------|-----|
| [ ] | **Design doc exists** | Check `designs/YYYYMMDD_{project}.md`. If exists, Read it. **If not → verify skip justification in next item** |
| [ ] | **Skip justification (only if no design doc)** | Read plan (plans/). **Proceed only if one of these is documented**: (1) doc/config text changes only, (2) human or external AI designed it, (3) within scope of existing design. **No justification → cannot start impl** — return to design phase or ask commander |
| [ ] | **Implementation-ready check** | Plan or design has scope + success criteria? **Neither has them → cannot start** — ask commander |
| [ ] | **git status check** | `git status` in project. Uncommitted changes → WIP commit or stash |

### Implement Completion Gate (4 items)

| | Check | How |
|---|-------|-----|
| [ ] | **Success criteria met** | Verify each criterion in the plan. All must pass |
| [ ] | **Code committed** | `git status` clean or committed |
| [ ] | **Syntax check passed** | Run lint/type check if applicable. Record results as evidence |
| [ ] | **Live functionality test** | Test execution, CLI run, browser check, etc. Record evidence. No test target → `[N/A]` with reason |

---

### Review Start Gate (3 items)

> The reference source (prerequisite file) depends on what's being reviewed.

| | Check | How |
|---|-------|-----|
| [ ] | **Identify review target** | Plan / design doc / code — which one? Target type determines reference source |
| [ ] | **Load reference source** | Plan review → no reference / Design review → read plan (if exists) / Code review → read design (if exists) |
| [ ] | **Target readability** | Target files are accessible via `Read` / `git diff` |

### Review Completion Gate (3 items)

| | Check | How |
|---|-------|-----|
| [ ] | **Reference source stated** | Report states: plan review → "Reference: none" / design review → "Reference: plans/XXX.md" / code review → "Reference: designs/XXX.md". If no reference, state so |
| [ ] | **Review report output** | Verdict (APPROVE/REQUEST_CHANGES) + findings are explicit |
| [ ] | **Judgment rationale** | Each finding includes file path, line number, specific issue |

---

### Test Start Gate (3 items)

| | Check | How |
|---|-------|-----|
| [ ] | **Identify test targets** | Project name, scope, test types are clear |
| [ ] | **Code exists** | Target directory has implemented code |
| [ ] | **Test plan created/approved** | Test plan with matrix (feature x aspect) created and presented to commander for approval |

### Test Completion Gate (5 items)

| | Check | How |
|---|-------|-----|
| [ ] | **All unit tests executed** | Test matrix normal + abnormal cases all run (no `[ ]` remaining). **Zero abnormal cases → reject as test plan deficiency** |
| [ ] | **All integration tests executed** | Integration scenarios all run. Must include abnormal scenarios (error propagation, partial failures) |
| [ ] | **Test execution evidence** | Record pass/fail counts, coverage, command output |
| [ ] | **Quality check results** | Lint/security scan results (if run). Not run → `[N/A]` with reason |
| [ ] | **Failed items listed** | If any fail/warning/vulnerability, list them. All pass → record "All PASS" |
