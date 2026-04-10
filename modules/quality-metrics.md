# Quality Metrics Module

> **Module**: `quality_metrics` | **Default**: OFF | **Scale**: All | **Config**: `neko-modules.yml` → `evidence.quality_metrics`

Accumulates quality metrics per task and outputs a cumulative markdown report with trend analysis.

## Why

AI-generated code volume is growing faster than human review capacity. Without statistical visibility into quality trends, gates become theater — they exist but no one checks if they're working.

This module makes quality trends visible by accumulating per-task metrics into a single file per project, with inline explanations so the file is self-contained.

## Configuration

Set the output directory in your project's CLAUDE.md:

```markdown
### メトリクス出力
- metrics_output_dir: /path/to/metrics/
```

If not configured, defaults to `{project_root}/_metrics/`.

## Output File

One cumulative file per project (not per task):
```
{metrics_output_dir}/{project_name}_metrics.md
```

Each task completion **appends** a row to Recent Tasks and **recalculates** the Summary.

## Shigoto-neko / Oyakata-neko: Metrics Procedure

### Timing
- After checklist export (if enabled), before writing the result report
- Same timing as checklist export — part of the completion gate flow

### Data Sources

| Source | Metrics extracted |
|--------|------------------|
| Completion gate checklist | PASS / FAIL / SKIP counts, skip rate |
| ISV result dimensions | confidence, outcome, review_cycles, intervention_count |
| git diff / git log | Files changed count, hotspot detection |

### File Format

```markdown
# Quality Metrics: {project_name}
Updated: YYYY-MM-DD

## Summary (last 10 tasks)
| Metric | Value | Trend | What it means |
|--------|-------|-------|---------------|
| Gate pass rate | 87% | → | Completion gate PASS ratio. Low = quality gaps |
| Skip rate | 23% | ↑ ⚠️ | N/A skip ratio. High = gates becoming theater |
| Avg review cycles | 1.3 | ↓ | Review rounds per task. All 1 = reviews may be too lenient |
| Human interventions | 0.4/task | → | Human correction count. Sustained 0 = full autonomy or no oversight |
| Avg confidence | 0.82 | → | Judge confidence level. Low = passing with uncertainty |

## Alerts
- ⚠️ {metric} {description of concern}

## Recent Tasks
| Date | Task | Files | Cycles | Outcome | Confidence | Gate | Flags |
|------|------|-------|--------|---------|------------|------|-------|
| MM-DD | {summary} | {n} | {n} | {0-1} | {0-1} | {P/F/S} | {alerts} |

## Hotspots (last 30 days)
Files changed repeatedly may indicate unstable design.
| File | Changes | Last changed |
|------|---------|--------------|
| {path} | {n} | MM-DD |
```

### Trend Indicators
- `↑` increasing (last 3 vs previous 3)
- `↓` decreasing
- `→` stable
- `⚠️` appended when trend is concerning (skip rate up, confidence down, etc.)

### Reference Thresholds

Starting points for interpretation. Adjust per project — a research prototype and a production API will have different baselines.

| Metric | Healthy | Watch | Action needed |
|--------|---------|-------|---------------|
| Gate pass rate | 70-95% | 50-70% or >95% | < 50% |
| Skip rate | < 20% | 20-35% | > 35% |
| Avg review cycles | 1.2-2.0 | 1.0 (sustained) or > 2.5 | > 3.0 or sustained 1.0 for 5+ tasks |
| Human interventions | 0.2-1.0/task | 0 for 10+ tasks | Sustained 0 (no oversight?) |
| Confidence | > 0.7 | 0.6-0.7 | < 0.6 |

**Why sustained 1.0 review cycles are suspicious:** Some pushback is healthy. If every task passes review on the first try for an extended period, reviews may not be substantive — the reviewer might be rubber-stamping.

**Why 100% gate pass rate is suspicious:** If nothing ever fails, gates may be too lenient or teams may be unconsciously avoiding challenging tasks. A healthy process has occasional failures that get caught and fixed.

### Alert Triggers
| Condition | Alert |
|-----------|-------|
| Skip rate > 30% | "Gate items are being skipped frequently — check if N/A is justified" |
| Avg review cycles = 1.0 for 5+ tasks | "All tasks pass first review — verify reviews are substantive" |
| Human interventions = 0 for 10+ tasks | "No human corrections detected — confirm oversight is active" |
| Confidence < 0.6 for any task | "Low-confidence task passed — review evidence quality" |
| Same file changed 5+ times in 30 days | "Hotspot detected — consider if design needs stabilizing" |

## pass@k Metrics (ECC-inspired, 2026-04-11追加)

Multiple-execution success rate measurement. Instead of judging a task by a single attempt, run k independent attempts and measure how many succeed.

### Concept

| Metric | Formula | Meaning |
|--------|---------|---------|
| **pass@k** | (successful runs / k) | Success rate over k attempts. e.g., pass@3 = 2/3 = 67% |
| **pass^k** | (all k runs succeed) | Strict success: all attempts must pass. e.g., pass^3 = true only if 3/3 |

### When to apply

- **Default (most tasks)**: pass@1 (standard single execution) — no change from current flow
- **High-risk tasks**: pass@3 recommended when:
  - DB schema changes
  - Security-critical code
  - EDI/external integration changes
  - Performance-sensitive batch processing
- **Flaky test detection**: pass@5 for suspected non-deterministic failures

### How it works

1. kurouto-neko (or shigoto-neko for squad) flags a task as `pass@k: 3` in the review
2. The executor (genba-neko or test runner) runs the verification k times independently
3. Results are recorded in the metrics row:

```
| Date | Task | Files | Cycles | Outcome | Confidence | Gate | pass@k | Flags |
| 04-11 | EDI fix | 3 | 1 | 0.9 | 0.85 | P | 3/3 | - |
| 04-11 | batch opt | 2 | 2 | 0.7 | 0.70 | P | 2/3 | ⚠️ flaky |
```

4. pass@k < k triggers `⚠️ flaky` flag — the task passes but reliability is suspect

### Reference Thresholds

| k | Healthy pass@k | Watch | Action needed |
|---|---------------|-------|---------------|
| 3 | 3/3 (100%) | 2/3 (67%) | 1/3 or 0/3 |
| 5 | 5/5 or 4/5 | 3/5 (60%) | < 3/5 |

### Alert Triggers (additional)

| Condition | Alert |
|-----------|-------|
| pass@k < k for any high-risk task | "Flaky execution detected — investigate non-determinism" |
| 3+ tasks with pass@k < k in 30 days | "Reliability trend degrading — systematic flakiness review needed" |

### Rules
- Keep the last 30 task rows in Recent Tasks (older rows archived or trimmed)
- Recalculate Summary from the last 10 tasks each time
- Hotspots are calculated from git log of the last 30 days
- If ISV module is not enabled, omit confidence/outcome columns and related metrics
- pass@k column defaults to "1/1" for standard tasks (omit if all tasks are 1/1)
- The file must be self-contained — all metric meanings are inline, no external references needed

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko / oyakata-neko | Completion gate (after checklist export, before result report) | Append task metrics row to `{metrics_output_dir}/{project_name}_metrics.md`, recalculate summary |
| shigoto-neko / oyakata-neko | Completion gate | Check alert triggers; flag concerning trends |
| shigoto-neko / oyakata-neko | Periodic review | Review hotspots (files changed 5+ times in 30 days) for design instability |
