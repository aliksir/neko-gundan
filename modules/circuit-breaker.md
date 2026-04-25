# サーキットブレーカー（エージェント障害制御）

> `rules/takt-ralph.md` から分離。外部CLI/MCPツールの障害時に無限リトライを防止する3状態モデル。

## 状態遷移

```
CLOSED（正常）→ 連続3回失敗 → OPEN（遮断）→ 60秒経過 → HALF-OPEN（試行）
                                                              ↓
                                                        成功 → CLOSED
                                                        失敗 → OPEN
```

## 状態別の動作

| 状態 | 動作 | 猫軍団での対応 |
|------|------|--------------|
| CLOSED | 通常実行 | そのまま作業続行 |
| OPEN | リクエスト即失敗（実行しない） | 代替手段に切り替え or 仕事猫に報告 |
| HALF-OPEN | 1リクエストだけ試行 | 成功→CLOSED、失敗→OPEN |

## 適用対象
- `codex exec` のタイムアウト・エラー
- `gemini -p` のAPI障害
- MCPツールの応答なし
- 外部WebFetch/WebSearchの連続失敗

## 代替手段マップ
| 障害対象 | 代替手段 |
|---------|---------|
| Codex | Claude Code内で直接実装（規模縮小） |
| Gemini | WebSearch or WebFetch で代替 |
| MCP | 対応するCLIコマンド or 手動操作 |

「3回失敗したら同じことを繰り返さない。別の手段を探す」

## Cluster-Level Circuit Breaker（Galileo AI, 2025）

接続単位のサーキットブレーカーを拡張し、関連するエージェント/ツールをグループ単位で遮断する。

### クラスター定義
- 外部CLIクラスター: {codex, gemini, takt}
- MCPクラスター: {同一MCPサーバーの全ツール}
- WebFetchクラスター: {WebFetch, WebSearch}

### 動的閾値
```
threshold = max(3, ceil(success_rate_last_10 * 5))
```

### 段階的復旧
1. HALF-OPEN: 1件のプローブリクエスト
2. **WARMING**: プローブ成功→30%のリクエストを2分間許可
3. **CLOSED**: WARMING成功→100%復旧

### クラスターカスケードルール
1. クラスターOPEN → 使用中の全エージェントに通知
2. エージェントは代替手段に切り替え
3. クラスター復旧時に通知→元のツールに復帰可能
