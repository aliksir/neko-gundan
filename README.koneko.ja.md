# 子猫軍団 — PROプラン向け猫軍団ライト版

**[English version](README.koneko.md)** | **[フル版猫軍団（MAX 5+）](README.ja.md)**

> 猫軍団の品質原則を、PROプランのトークン予算に収まるサイズで。

## 子猫軍団とは？

子猫軍団（koneko）は、Claude Codeの**PROプラン**ユーザー向けの猫軍団ライト版です。フル版猫軍団は複数エージェントを並列に動かす（タスクあたり3-5回のAgent呼び出し）ため、PROのトークン上限をすぐに消費してしまいます。子猫軍団なら、核心的な品質メリットを**タスクあたりAgent呼び出し1回**で得られます。

## 何が残り、何が削られるか

| 機能 | 子猫軍団 | フル版猫軍団 |
|------|---------|------------|
| 独立レビュアー | 1体 軽量版（`koneko-neko`） | 1体 フル版（`kurouto-neko`） |
| 完了ゲート | 3項目 | 7項目 |
| 安全Tier | あり | あり |
| ファイル削除安全（`_deleted/`） | あり | あり |
| 実装者≠レビュアー | あり | あり |
| レビュールブリック | 3観点 | 5観点 |
| エージェント階層（親方/仕事/現場） | なし | あり |
| 並列実行（TeamCreate） | なし | あり |
| モジュール（しつけ） | なし | 15モジュール |
| ホワイトボード / ダッシュボード | なし | あり |

**子猫軍団は原則を残す。儀式を削る。**

## クイックスタート

```bash
git clone https://github.com/aliksir/neko-gundan.git
bash neko-gundan/scripts/install.sh koneko ./your-project
```

4ファイルだけインストール。表示されるCLAUDE.mdスニペットを追加すれば完了。

## 使い方

```
コードを書く
    ↓
子猫ゲート実行（証跡付き3項目チェック）
    ↓
koneko-nekoを起動してレビュー（Agent呼び出し1回）
    ↓
指摘があれば修正 → 完了
```

階層なし、儀式なし。ただ: **実装 → ゲート → レビュー → 完了。**

### 3つの子猫ゲート

「完了」と言う前に、この3つを証跡付きでチェック（「確認した」ではなく出力を貼る）:

| # | チェック | 方法 |
|---|---------|------|
| 1 | 動く | テスト実行 or 手動確認 |
| 2 | 意図しない変更がない | `git diff` で対象ファイルのみ |
| 3 | クリーンな状態 | `git status` で忘れ物なし |

### 3観点レビュー

koneko-nekoは3つの観点でレビュー:

| 観点 | PASS | FAIL |
|------|------|------|
| 正確性 | 意図通りに動作する | 未テストまたは壊れている |
| 安全性 | インジェクション/XSS/認証リスクなし | 脆弱性あり |
| テスト | 主要パスが検証済み | 全く検証されていない |

レビューは1回。指摘があれば直して、次へ。

## トークン予算

| アクション | コスト |
|-----------|--------|
| 子猫ゲート（セルフチェック） | ~0（プロンプトルールのみ） |
| koneko-nekoレビュー | ~Agent呼び出し1回 |
| 安全ルール | ~0（プロンプトルールのみ） |
| **タスクあたり合計** | **~Agent呼び出し1回** |

フル版猫軍団（中隊）= タスクあたり3-5回のAgent呼び出し。

## フル版猫軍団へのアップグレード

MAX 5+に移行したら、モードを追加:

```bash
bash install.sh quality ./your-project      # フルレビュアー
bash install.sh implement ./your-project    # 並列ワーカー
bash install.sh plan ./your-project         # 戦略立案
```

子猫軍団のファイルは競合しない。フル版に自然に置き換わる。

## フル版猫軍団からのダウングレード

フル版を使っていてPROに切り替える場合:

```bash
bash neko-gundan/scripts/install.sh --downgrade koneko ./your-project
```

不要ファイルは `_deleted/neko-gundan-YYYYMMDD/` に安全退避（即削除しない）。戻したくなったらいつでも復元可能。

## アップデート確認

子猫軍団をインストールすると、インストーラが `~/.claude/.neko-gundan-manifest.json`（mode: `koneko`）にセットアップ情報を記録する。アップデート確認スクリプトはこれを使って新バージョンを通知する。

**手動チェック:**

```bash
bash neko-gundan/scripts/check-update.sh
# キャッシュを無視して即時チェック:
bash neko-gundan/scripts/check-update.sh --force
```

新バージョンがある場合:

```
🔔 猫軍団: 新バージョン v1.8.0 が利用可能です（現在: v1.7.0）
   インストール済みモード: koneko
   → bash neko-gundan/scripts/install.sh --update koneko ./your-project
```

**セッション開始時の自動チェック（オプトイン）:**

Claude Codeの設定ファイル（`~/.claude/settings.json`）に追加:

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

バックグラウンドで実行され、更新がある場合のみ通知する。デフォルトはOFF。

## 制限事項

- **並列エージェントなし** — 全作業は逐次実行
- **レビュー1回** — 往復レビューループなし
- **3観点ルブリック** — 保守性とPurpose整合性は省略
- **モジュール非対応** — しつけシステム使用不可
- **重量級機能なし（v1.10.x–v1.11.x）** — Adversarial 2nd-Pass / Evidence Level Ladder / Exploration mode / nightly-runner / kill-switch・steer hooks / Dynamic Workflows はフル版猫軍団のみ

これらは意図的なトレードオフ。必要になったら[フル版猫軍団](README.ja.md)にアップグレード。
