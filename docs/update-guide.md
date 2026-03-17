# Update Guide

← Back to [README](../README.md)

## Update Checker

The installer records which modes and files you installed in `~/.claude/.neko-gundan-manifest.json`. The update checker uses this to tell you when a new version is available.

**Manual check:**

```bash
bash neko-gundan/scripts/check-update.sh
# or force-check (skip 24h cache):
bash neko-gundan/scripts/check-update.sh --force
```

If a new version is available:

```
🔔 猫軍団: 新バージョン v1.8.0 が利用可能です（現在: v1.7.0）
   インストール済みモード: quality+implement
   → bash neko-gundan/scripts/install.sh --update quality+implement ./your-project
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

The check runs in the background and only notifies you when an update exists. No automatic updates — just a notification.

**Notes:**
- Results are cached for 24 hours (`~/.claude/.neko-gundan-update-cache`)
- No network call if curl is not available — fails silently
- The manifest (`~/.claude/.neko-gundan-manifest.json`) is created automatically by the installer

## Update

Already installed? Pull the latest neko-gundan and check what changed:

```bash
cd neko-gundan && git pull
bash scripts/install.sh --update all ./your-project
```

The updater shows a diff for each changed file and lets you choose per file — overwrite, keep yours, or see the full diff first. Files you haven't customized update silently.

**Recommended merge strategy by file type:**

| File type | Strategy | Reason |
|-----------|----------|--------|
| `rules/*.md` | Accept upstream | Protocol improvements; your customizations go in config, not rules |
| `agents/*.md` | Accept upstream | Agent behavior updates; project-specific tweaks go in CLAUDE.md |
| `modules/*.md` | Accept upstream | Module definitions are framework-managed |
| `neko-gundan.config.yaml` | **Keep yours** | Your project's module ON/OFF choices |
| `CLAUDE.md` snippet | **Manual review** | Merge new features with your project-specific instructions |
| `scripts/*.sh` | Accept upstream | Bug fixes and new features |
