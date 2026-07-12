# Choosing and Customizing a CLAUDE.md Template

This directory has four starter templates. Pick the one that matches your stack, copy it to your project root as `CLAUDE.md`, then customize three spots. The Neko Gundan installer fills in the rest.

## Overview

| File | For | Contains |
|------|-----|----------|
| `CLAUDE.md.example` | Polyglot / unknown stack | Minimal skeleton, language-agnostic |
| `CLAUDE.md.typescript` | Next.js, Vite, TS backend | npm + tsc + vitest/jest + ESLint/Prettier |
| `CLAUDE.md.python` | FastAPI, Django, Flask | uv/pip + pytest + ruff/mypy + bandit |
| `CLAUDE.md.go` | Go service / CLI | go test + golangci-lint |

All four include the Neko Gundan **auto-scaling table**, **completion gate principle**, and **Tier 1 safety controls** out of the box. You don't have to author those yourself.

## Quick Choice

| Your situation | Use | Why |
|----------------|-----|-----|
| Next.js / Vite / a TS service | `CLAUDE.md.typescript` | Build commands already match npm-style workflows |
| FastAPI / Django / Flask | `CLAUDE.md.python` | Includes `uv` and `pytest` defaults, mypy + ruff |
| Go service or CLI | `CLAUDE.md.go` | `go test` and `golangci-lint` ready to go |
| Polyglot or "I'll fill it in later" | `CLAUDE.md.example` | Language-agnostic, smallest |
| You're not sure yet | `CLAUDE.md.example` | You can always replace it later |

If you have both Python and TypeScript, copy the larger one (`.python` or `.typescript`) and add a short Build & Run section for the second language below the first.

## Step-by-step

```bash
# 1. Copy the template that matches your stack
cp neko-gundan/examples/CLAUDE.md.typescript ./your-project/CLAUDE.md

# 2. Customize three spots (open the file in your editor)
#    - Language:   change "English" if you want JP/ZH/etc. responses
#    - Build & Run: replace npm with pnpm / bun / yarn if needed
#    - Test:       pick vitest OR jest (comment out the unused one)

# 3. Run the installer to drop in agents, rules, and skills
#    (Default: all 4 language rule files installed. Add --lang to filter.
#     See README.md > "Language Rules" for the --lang flag.)
bash neko-gundan/scripts/install.sh quality+security ./your-project

# 4. Verify the install
ls ./your-project/.claude/agents/ ./your-project/.claude/rules/
grep "Neko Gundan" ./your-project/CLAUDE.md

# 5. Try it in Claude Code
#    /neko-gundan "your first task"
```

That's it. The framework reads `CLAUDE.md`, picks the right scale (recon / squad / platoon / battalion), and starts.

## What You Get

After step 2 (customize) and step 3 (installer), a TypeScript project's `CLAUDE.md` looks roughly like this. Project name and stack details are fictitious — replace with your own.

```markdown
# Project Settings — myapp (Next.js + Vitest)

## Language
- Respond in Japanese.

## Build & Run

\```bash
pnpm dev              # development server (localhost:3000)
pnpm build            # production build
pnpm start            # production server
\```

## Test

\```bash
pnpm test             # vitest (chosen — jest commented out)
# pnpm jest           # not in use
pnpm playwright test  # E2E
\```

## Lint & Format

\```bash
pnpm tsc --noEmit     # type check
pnpm eslint .         # lint
pnpm prettier --check .
\```

## Database

\```bash
pnpm migrate          # apply migrations
pnpm seed             # load seed data
\```

`DATABASE_URL` is required at runtime. See `.env.example` for the full list.

## Deployment

- staging: pushes to `main` auto-deploy
- production: tag `v*` triggers the release workflow

## Secrets

`.env.local` is git-ignored. Never commit it. Rotate `JWT_SECRET` and `DATABASE_URL` quarterly.

## Neko Gundan (Default Operation Mode)

You always operate as "Oyakata-neko" (General). Process all instructions through the Neko Gundan system.
See `.claude/agents/` for team definitions and `.claude/rules/` for protocols.

### Auto-Scaling
| Scale | Criteria | Formation |
|-------|----------|-----------|
| Recon | Questions, research, single file check | Oyakata handles directly |
| Squad | 1-2 file changes | Single shigoto-neko |
| Platoon | 3-5 file changes or multiple tasks | TeamCreate: shigoto-neko + 1-2 genba-neko |
| Battalion | 6+ files or large-scale work | TeamCreate: shigoto-neko + 3 genba-neko |

### Quality Assurance
- All scales must pass completion gates before declaring done.
- Principle: not "I think it's correct" but "I verified it's correct."

### Safety Controls
Tier 1: Absolutely prohibited — `rm -rf /`, `git push --force` (main), changes outside project scope.
```

The top half (Project / Build / Test / Lint / Database / Deployment / Secrets) is **your project's reality**. The bottom half (Neko Gundan / Auto-Scaling / QA / Safety) is **framework boilerplate** the template gave you — leave it alone unless you know what you're doing.

## Common Customizations

The base template intentionally stops short. Add these as you need them.

### Database

```markdown
## Database

\```bash
<your-migrate-command>    # apply migrations
<your-seed-command>       # load seed data
\```

`DATABASE_URL` is required at runtime. See `.env.example` for the full list.
Schema lives in `db/schema.sql` (or `prisma/schema.prisma`, or wherever).
```

### Deployment

```markdown
## Deployment

- **staging**: pushes to `main` auto-deploy via <CI provider>
- **production**: tag `v*` triggers the release workflow
- Manual deploy: `<your-deploy-command>`

Rollback: `<your-rollback-command>` or revert the tag.
```

### Secrets

```markdown
## Secrets

`.env.local` is git-ignored. Never commit it.

Required keys: `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, ...
Rotation: quarterly for production, ad-hoc for staging.
```

Pair this with adding the actual filenames to your `.gitignore` if they aren't already.

### Test Policy

```markdown
## Test Policy

- Coverage threshold: 80% lines, 70% branches (CI enforced).
- E2E required for: auth flows, payment flows, anything touching `DATABASE_URL`.
- Unit tests live next to source files: `Foo.ts` → `Foo.test.ts`.
```

### Project-specific Code Style

```markdown
## Code Style (project-specific)

- Imports: absolute paths via `@/*`, never `../../`.
- React: server components by default, mark client with `"use client"`.
- Error handling: throw typed errors, never `throw "string"`.
```

Prefer to encode these in ESLint / tsconfig / ruff config when possible — machine-enforced beats Markdown-enforced.

## Troubleshooting

**"CLAUDE.md doesn't seem to be read"**
- Make sure it's at the **project root** (where `package.json` / `pyproject.toml` lives), not in a subdirectory.
- Restart Claude Code after the first install. Claude Code loads `CLAUDE.md` at session start.

**"Auto-scaling isn't kicking in"**
- The Neko Gundan section must be present in full. If you trimmed it, the framework can't read the scale rules.
- Confirm `grep "Neko Gundan" CLAUDE.md` returns a hit.

**"Commands fail when an agent tries to run them"**
- The Build & Run section is treated as authoritative. If your project uses `pnpm` but the template still says `npm`, the agent will run `npm` and fail.
- Replace every occurrence in the file, not just one spot.

**"Responses are in English even though I changed Language"**
- The Language section must say `Respond in <your language>.` exactly — leading dash + sentence. Other phrasings may be ignored.

**"The installer overwrote my custom rules"**
- The installer touches `.claude/agents/`, `.claude/rules/`, `.claude/skills/`. It does **not** touch your `CLAUDE.md`, but if you ran it before customizing, you may have a default `CLAUDE.md` you don't want. Diff against the template and re-apply your changes.

---

For framework concepts (auto-scaling rationale, evidence levels, objection protocols), see the [main README](../README.md). For mode selection (`security`, `quality+security`, `all`), see [docs/modes.md](../docs/modes.md).
