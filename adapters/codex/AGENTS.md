# Neko Gundan — Quality + Security Rules for Codex

> Adapted from [neko-gundan](https://github.com/aliksir/neko-gundan) (MIT License).
> Copy this file to your project root as `AGENTS.md`.

## Core Principles

### 1. Implementer ≠ Reviewer
The person who wrote the code must not review it. When working solo, review your own code from a separate, critical perspective — pretend you are reading someone else's work.

### 2. Evidence-Based Completion
Never declare a task "done" without verifiable evidence. "It should work" is not evidence — test output, diff review, or runtime confirmation is.

### 3. Goal-First (Tire Swing Rule)
Before starting any task, define the goal in one sentence. Completion is judged by whether that goal is achieved, not by whether steps were performed. If you cannot verify the goal yet, report "awaiting confirmation" — not "done."

### 4. Three-Cycle Review Limit
Review loops are capped at 3 cycles. If issues remain after 3 rounds, escalate to the user rather than continuing indefinitely.

## On Every Task

1. **Define the goal** — one sentence, verifiable
2. **Plan before coding** — for non-trivial tasks (3+ files or design decisions), write a brief plan with scope and success criteria
3. **Verify before reporting** — run tests, review the diff, confirm the goal is met

## Safety Tiers

### Tier 1 — Never Do (no exceptions)
- `rm -rf /` or equivalent destructive operations
- `git push --force` to main/master
- `--no-verify` on git commit/push (pre-commit hooks are your last safety net)
- Edit linter/formatter config to silence errors instead of fixing them
- Skip or delete tests to make them "pass"

### Tier 2 — Confirm with User First
- Changes touching 5+ files at once
- Database schema changes
- External API calls with side effects
- Out-of-project-directory changes

## Security Rules

- **No secrets in code**: Never commit API keys, passwords, tokens, or PII. Use environment variables or `.env` files (which must be in `.gitignore`)
- **Validate external input**: All user input, API responses, and file content from untrusted sources must be validated before use
- **No command injection**: Never interpolate untrusted strings into shell commands, SQL queries, or eval()
- **Dependency awareness**: When adding dependencies, prefer well-maintained packages and check for known vulnerabilities
- **OWASP Top 10**: When writing web-facing code, consider injection, broken auth, XSS, CSRF, and other common risks

## File Management

- Move deleted files to `_deleted/` instead of removing them permanently
- Do not edit linter config files (`.eslintrc`, `ruff.toml`, `tsconfig.json`, etc.) to suppress warnings

## Completion Checklist

Before declaring any task complete:

- [ ] Goal (defined at start) is achieved and verified
- [ ] Tests pass (or explicitly marked N/A with justification)
- [ ] `git status` is clean
- [ ] No secrets or PII in committed code
- [ ] Linter/formatter configs were not weakened
- [ ] Deleted files moved to `_deleted/`, not removed

## On Failure

Record what happened:
1. **What happened** — facts only, no interpretation
2. **Why** — root cause analysis
3. **Next time** — specific preventive action (not "be more careful")
