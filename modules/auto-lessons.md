# Auto-Lessons Module

> **Module**: `auto_lessons` | **Default**: ON | **Scale**: All

Autonomous knowledge accumulation inspired by Hyperagents' Archive pattern. Captures learned/constraint/rejected knowledge during work (not just on failure), enabling a self-improving flywheel.

## Background

Hyperagents (arxiv:2603.19461, Meta AI) demonstrated that persistent archives of past agent variants and performance data enable cumulative improvement across runs. This module adapts that concept: genba-neko records knowledge during work, shigoto-neko performs quality control, and oyakata-neko applies accumulated knowledge at session start.

Unlike Reflexion (failure-only), Auto-Lessons captures knowledge from **both success and failure**.

## Classification (aligned with Contextual Commits)

| Type | What to record | When |
|------|---------------|------|
| **learned** | API traps, undocumented behavior, non-obvious specs | Discovered a fact that isn't in docs |
| **constraint** | Hard limits constraining implementation (API limits, browser compat, etc.) | Found a wall that blocks certain approaches |
| **rejected** | Approaches tried and abandoned (**reason required**) | Chose not to use an approach |

## Write Target

- **Path**: `memory/lessons/{topic}.md` (e.g., `api.md`, `browser.md`, `testing.md`)
- **Existing file**: Append to it
- **No existing file**: Create new file with topic as filename

## Format

```
- [PJ-name] [tag] Knowledge content — Specific action guideline (YYYY-MM-DD)
```

Example:
```
- [x-auto-bot] [learned] Twitter API v2 rate limit is 15 req/15min per app token — Use user token for higher limits (2026-03-28)
- [jp-dashboard] [constraint] Vite dev server HMR fails with symlinked node_modules — Use --preserve-symlinks flag (2026-03-28)
- [mcp-yoshi] [rejected] zod validation for MCP responses — Too heavy for real-time filtering, use regex pattern matching instead (2026-03-28)
```

## Trajectory Analysis (ERL, 2026-03-28追加, arxiv:2603.24639)

Auto-Lessons captures knowledge not only when discoveries occur during work, but also through **mandatory post-task trajectory analysis**. After every task completion (not just failures), analyze the task trajectory to extract transferable heuristics.

### When to analyze
- **Current (step 9.5)**: Record as discoveries happen during work — unchanged
- **New (completion report)**: Before submitting completion report, review the full task trajectory and extract any additional lessons not captured during work

### Analysis questions
1. What approach worked that wasn't obvious beforehand? → `learned`
2. What constraint did I discover that would affect similar tasks? → `constraint`
3. What alternative did I consider and reject? → `rejected` (reason required)

## Write Scoring (AgeMem, 2026-03-28追加, arxiv:2601.01885)

Before writing a lesson, score it on 3 criteria. Write only if 2+ criteria are YES:

| Criterion | Question | YES example | NO example |
|-----------|----------|-------------|------------|
| **Novelty** | Is this different from existing lessons on the same topic? | New API behavior not in docs | Already recorded in lessons/api.md |
| **Generality** | Can this be reused across multiple sessions/projects? | "Windows path separator breaks glob" | "This specific file had a typo" |
| **Actionability** | Does this change a concrete future action? | "Use --preserve-symlinks flag" | "Vite is complex" |

If fewer than 2 criteria pass, do NOT write to lessons/. Report via SendMessage only.

## Quality Criteria (enforced by shigoto-neko)

1. **Actionable**: Must include a concrete action guideline. "Be careful" is prohibited
2. **No duplicates**: Grep existing lessons before writing. Same knowledge = don't write
3. **Accurate tags**: PJ name and topic tag must match the actual project and domain
4. **Dated**: Include date for temporal context

## Scope Boundary

- **Writable**: `memory/lessons/{topic}.md` only
- **NOT writable**: CLAUDE.md, agent definitions, gates.md, rules/, or any config files
- This module does NOT grant self-modification capabilities beyond lessons files

## Confidence Scoring & Decay (ECC-inspired, 2026-04-11追加)

Each lesson carries a confidence score that evolves over time. High-confidence lessons persist; low-confidence lessons decay and eventually get pruned.

### Confidence Score

Range: `0.0` (untested speculation) to `1.0` (battle-tested, multi-project verified)

#### Format extension

```
- [PJ-name] [tag] Knowledge content — Action guideline (YYYY-MM-DD) [c:0.7]
```

The `[c:X.X]` suffix is the confidence score. If omitted, defaults to `0.5` (initial).

#### Scoring rules

| Event | Score change | Example |
|-------|-------------|---------|
| **Initial write** | `0.5` | New lesson recorded for the first time |
| **Confirmed in another PJ** | `+0.2` (cap at 1.0) | Same lesson validated in a different project |
| **Confirmed in same PJ** | `+0.1` (cap at 1.0) | Same lesson re-encountered in same project |
| **Contradicted** | `-0.3` (floor at 0.0) | Evidence found that the lesson was wrong or outdated |
| **Aged without confirmation** | `-0.1` per 60 days | No re-encounter for 60 days → decay |

#### Auto-decay

At session start (oyakata-neko's dev-lessons search):
1. Check each lesson's date
2. If `today - lesson_date > 60 days` AND no confirmation event: `confidence -= 0.1`
3. If confidence drops to `0.0`: move to `memory/lessons/_archived/{topic}.md` with note
4. Update the `[c:X.X]` in the original line

#### Promotion: Lesson → Skill

When a lesson reaches `c:0.9+` AND has been confirmed across 3+ different projects:
- **Candidate for CLAUDE.md / rules/ promotion**
- shigoto-neko proposes promotion to oyakata-neko
- oyakata-neko reviews and, if approved, integrates into rules/ or CLAUDE.md
- Original lesson line gets `[promoted → rules/{file}.md]` suffix

This is the "instinct → skill evolution" pattern from ECC, adapted for the neko-gundan knowledge pipeline.

### Confidence-based application

When oyakata-neko applies lessons at session start:

| Confidence | Application |
|------------|-------------|
| `0.8-1.0` | Apply as established rule |
| `0.5-0.7` | Apply with note "confidence: medium — verify if still valid" |
| `0.2-0.4` | Mention as reference only, do not apply as rule |
| `0.0-0.1` | Skip (or check if archived) |

## Skill Inventory Audit (2026-04-11追加, 論文根拠: arxiv:2603.15401)

SWE-Skills-Benchの実証結果: 49スキル中39個が改善効果ゼロ、3個が逆効果。スキルの数ではなく質が重要。

### 定期棚卸しルール

**頻度**: 四半期（3ヶ月ごと）、またはスキル数が50を超えた時点で即座に実施

**棚卸し手順**:
1. `~/.claude/skills/` の全スキル一覧を取得
2. 各スキルについて以下を評価:

| 評価基準 | YES | NO |
|---------|-----|-----|
| **ドメイン適合性**: 現在のプロジェクト群で使うか？ | 残す | 削除候補 |
| **抽象レベル**: 具体的なアクション指示があるか？ | 残す | 改善 or 削除 |
| **文脈適合性**: 他のスキルと矛盾しないか？ | 残す | 統合 or 削除 |
| **最終使用日**: 60日以内に使ったか？ | 残す | 削除候補 |

3. 削除候補は `~/.claude/skills/_archived/` に移動（即削除しない）
4. 結果を `memory/lessons/skill-audit.md` に記録

### スキル効果の3条件（SWE-Skills-Bench由来）

スキルが効果を発揮する条件（全て満たす必要あり）:
1. **ドメイン特化**: 汎用的なスキルではなく、特定の技術スタック・フレームワークに特化
2. **適切な抽象レベル**: 高すぎず（「良いコードを書け」）低すぎず（「この1行を変えろ」）
3. **プロジェクトコンテキストとの整合**: バージョン不一致のガイダンスは逆効果（最大-10%）

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| genba-neko | During work (step 9.5) | Record knowledge to `memory/lessons/{topic}.md` when learned/constraint/rejected discoveries occur. Set initial `[c:0.5]` |
| genba-neko | Post-work (completion report) | Perform trajectory analysis: review full task trajectory, extract additional lessons using Write Scoring |
| genba-neko | During work (re-encounter) | If existing lesson is confirmed, bump confidence: `[c:X.X]` → `[c:X.X+0.1]` or `+0.2` (cross-PJ) |
| shigoto-neko | Completion gate (step 0.5) | Quality check on new lessons entries (duplicates, actionable, tags, confidence score present) |
| oyakata-neko | Start gate (dev-lessons search) | Search accumulated lessons, apply auto-decay, apply confidence-based filtering |
| shigoto-neko | On c:0.9+ cross-PJ lesson | Propose promotion to rules/ or CLAUDE.md |
