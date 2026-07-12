# 猫軍団 Hooks

## ソース vs デプロイ

このディレクトリ (`multi-agent-neko/hooks/`) は hook スクリプトの**ソース**。
実際に Claude Code が実行するのは `~/.claude/hooks/` にデプロイされたコピー。

```
multi-agent-neko/hooks/   ← ソース（このリポジトリ）
~/.claude/hooks/          ← デプロイ先（settings.json が参照）
```

## 同期手順

ソースを変更したら、デプロイ先にコピーする:

```bash
# 個別コピー
cp multi-agent-neko/hooks/commit-guard.mjs ~/.claude/hooks/pre_tool_use/
cp multi-agent-neko/hooks/gate-guard.mjs ~/.claude/hooks/pre_tool_use/

# 確認
diff multi-agent-neko/hooks/commit-guard.mjs ~/.claude/hooks/pre_tool_use/commit-guard.mjs
```

## Hook 一覧と責務

| ファイル | イベント | 責務 |
|---------|---------|------|
| `commit-guard.mjs` | PreToolUse(Bash) | git commit 前に成果物セット（7種+checklist）の存在を検証。コード変更時のみ checklist を必須化 |
| `gate-guard.mjs` | PreToolUse(Edit/Write) | ファイル編集前に計画書の存在を検証 |
| `artifact-reminder.mjs` | PostToolUse(Write) | ファイル書き込み後に不足成果物を警告（非ブロック） |
| `kill-switch.sh` | PreToolUse(*) | `~/.claude/AGENT_STOP` 存在時に全ツール停止 |
| `steer.sh` | PreToolUse(*) | `~/.claude/STEER.md` の内容を 1 回 surface |
| `lifecycle.sh` | lifecycle | エージェント追加時の初期化 |
| `post-tool-lint.sh` | PostToolUse | lint フィードバック |

## 成果物チェックの責務分担

```
commit-guard.mjs  → git commit をブロック（成果物不足時）
gate-guard.mjs    → Edit/Write をブロック（計画書不在時）
artifact-reminder  → Write 後に警告（非ブロック、気づき用）
artifact-check.sh  → 完了ゲート時にスクリプト実行（機械検証）
```

checklist の必須条件: **コード変更時のみ必須**（commit-guard 準拠）。
ドキュメントのみの変更時は不要。
