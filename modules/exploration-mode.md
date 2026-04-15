# Exploration Mode (EXPLORE-001)

> **Module**: `exploration_mode` | **Default**: OFF | **Scale**: Squad+ | **Config**: `neko-modules.yml` → `orchestration.exploration_mode`
> **SSOT**: This file is the single source of truth for EXPLORE-001.

木探索（tree search）による並列実験・最良選択モード。
通常の一本道フロー（計画→実装→レビュー）の代わりに、複数アプローチを並列で試し、
スコアに基づいて最良を採用する。

着想元: [evo-hq/evo](https://github.com/evo-hq/evo)（AlphaEvolve系の進化的コード最適化）。
猫軍団の既存アーキテクチャ（fan-out-aggregate、3層Watchdog、lessons/）に統合する形で設計。

## Why

猫軍団の現行フローは「1つの計画→1つの実装→レビューで修正」の一本道。
これは大半のタスクで正しいが、以下の場面では非効率:

- **最適解が事前に分からない**: アルゴリズム選択、パフォーマンス最適化、設計パターン比較
- **試行錯誤が本質的に必要**: 3層Watchdogで戦略切替しても、切替先が最良とは限らない
- **自動評価可能なスコアがある**: テスト通過率、実行速度、メモリ使用量等

「1本道で行き止まりにぶつかって引き返すより、最初から3本道を同時に歩いて一番いい道を選ぶ」

## When to Apply（発動条件）

以下の **3条件すべて** を満たす場合にのみ発動する。1つでも欠ければ通常フローを使う。

| # | 条件 | 理由 |
|---|------|------|
| 1 | **自動評価可能なスコア関数が存在する** | テスト通過率、ベンチマーク結果、lint警告数等。主観判断が必要なタスクには使えない |
| 2 | **解法が複数ありうる** | 実装方法が1つしかないタスクで並列実験しても無駄 |
| 3 | **親方猫または仕事猫が明示的に探索モードを選択** | コスト（N倍トークン消費）があるため、自動発動しない |

### 適合タスクの例

| タスク | スコア関数 | 分岐軸 |
|--------|----------|--------|
| API応答速度の改善 | レスポンスタイム（ms） | キャッシュ戦略 / クエリ最適化 / 非同期化 |
| バンドルサイズ削減 | バンドルサイズ（KB） | tree-shaking / コード分割 / ライブラリ差替 |
| テストカバレッジ向上 | カバレッジ率（%） | テスト追加箇所の優先順位 |
| アルゴリズム選択 | 実行時間 + 正確性 | 異なるアルゴリズム実装 |

### 不適合タスクの例

- UI/UXデザイン（スコア化困難）
- 新機能の仕様策定（主観判断）
- セキュリティ監査（網羅性が重要、最適化ではない）
- リファクタリング（コード品質は複合指標で単一スコア化が危険）

## Architecture

```
親方猫（Opus）: 探索モード発動判断 + 最終採用判断
    │
仕事猫（Sonnet）: Orchestrator
    │  - スコア関数定義
    │  - ブランチ戦略立案（各現場猫に異なるアプローチを指示）
    │  - 結果収集・スコア比較・最良選択
    │  - 棄却理由のlessons/記録
    │
    ├── 現場猫A（worktree-A）: アプローチ1を実験
    ├── 現場猫B（worktree-B）: アプローチ2を実験
    └── 現場猫C（worktree-C）: アプローチ3を実験
         各自: 実装 → スコア測定 → 結果報告
```

### 通常フローとの違い

| 観点 | 通常フロー | 探索モード |
|------|-----------|-----------|
| 現場猫の目標 | 「計画通りに実装する」 | 「割り当てられたアプローチでスコアを最大化する」 |
| 成功判定 | 完了ゲート通過 | **スコアが最良 AND 完了ゲート通過** |
| 失敗時 | レビューで修正指示 | **ブランチ棄却**（修正しない） |
| worktree | 任意 | **必須**（各現場猫が独立worktreeで作業） |

## Flow

### Phase 1: Setup（仕事猫）

1. **スコア関数を定義する**
   - 測定コマンド（例: `npm run bench`、`pytest --benchmark`、`du -sh dist/`）
   - スコアの方向（高いほど良い / 低いほど良い）
   - ベースラインスコア（現状値を測定・記録）
   - ゲート条件（最低限満たすべき閾値。例: 既存テスト全通過）

2. **ブランチ戦略を立案する**
   - 各現場猫に割り当てるアプローチの概要
   - アプローチ間の独立性を確認（同一ファイルへの書き込みが発生しないこと — RACE-001）
   - 並列数を決定（max_branches 制約内）

3. **探索ブリーフを作成する**（各現場猫向け）
   ```yaml
   exploration_brief:
     branch_id: "explore-A"
     approach: "Redis キャッシュ導入による応答速度改善"
     score_command: "npm run bench -- --json | jq '.mean_ms'"
     score_direction: "lower_is_better"
     baseline_score: 450
     gate_command: "npm test"
     max_iterations: 3
     shared_failures: []   # 他ブランチの棄却理由（Phase 2で更新）
   ```

### Phase 2: Explore（現場猫 × N体、並列）

各現場猫は独立したworktreeで以下を実行する:

1. 割り当てられたアプローチで実装
2. ゲートコマンドを実行（テスト通過確認）
3. スコアコマンドを実行（スコア測定）
4. 結果を報告（実装内容 + スコア + ゲート結果）

```yaml
exploration_result:
  branch_id: "explore-A"
  approach: "Redis キャッシュ導入"
  gate_passed: true
  score: 180          # ms（ベースライン450から改善）
  iterations_used: 2
  files_changed: ["src/cache.ts", "src/api/handler.ts"]
  notes: "コネクションプール設定が重要。初回は設定ミスで悪化した"
```

#### 現場猫内の反復（ミニループ）

各現場猫は `max_iterations` の範囲内で自己改善ループを回せる:
```
実装 → スコア測定 → 改善 → スコア測定 → ...（max_iterations まで）
```
これは3層Watchdogの L1（機械的検出）と連動する。
同一テスト3回失敗 → ミニループ打ち切り、現状スコアで報告。

### Phase 3: Select（仕事猫）

FANOUT-001の収集・集約フローのコンセプト（Fan-Out → Collect → Aggregate）を継承し、
スコア比較に特化したフォーマットで実行する。
FANOUT-001の5列収集チェックリストではなく、探索モード専用のスコア比較テーブルを使用する。

1. **全現場猫の結果を収集**（FANOUT-001 のコンセプト準拠、フォーマットは探索モード専用）

2. **スコア比較テーブルを作成**
   ```markdown
   | Branch | Approach | Gate | Score | vs Baseline | Verdict |
   |--------|----------|------|-------|-------------|---------|
   | A | Redis Cache | PASS | 180ms | -60% | ✅ BEST |
   | B | Query Optimization | PASS | 320ms | -29% | ✗ discard |
   | C | Async Refactor | FAIL | N/A | N/A | ✗ gate fail |
   ```

3. **最良ブランチを選択**
   - ゲート通過 AND スコア最良のブランチを採用
   - 全ブランチがゲート失敗 → 探索失敗、親方猫にエスカレーション
   - 最良ブランチがベースラインより悪い → 探索失敗（改善なし）

4. **棄却ブランチの知見を記録**（lessons/ に自動追記）
   ```markdown
   ## [explore] Query Optimization — discarded
   - score: 320ms（Baseline 450ms、Best 180ms に劣後）
   - 学び: JOINの最適化だけでは限界。I/Oバウンドが支配的
   ```

5. **採用ブランチの統合テスト**
   - FANOUT-001 の Aggregate Phase 3, Step 3 に準拠し、採用ブランチを統合した後に全体テストを実行する
   - 統合テスト失敗 → 次点ブランチに切り替え or 探索失敗

6. **採用ブランチをレビューに回す**
   - ここから先は通常フロー: 実装者≠レビュアー（CR-1）でレビュー
   - 探索モードで選ばれたからといってレビュー免除にはならない

### Phase 4: Deepen（任意、仕事猫判断）

採用ブランチからさらにフォークして深掘りする。木の深さ（depth）を1段増やす。

```
[Root] ──→ [explore-A: 180ms] ✅ 採用
              ├── [explore-A1: コネクションプール調整] → 150ms?
              └── [explore-A2: キャッシュTTL最適化] → 160ms?
```

**発動条件**:
- 採用ブランチのスコア改善余地があると仕事猫が判断
- 現在の depth < max_depth
- 総司令またはタスク仕様で深掘りが許可されている

**発動しない条件**:
- スコアが十分に良い（目標値を達成済み）
- depth上限に到達
- コスト予算を超過

## Constraints（制約）

```yaml
exploration_constraints:
  max_branches: 3          # 1ノードからのフォーク数上限（コスト制御）
  max_depth: 2             # 木の深さ上限（Phase 4の回数）
  max_iterations_per_branch: 3  # 各現場猫の反復上限
  stale_threshold: 2       # 連続でスコア改善なしの回数 → 打ち切り
  worktree_required: true  # worktree使用必須（isolation保証）
  score_must_be_automated: true  # 手動スコアリング禁止
```

### アプローチ回避ルール

circuit-breakerは外部接続障害用であり、探索モードのアプローチ失敗には適用しない。
代わりに以下の独自ルールで同系統アプローチの無駄な再試行を防ぐ:

- 同系統アプローチが `stale_threshold` 回連続でスコア改善なし → Deepen時にその系統を除外
- 棄却理由は `lessons/` に記録され、次回の探索モード発動時に仕事猫が参照して既知の失敗アプローチを回避

### 並列数の安全制御

各フェーズ（Phase 2, Phase 4）で同時稼働するエージェント数は `max_branches` 以下とする。
Deepen（Phase 4）を開始する前に、前フェーズの現場猫を全員回収してから次フェーズを開始する。
**depth間の並列展開は禁止**。これにより同時稼働は常に max_branches（3）以下に収まり、
猫軍団の並列上限（5体）を超過しない。

```
Phase 2: [genba-A, genba-B, genba-C] → 全員完了 → Select
Phase 4: [genba-D, genba-E] → 全員完了 → Select
※ Phase 2 と Phase 4 は直列実行。同時に走らない
```

### コスト見積り

| 構成 | トークン消費（通常比） |
|------|---------------------|
| 3ブランチ × depth 1 | 約3倍 |
| 3ブランチ × depth 2 | 約6-9倍 |
| 3ブランチ × depth 2 × iterations 3 | 最大約27倍（理論上限） |

**実運用の目安**: 3ブランチ × depth 1 × iterations 2 = 約6倍が現実的な上限。

## Integration with Existing Modules

| Module | 統合方法 |
|--------|---------|
| **fan-out-aggregate (FANOUT-001)** | Phase 3 の収集・集約は FANOUT-001 のフローを再利用。スコア比較テーブルが追加される |
| **3層Watchdog (takt-ralph.md)** | 現場猫内の反復で L1 が発動 → ミニループ打ち切り。全ブランチ失敗 → L2（仕事猫にエスカレーション） |
| **circuit-breaker** | 外部ツール（Bash/MCP等）の接続障害時に適用。アプローチ自体の論理的失敗には適用しない（下記「アプローチ回避ルール」参照） |
| **lessons/ (auto-lessons)** | 棄却ブランチの理由を自動記録。次回の探索モード発動時に参照し、既知の失敗アプローチを回避 |
| **sandbox-agent** | 探索ブランチの現場猫には `full` プロファイルを割り当て（実験にはBash/テスト実行が必要） |
| **completion gates** | 最良ブランチ採用後、通常の完了ゲートを適用。探索モードで選ばれたことはゲート免除の理由にならない |
| **race-prevention (RACE-001)** | ブランチ戦略立案時に、各現場猫の変更対象ファイルが重複しないことを確認 |

## ホワイトボードテンプレート追加セクション

探索モード使用時、ホワイトボードに以下セクションを追加する。

```markdown
## Exploration Tree

**モード**: Exploration (EXPLORE-001)
**スコア関数**: `{command}` ({direction})
**ベースライン**: {score}

### Tree
| Depth | Branch | Approach | Gate | Score | vs Baseline | Status |
|-------|--------|----------|------|-------|-------------|--------|
| 0 | root | (current) | - | {baseline} | - | - |
| 1 | A | {approach} | PASS/FAIL | {score} | {diff}% | BEST/discard/gate-fail |
| 1 | B | {approach} | PASS/FAIL | {score} | {diff}% | BEST/discard/gate-fail |
| 1 | C | {approach} | PASS/FAIL | {score} | {diff}% | BEST/discard/gate-fail |

### Discarded Knowledge
- Branch B: {why discarded, what was learned}
- Branch C: {why discarded, what was learned}
```

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| oyakata-neko | Task assessment | 発動条件3条件を判定。探索モードの選択を承認 |
| shigoto-neko | Setup (Phase 1) | スコア関数定義、ブランチ戦略立案、探索ブリーフ作成 |
| shigoto-neko | Select (Phase 3) | 結果収集、スコア比較、最良選択、棄却知見記録 |
| shigoto-neko | Deepen (Phase 4) | 深掘り判断、追加フォーク指示 |
| genba-neko | Explore (Phase 2) | 各自worktreeで実験、スコア測定、結果報告 |
| kurouto-neko | Post-selection review | 採用ブランチのコードレビュー（通常レビュープロトコル適用） |
