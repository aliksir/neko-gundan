# scripts/ ガイド

> 各スクリプトの役割と重要度。新規追加時は該当カテゴリに追記すること。

## 重要度別分類

### Critical（ゲート・ガード — 品質フローの一部）

| ファイル | 役割 |
|---------|------|
| ~~`commit-guard.mjs`~~ | 削除済み（本番hook `~/.claude/hooks/pre_tool_use/commit-guard.mjs` に統合） |
| `phase-context.mjs` | フェーズ遷移管理（gate-guard連携） |
| `deliverable-check.mjs` | 成果物セット充足チェック |
| `flow-consistency-check.mjs` | フロー定義の整合性検証 |

### 監督（kantoku — 内部監視、公開版に含めない）

| ファイル | 役割 |
|---------|------|
| `kantoku-ledger.mjs` | 逸脱台帳（weight記録） |
| `kantoku-stop.mjs` | AGENT_STOP発動・final-report出力 |
| `kantoku-watchdog.mjs` | 死活監視（60秒ループ） |
| `kantoku-watchdog-silent.vbs` | 同上のコンソール非表示版（Windows用） |
| `drift-check.mjs` | フェーズドリフト検出 |

### 品質（レビュー・検証）

| ファイル | 役割 |
|---------|------|
| `mutation-inject.mjs` | Mutation Review用の変異注入 |
| `mutation-inject-rs/` | 同上（Rust実装） |
| `check-hook-test.mjs` | hook発火テスト実行 |
| `check-hook-test.test.mjs` | 同上のテスト |
| `check-wiring.mjs` | ルール⇔コード結線チェック |
| `check-wiring.test.mjs` | 同上のテスト |

### ユーティリティ（セッション・メトリクス）

| ファイル | 役割 |
|---------|------|
| `session-hours.mjs` | 当日累積稼働時間 |
| `reminder-archive.mjs` | 完了済みリマインダーのアーカイブ |
| `schtasks-health.mjs` | schtasks稼働状況チェック |
| `ledger-append.mjs` | 完了台帳追記 |
| `check-staleness.mjs` | 持ち越し陳腐化チェック |
| `isv-analyze.mjs` | ISV蓄積データ分析 |
| `idd-core.mjs` | 意図ドリフト検出コア |

### セットアップ・インフラ

| ファイル | 役割 |
|---------|------|
| `setup.sh` | 初期セットアップ |
| `install.sh` | インストール |
| `module-config.sh` | モジュール設定 |
| `start-claude.sh` | Claude Code起動 |
| `nightly-runner.mjs` | 夜間自動実行ランナー |

### 監査・チェック

| ファイル | 役割 |
|---------|------|
| `artifact-check.sh` | 成果物存在チェック |
| `check-doc-refs.sh` | ドキュメント参照整合性 |
| `check-update.sh` | 更新チェック |
| `proof-of-work.sh` | 作業証跡検証 |
| `shitsuke-apply.sh` | 躾ルール適用 |
| `stall-detector.sh` | ストール検出 |
| `token-tracker.sh` | トークン使用量追跡 |
| `update-dashboard.sh` | ダッシュボード更新 |
| `validate_framework.py` | フレームワーク検証 |
| `agent-monitor.sh` | エージェント監視 |
