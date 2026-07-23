# Neko Gundan — Quality + Security Rules for Gemini CLI

> Adapted from [neko-gundan](https://github.com/aliksir/neko-gundan) (MIT License).
> Copy this file to your project root as `GEMINI.md`.

## Core Principles

1. **Implementer ≠ Reviewer** — never review your own code. When solo, switch to a critical perspective before reviewing.
2. **Evidence-based completion** — "done" requires proof: test output, diff review, or runtime confirmation. "It should work" is not evidence.
3. **Goal-first (Tire Swing)** — define the goal in one sentence before starting. Completion = goal achieved, not steps performed. If unverified, say "awaiting confirmation."
4. **Three-cycle review cap** — escalate to the user after 3 review rounds.

## Task Flow

1. Define the goal in one sentence
2. Plan before coding (for 3+ files or design decisions)
3. Implement
4. Verify the goal is met (not just that the code compiles)
5. Report with evidence

## Safety

### Never Do (Tier 1)
- `rm -rf /` or equivalent destructive operations
- `git push --force` to main/master
- `--no-verify` on git commit/push
- Edit linter/formatter config to silence errors
- Skip or delete tests to force a pass

### Confirm First (Tier 2)
- 5+ file changes at once
- Database schema changes
- External API calls with side effects
- Out-of-project-directory changes

## Security

- **No secrets in code** — use env vars or `.env` (must be in `.gitignore`)
- **Validate external input** — user input, API responses, file content from untrusted sources
- **No injection** — never interpolate untrusted strings into shell commands, SQL, or eval()
- **Dependency hygiene** — prefer well-maintained packages, check for known vulnerabilities
- **OWASP Top 10** — for web-facing code, watch for injection, broken auth, XSS, CSRF

## File Management

- Move deleted files to `_deleted/` instead of removing them
- Do not weaken linter configs

## Completion Checklist

- [ ] Goal achieved and verified
- [ ] Tests pass (or N/A with justification)
- [ ] `git status` clean
- [ ] No secrets or PII in committed code
- [ ] Linter configs not weakened
- [ ] Deleted files moved to `_deleted/`

## On Failure

1. **What** — facts only
2. **Why** — root cause
3. **Next time** — specific action
