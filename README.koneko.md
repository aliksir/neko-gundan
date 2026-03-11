# Koneko Gundan — Neko Gundan Lite for PRO Plan

**[日本語版はこちら](README.koneko.ja.md)** | **[Full Neko Gundan (MAX 5+)](README.md)**

> The same quality principles as Neko Gundan, sized for PRO-tier token budgets.

## What is Koneko?

Koneko ("kitten") is a lightweight version of Neko Gundan for Claude Code's **PRO plan** users. Full Neko Gundan uses multiple parallel agents (3-5 agent calls per task), which burns through PRO token limits fast. Koneko gives you the core quality benefits with just **1 agent call per task**.

## What's Kept, What's Cut

| Feature | Koneko | Full Neko Gundan |
|---------|--------|-----------------|
| Independent reviewer | 1 lightweight (`koneko-neko`) | 1 full (`kurouto-neko`) |
| Completion gates | 3 items | 7 items |
| Safety tiers | Yes | Yes |
| File deletion safety (`_deleted/`) | Yes | Yes |
| Implementer != Reviewer | Yes | Yes |
| Review rubric | 3 aspects | 5 aspects |
| Agent hierarchy (oyakata/shigoto/genba) | No | Yes |
| Parallel execution (TeamCreate) | No | Yes |
| Modules (shitsuke) | No | 15 modules |
| Whiteboard / dashboard | No | Yes |

**Koneko keeps the principles. It cuts the ceremony.**

## Quick Start

```bash
git clone https://github.com/aliksir/neko-gundan.git
bash neko-gundan/scripts/install.sh koneko ./your-project
```

4 files installed. Add the CLAUDE.md snippet the installer shows you. Done.

## How It Works

```
You write code
    ↓
Run koneko gate (3 checks with evidence)
    ↓
Spawn koneko-neko to review (1 agent call)
    ↓
Fix if needed → Done
```

No hierarchy, no ceremony. Just: **implement → gate → review → done.**

### The 3 Koneko Gates

Before saying "done", check these 3 with evidence (not "I checked" — paste the output):

| # | Check | How |
|---|-------|-----|
| 1 | It works | Run tests or verify manually |
| 2 | No unintended changes | `git diff` shows only expected files |
| 3 | Clean state | `git status` shows no forgotten files |

### The 3-Aspect Review

Koneko-neko reviews your code on 3 aspects:

| Aspect | PASS | FAIL |
|--------|------|------|
| Correctness | Works as intended | Untested or broken |
| Safety | No injection/XSS/auth risks | Vulnerability present |
| Testing | Key paths verified | No verification at all |

One review cycle. Fix what's flagged, move on.

## Token Budget

| Action | Cost |
|--------|------|
| Koneko gates (self-check) | ~0 (prompt rules only) |
| Koneko-neko review | ~1 agent call |
| Safety rules | ~0 (prompt rules only) |
| **Total per task** | **~1 agent call** |

Full Neko Gundan platoon = 3-5 agent calls per task.

## Upgrading to Full Neko Gundan

When you move to MAX 5+, add more modes on top:

```bash
bash install.sh quality ./your-project      # Full reviewer
bash install.sh implement ./your-project    # Parallel workers
bash install.sh plan ./your-project         # Strategic planning
```

Koneko files won't conflict — they're superseded by the full versions.

## Downgrading from Full Neko Gundan

Already on full Neko Gundan and switching to PRO?

```bash
bash neko-gundan/scripts/install.sh --downgrade koneko ./your-project
```

Unneeded files are safely moved to `_deleted/neko-gundan-YYYYMMDD/` (not deleted). Restore anytime if you switch back.

## Update Checker

When you install Koneko, the installer records your setup in `~/.claude/.neko-gundan-manifest.json` (mode: `koneko`). The update checker uses this to notify you when a new version is available.

**Manual check:**

```bash
bash neko-gundan/scripts/check-update.sh
# Force-check (skip 24h cache):
bash neko-gundan/scripts/check-update.sh --force
```

If a new version is available:

```
🔔 猫軍団: 新バージョン v1.8.0 が利用可能です（現在: v1.7.0）
   インストール済みモード: koneko
   → bash neko-gundan/scripts/install.sh --update koneko ./your-project
```

**Automatic check at session start (opt-in):**

Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "bash ~/.claude/neko-gundan/scripts/check-update.sh &",
        "timeout": 10000
      }
    ]
  }
}
```

Runs in the background — only notifies when an update exists. Default is OFF.

## Limitations

- **No parallel agents** — all work is sequential
- **1 review cycle** — no back-and-forth review loop
- **3-aspect rubric** — skips maintainability and Purpose alignment
- **No modules** — shitsuke system not supported

These are intentional. If you need them, upgrade to [full Neko Gundan](README.md).
