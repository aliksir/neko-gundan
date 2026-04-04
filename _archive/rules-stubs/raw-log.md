# Raw Log Module

> **Module**: `raw_log` | **Default**: OFF | **Scale**: Squad+ | **Config**: `neko-modules.yml` → `evidence.raw_log`

ctrl+O（コンテキストビューア）と同等の粒度で全ツールコールを1行ずつ記録する。要約禁止・省略禁止・全件記録が最優先。
フォーマット: `{ToolName}: {target} ({result})` — 1行1アクション。

**Full definition**: `modules/raw-log.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| genba-neko | Post-work (completion report) | Include structured action list + resource_usage (tokens/duration) in handoff |
| shigoto-neko | Pre-completion-gate | Collect action lists, run git diff, generate raw log file with Resource Summary table |
| shigoto-neko | Completion gate | Verify raw log file exists |
