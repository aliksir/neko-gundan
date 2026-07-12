# アップデートガイド

← [README](../README.ja.md)に戻る

## アップデート

既にインストール済み？ neko-gundanを最新にして差分を確認:

```bash
cd neko-gundan && git pull
bash scripts/install.sh --update all ./your-project
```

変更があるファイルごとにdiffを表示し、上書きするか手元を維持するか選べる。カスタマイズしていないファイルはそのまま更新される。

**ファイル種別ごとの推奨マージ戦略:**

| ファイル種別 | 戦略 | 理由 |
|------------|------|------|
| `rules/*.md` | upstream優先 | プロトコル改善を取り込む。カスタマイズはconfigで行う |
| `agents/*.md` | upstream優先 | エージェント動作の更新。PJ固有の調整はCLAUDE.mdで |
| `modules/*.md` | upstream優先 | モジュール定義はフレームワーク管理 |
| `neko-gundan.config.yaml` | **ローカル優先** | あなたのPJのモジュールON/OFF設定 |
| `CLAUDE.md` スニペット | **手動確認** | 新機能とPJ固有の指示をマージ |
| `scripts/*.sh` | upstream優先 | バグ修正と新機能 |

## アップデート確認

インストーラは `~/.claude/.neko-gundan-manifest.json` にインストール済みのモードとファイル一覧を記録する。アップデート確認スクリプトはこれを使って新バージョンを通知する。

**手動チェック:**

```bash
bash neko-gundan/scripts/check-update.sh
# キャッシュを無視して即時チェック:
bash neko-gundan/scripts/check-update.sh --force
```

新バージョンがある場合:

```
🔔 猫軍団: 新バージョン v1.8.0 が利用可能です（現在: v1.7.0）
   インストール済みモード: quality+implement
   → bash neko-gundan/scripts/install.sh --update quality+implement ./your-project
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

バックグラウンドで実行され、更新がある場合のみ通知する。自動更新はしない。

**注意事項:**
- チェック結果は24時間キャッシュ（`~/.claude/.neko-gundan-update-cache`）
- curlが使えない環境はサイレント終了（エラーにならない）
- マニフェスト（`~/.claude/.neko-gundan-manifest.json`）はインストーラが自動生成する
