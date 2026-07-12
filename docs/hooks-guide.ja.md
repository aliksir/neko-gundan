# Gate Guard Hook ガイド

← [README](../README.ja.md)に戻る

### Gate Guard Hook（オプトイン）

開始ゲートの構造的コンプライアンスを機械的に強制する。`plans/` または `checklist/` にファイルがない状態でプロジェクトのソースコードを `Edit`/`Write` しようとするとブロックする — 計画フェーズのスキップを物理的に防止。

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit",
        "hooks": [{ "type": "command", "command": "node path/to/hooks/gate-guard.mjs", "timeout": 3 }]
      },
      {
        "matcher": "Write",
        "hooks": [{ "type": "command", "command": "node path/to/hooks/gate-guard.mjs", "timeout": 3 }]
      }
    ]
  }
}
```

`plans/` と `checklist/` ディレクトリ内にプロジェクト名を含むファイルがあるかチェックする。メタディレクトリやメタファイル（CLAUDE.md、handover.md等）はスキップされるので、ゲート成果物自体の作成は妨げない。
