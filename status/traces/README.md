# 3層トレースログ（AgentTrace方式）

エージェントの動作を3層で構造化記録する。デバッグ・振り返り・品質改善に活用。

## 3層構造

| 層 | 記録内容 | 例 |
|----|---------|-----|
| **cognitive** | 判断・推論の過程 | 「A案 vs B案を比較→B案を選択（理由: テスト容易性）」 |
| **operational** | 実行したアクション | 「Edit: src/app.js L42-50」「Bash: npm test → PASS」 |
| **contextual** | 環境・前提条件 | 「コンテキスト使用率: 45%」「依存タスク: 現場猫Aの完了待ち」 |

## ログファイル命名規則

```
traces/YYYYMMDD_HHMMSS_{agent-role}_{task-id}.md
```

例: `traces/20260307_143000_genba-neko-A_task-42.md`

## テンプレート

```markdown
# Trace: {task-id}
**エージェント**: {role}
**開始**: {timestamp}
**タスク**: {description}

## cognitive (判断ログ)
- [{time}] {decision}: {reasoning}

## operational (実行ログ)
- [{time}] {action}: {target} → {result}

## contextual (環境ログ)
- context_usage: {pct}%
- dependencies: [{dep_list}]
- blockers: [{blocker_list}]
```

## 運用ルール

- **いつ書くか**: 中隊以上の作戦で、仕事猫が「トレースあり」と指示した場合
- **誰が書くか**: 各現場猫が自分のトレースを記録
- **保持期間**: 7日後に自動削除（手動アーカイブ可）
- 通常の小隊作業ではトレース不要（オーバーヘッド回避）
