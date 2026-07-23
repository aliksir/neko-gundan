# Neko Gundan Conventions for Aider

> From [neko-gundan](https://github.com/aliksir/neko-gundan) (MIT). Copy as `CONVENTIONS.md`.

## Core Rules

- **Implementer ≠ Reviewer.** Never review your own code. Read your changes as if someone else wrote them.
- **Max 3 review cycles.** Escalate to the user if unresolved after 3 rounds.
- **Evidence-based completion.** Every "done" claim needs verifiable evidence (test output, diff, runtime check).
- **Goal-first (Tire Swing).** Define the goal in one sentence before starting. Completion = goal achieved, not steps performed.

## Before Coding

1. Define the goal in one sentence
2. For non-trivial tasks: create a brief plan with scope and success criteria

## Safety

**Never do:**
- `rm -rf` on project/system directories
- `git push --force` to main/master
- `--no-verify` on git commit/push
- Edit linter config to silence errors
- Skip or delete tests to force a pass
- Commit secrets, API keys, or PII

**Confirm with user first:**
- Changes to 5+ files at once
- Database schema changes
- External API calls with side effects

## Security

- No secrets in code — use env vars or `.env` (in `.gitignore`)
- Validate all external input before use
- No string interpolation into shell commands or SQL
- Consider OWASP Top 10 for web-facing code

## Before Declaring Done

- [ ] Goal achieved and verified
- [ ] Tests pass
- [ ] `git status` clean
- [ ] No secrets or PII in commits
- [ ] Linter configs not weakened

## On Failure

1. What happened (facts)
2. Why (root cause)
3. Next time (specific action, not "be careful")
