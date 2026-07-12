# Quality Metrics Module

> **Module**: `quality_metrics` | **Default**: OFF | **Scale**: All | **Config**: `neko-modules.yml` → `evidence.quality_metrics`

Accumulates quality metrics per task and outputs a cumulative markdown report with trend analysis.

**Full definition**: `modules/quality-metrics.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko / oyakata-neko | Completion gate (after checklist export, before result report) | Append task metrics row to `{metrics_output_dir}/{project_name}_metrics.md`, recalculate summary |
| shigoto-neko / oyakata-neko | Completion gate | Check alert triggers; flag concerning trends |
| shigoto-neko / oyakata-neko | Periodic review | Review hotspots (files changed 5+ times in 30 days) for design instability |
