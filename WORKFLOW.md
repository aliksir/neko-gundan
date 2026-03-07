# 猫軍団 ワークフロー定義

> 既存の `~/.claude/workflows/*.md` は汎用フロー。このファイルは**猫軍団固有の拡張**のみを定義する。

---

## フェーズ一覧

```
PLAN → SETUP → EXECUTE → REVIEW → VERIFY → REPORT
```

### PLAN（計画フェーズ）

| 項目 | 内容 |
|------|------|
| 担当 | 親方猫 (oyakata-neko) |
| 開始条件 | 総司令からのタスク受領 |
| 終了条件 | Milestone / Wave / Task に分解完了、成功基準定義済み |
| 成果物 | `status/dashboard.md`、TaskCreate 完了 |
| 計画ゲート | スコープ外の明示 + 定量的な成功基準（CLAUDE.md参照） |

### SETUP（準備フェーズ）

| 項目 | 内容 |
|------|------|
| 担当 | 仕事猫 (shigoto-neko) |
| 開始条件 | PLANフェーズ完了 |
| 終了条件 | 各現場猫へのタスク割り当て完了、依存関係整理済み |
| 成果物 | TaskUpdate (owner + blockedBy 設定)、ホワイトボード初期化 |
| Concurrencyチェック | spawn前に `config/concurrency.json` を参照（必須） |

### EXECUTE（実行フェーズ）

| 項目 | 内容 |
|------|------|
| 担当 | 現場猫 (genba-neko) / 玄人猫 (kurouto-neko) |
| 開始条件 | blockedBy タスクがすべて completed |
| 終了条件 | 担当タスクの実装完了 + 自己確認（完了ゲート通過） |
| 成果物 | 実装ファイル、TaskUpdate (completed)、仕事猫への報告 |
| Stall対策 | `scripts/stall-detector.sh` が300秒無更新を検知（後述） |

### REVIEW（レビューフェーズ）

| 項目 | 内容 |
|------|------|
| 担当 | 仕事猫（実装者とは別） |
| 開始条件 | EXECUTEフェーズの成果物受領 |
| 終了条件 | 承認 または 差し戻し（指摘リスト作成） |
| 成果物 | レビューレポートファイル（Context Rot対策でファイル経由） |
| 制約 | **edit: false**（コード改変禁止、指摘のみ） |

### VERIFY（検証フェーズ）

| 項目 | 内容 |
|------|------|
| 担当 | QA猫（Opusモデル、実装者とは別） |
| 開始条件 | REVIEWフェーズ承認後 |
| 終了条件 | 完了ゲート全項目通過 + **Proof of Work検証PASS** |
| 成果物 | QAレポート、テスト結果、**PoW結果JSON** |
| 完了ゲート | Read確認 + Grep確認 + 動作テスト + 報告の誠実性（CLAUDE.md参照） |

#### Proof of Work（機械的検証ゲート）

タスク完了の「主張」ではなく「証拠」で判定する。VERIFYフェーズで必ず実行：

```bash
bash scripts/proof-of-work.sh <project_dir> --task-id <task_id> --review-complete
```

検証ゲート:
- **test_pass**: テストスイート全通過
- **build_success**: ビルドコマンド exit 0
- **review_complete**: 実装者以外のレビュー完了
- **no_regressions**: 既存テストが壊れていない

結果: `status/proof-of-work/{task_id}-{date}.json`

- 全ゲートPASS → `PROOF_VERIFIED` → 完了宣言OK
- 1つでもFAIL → `PROOF_FAILED` → 完了宣言禁止

### REPORT（報告フェーズ）

| 項目 | 内容 |
|------|------|
| 担当 | 仕事猫 → 親方猫 |
| 開始条件 | VERIFYフェーズ完了 |
| 終了条件 | 総司令への最終報告完了 |
| 成果物 | `C:\work\result\YYYYMMDD_{プロジェクト名}.md`、送信メッセージ |

---

## Stall Policy（停止検出ポリシー）

### 判定基準
- `in_progress` 状態のタスクが **300秒（5分）** 更新なし → **stall（停止）判定**
- 検出スクリプト: `scripts/stall-detector.sh`（30秒間隔でポーリング）

### 対応フロー
```
stall検出
  → [1] 仕事猫 ping（SendMessage で確認）
  → [2] 応答なし（30秒待機）→ shutdown_request 送信
  → [3] 応答なし → respawn（新しいエージェントで再担当）
  → [4] 5回失敗 → 親方猫へエスカレーション
```

### アラートファイル
アラートは `status/alerts/` 以下に出力:
```json
{
  "type": "stall",
  "task_id": "タスクID",
  "agent": "エージェント名",
  "stalled_since": "ISO8601タイムスタンプ",
  "detected_at": "ISO8601タイムスタンプ"
}
```

---

## Concurrency Policy（並列数制限ポリシー）

設定ファイル: `config/concurrency.json`

### spawn前の必須チェック
1. 全エージェント合計が `max_concurrent_agents`（5）を超えないか
2. 役割別上限を超えないか（oyakata:1, shigoto:2, genba:4, kurouto:2）
3. `in_progress` 状態のタスクが4件以内か

**spawn前チェックは必須。超過する場合はキューで待機させること。**

---

## Quality Gate（品質ゲート）

レビューループプロトコル（takt由来、猫軍団QAに統合済み）:

1. **実装者 ≠ レビュアー**: 書いた猫が自分でレビューしない
2. **レビュアーは読み取り専用**: `edit: false`。コード改変禁止、指摘のみ
3. **ループ上限3回**: 3サイクル超過で仲裁者（Opus）が介入

```
implement → review(edit:false) → [問題あり] → fix → review → ... (最大3回)
                                  [問題なし] → supervise → COMPLETE
```

---

## Token Budget（トークン予算）

### 計測方式
- **作業時間プロキシ**: 実際のトークン数は取得困難なため、**作戦の経過時間**を代替指標とする
- 計測スクリプト: `scripts/token-tracker.sh`

### 使い方
```bash
# 作戦開始時
bash scripts/token-tracker.sh start "作戦名"

# 作戦終了時
bash scripts/token-tracker.sh stop "作戦名"

# 状態確認
bash scripts/token-tracker.sh status "作戦名"
```

出力先: `status/token-usage/{作戦名}-{日付}.json`

---

## 既存ワークフローとの関係

| ファイル | 役割 |
|---------|------|
| `~/.claude/workflows/bug-fix.md` | バグ修正の汎用フロー |
| `~/.claude/workflows/new-feature.md` | 機能追加の汎用フロー |
| `~/.claude/workflows/refactor.md` | リファクタリングの汎用フロー |
| `~/.claude/workflows/security-audit.md` | セキュリティ監査の汎用フロー |
| `~/.claude/workflows/research.md` | 調査・研究の汎用フロー |
| **このファイル** | **猫軍団固有の拡張**（Stall検出、Concurrency、QAゲート、Token追跡） |

**原則**: 汎用フローと猫軍団拡張を組み合わせて使う。重複定義は避ける。
