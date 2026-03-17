# Case Studies

← Back to [README](../README.md)

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
