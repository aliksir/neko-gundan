# Mutation Review — AI Code Reviewer Quality Validation

> Module: `mutation_review` | Default: ON | Scale: Squad+

Validates AI code reviewer quality by injecting known mutations into approved code and measuring detection rates.

## Overview

After kurouto-neko APPROVEs a code change, this module injects predetermined code mutations and requests a blind re-review. The reviewer knows mutations exist but not which lines are mutated. The detection rate (Review Quality Score / RQS) quantifies reviewer reliability.

## When to Use

- **必須**: Squad+ の開発タスク（コード変更を含む）で kurouto-neko APPROVE 後に自動発動
- **N/A**: ドキュメント・設定ファイルのみの変更（コード変更ゼロ）
- Periodic calibration of review quality (monthly recommended)
- After changes to review protocol, agent prompts, or model configuration

## Mutation Pattern Categories

8 categories defined in `modules/mutation-patterns.md`:

| ID | Category | Detection Difficulty |
|----|----------|---------------------|
| M1 | Logic Inversion | Low |
| M2 | Boundary Shift | Medium |
| M3 | Null Safety Removal | Medium |
| M4 | Resource Leak | Medium |
| M5 | Silent Error | High |
| M6 | Security Weakness | High |
| M7 | Type Confusion | High |
| M8 | Dead Code Injection | Low |

## Relationship to jit_tests

jit_tests uses a lightweight 4-operator subset (Negate condition / Remove statement / Swap return value / Change operator) for **test generation**. This module uses the full 8-category catalog for **reviewer quality measurement**. The mutation-patterns.md catalog is the canonical source; jit_tests operators are a subset.

## Review Quality Score (RQS)

```
RQS = (detected_mutations / injected_mutations) * 100

Thresholds:
  >= 80%: PASS (reviewer quality sufficient)
  60-79%: WARN (improvement needed)
  < 60%:  FAIL (reviewer configuration review recommended)
```

Per-category breakdown is recorded for trend analysis.

## Protocol

1. shigoto-neko runs `mutation-inject.mjs` on approved files
2. kurouto-neko performs blind review (knows mutations exist, not where)
3. shigoto-neko compares findings against mutation list
4. RQS is calculated and recorded in metrics/

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | Post-APPROVE (auto for code changes) | Run mutation-inject.mjs, generate mutated code + mutation_list.json |
| kurouto-neko | Mutation review | Blind review of mutated code (mutation existence disclosed, locations not) |
| shigoto-neko | Post-mutation-review | Compare findings vs mutation_list.json, calculate RQS, record missed categories |
| shigoto-neko | Knowledge harvesting | Analyze missed categories, record lessons (auto_lessons), update weakness trends |
| oyakata-neko | RQS report | Record in metrics/, alert on FAIL, monthly Category Weakness Map review |

## Knowledge Harvesting（知見刈り取り）

RQS を記録するだけでなく、見逃しパターンを分析して改善に回す。

### Per-run（毎回実行後）

shigoto-neko が RQS 算出時に以下を記録する:

1. **見逃しカテゴリの記録**: mutation_list.json と review findings を突合し、未検出の mutation を `category + 対象コード + 見逃し理由の推定` で記録
2. **WARN/FAIL 時の深掘り**: RQS < 80% の場合、見逃した mutation ごとに以下を分析:
   - そのカテゴリは過去にも見逃しているか（metrics/ の履歴と照合）
   - レビュアーのプロンプトにそのカテゴリへの注意喚起があるか
   - 対象コードの複雑度が高かったか（見逃しの妥当性判断）
3. **lessons 記録**: 初出の見逃しパターン or 2回連続同カテゴリ見逃し → `memory/lessons/mutation-review-{PJ名}.md` に記録（auto_lessons 連携、`[c:0.5]`）

### Category Weakness Map（カテゴリ弱点マップ）

metrics/ の RQS 履歴から、カテゴリ別検出率を集計する。

| 検出率 | 判定 | アクション |
|--------|------|-----------|
| >= 80% | 安定 | 維持 |
| 50-79% | 弱点 | kurouto-neko プロンプトに該当カテゴリの重点チェック指示を追加検討 |
| < 50% | 盲点 | レビュープロトコル改善タスクを future-tasks.md に起票 |

対象: 3回以上の計測データがあるカテゴリのみ（サンプル不足は判定しない）。

### Feedback Loop（改善サイクル）

```
mutation-review 実行
  → 見逃しカテゴリ特定
  → lessons 記録（auto_lessons 連携）
  → 弱点カテゴリ蓄積（metrics/）
  → 月次: Category Weakness Map 集計
  → 盲点カテゴリ → 改善タスク起票 or プロンプト調整
  → 次回 mutation-review で効果測定
```

### Integration with Existing Modules

| Module | 連携内容 |
|--------|---------|
| auto_lessons | 見逃しパターンを lessons に `[c:0.5]` で記録。同カテゴリ再発で confidence bump |
| knowledge_reflection | 完了ゲートの知見メタ評価で mutation-review lessons を統合整理対象に含む |
| quality_metrics | RQS をタスク行の追加列として記録（既存 metrics 追記と同時） |

## Loop Limit

Mutation review does NOT count toward the 3-cycle review loop limit (same treatment as Adversarial Second-Pass per review-protocol.md).

## Script

`scripts/mutation-inject.mjs` — Zero-dependency Node.js script.

```
node scripts/mutation-inject.mjs --sample              # Built-in sample
node scripts/mutation-inject.mjs --count 3 src/app.js  # Target file
```

Output: JSON with mutation list and mutated file path.
