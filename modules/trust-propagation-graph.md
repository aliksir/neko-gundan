# Trust Propagation Graph Module (TPG)

> **Module**: `trust_propagation_graph` | **Default**: OFF | **Scale**: Platoon+

Extends FIDES static trust tagging (HIGH/MEDIUM/LOW) with dynamic propagation tracking via a directed acyclic graph (DAG). Automatically detects paths where LOW-trust data influences HIGH-trust decisions ("trust laundering").

## Relationship to FIDES

```
FIDES (tagging):  What trust level does this data have?
TPG (tracking):   How does that trust level flow through the system?
```

FIDES remains the entry point for trust classification. TPG adds propagation tracking on top.

## Trust Propagation Rules

### Weakest-Link Rule

The output trust level equals the minimum of all input trust levels:

| Input A | Input B | Output |
|---------|---------|--------|
| HIGH | HIGH | HIGH |
| HIGH | MEDIUM | MEDIUM |
| HIGH | LOW | LOW |
| MEDIUM | MEDIUM | MEDIUM |
| MEDIUM | LOW | LOW |
| LOW | LOW | LOW |

### Promotion Override

When LOW data is promoted to MEDIUM via the FIDES promotion procedure (independent source check, local reproduction, schema validation, pattern matching, or commander confirmation), the promoted node is marked `promoted: true` in the graph. Promoted data propagates at MEDIUM level.

## Graph Data Model

```json
{
  "nodes": [
    {
      "id": "tpg_001",
      "trust": "LOW",
      "source": "WebFetch",
      "label": "external API response",
      "ts": "2026-06-19T15:00:00Z"
    }
  ],
  "edges": [
    {
      "from": "tpg_001",
      "to": "tpg_002",
      "operation": "value used in Bash command",
      "agent": "genba-neko-1"
    }
  ]
}
```

## Trust Classification by Tool

| Tool | Trust Level | Rationale |
|------|------------|-----------|
| Read, Grep, Glob | HIGH | Reading project-internal files |
| Edit, Write | HIGH | Modifying project-internal files |
| Bash (git, npm, cargo) | MEDIUM | Local tool execution, output not externally controlled |
| Bash (curl, wget) | LOW | External network access |
| WebFetch, WebSearch | LOW | External data retrieval |
| MCP (external servers) | LOW | External tool execution |
| MCP (internal: code-graph, search-yoshi) | MEDIUM | Internal tool, project-scoped data |

## Contamination Detection

The TPG guard hook checks for contamination paths before executing potentially destructive Bash commands. A contamination path exists when:

1. A recent tool result (within last 5 nodes) has trust level LOW
2. The current Bash command is an execution-type command (not read-only)

### Guard Behavior

- **Warning mode** (default): stderr warning + exit 0 (non-blocking)
- **Block mode** (future, via `TPG_MODE=block`): exit 2 (blocking)

### Execution-type Commands (trigger guard check)

`git push`, `git commit`, `rm`, `curl`, `wget`, `npm publish`, `node -e`, `python -c`

### Read-only Commands (skip guard)

`git status`, `git log`, `git diff`, `ls`, `cat`, `wc`, `echo`

## Graph Storage

- **Location**: `~/.claude/tpg-session.json`
- **Lifecycle**: Created on first tool call, overwritten on next session start
- **Size limit**: 500 nodes maximum (FIFO eviction of oldest nodes)
- **Format**: JSON (see data model above)

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| tpg-tracker.mjs | PostToolUse (all tools) | Record tool result as graph node |
| tpg-guard.mjs | PreToolUse (Bash only) | Check for LOW contamination in recent context |
| shigoto-neko | Task assignment | Include trust context in handoff instructions |
| kurouto-neko | Review | Verify no unverified LOW data influenced implementation decisions |

## Trust Score Decay (v2)

Ancient nodes' trust levels step-decay toward MEDIUM based on position (node index), reducing false positives from old LOW data that is no longer contextually relevant. Uses a step function (not continuous gradient) since trust levels are discrete 3-values.

### Decay Function

```
effectiveTrust(node, index, total):
  age = total - 1 - index
  if age < 5: return node.trust          // 直近5ノードは減衰なし
  decayFactor = max(0, 1 - (age - 5) / 20)
  return decayFactor > 0.5 ? node.trust : 'MEDIUM'
```

### Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| NO_DECAY_WINDOW | 5 | No decay for the most recent 5 nodes |
| DECAY_WINDOW | 20 | Full decay occurs 25 nodes back |
| Decay target | MEDIUM | Both LOW and HIGH converge to MEDIUM |

### Applied In

- **tpg-guard.mjs**: Uses effectiveTrust when checking contamination paths (LOOKBACKウィンドウ内のみ。直近5ノードのLOWは即警告、6+ノード前は減衰でMEDIUM扱い）
- **tpg-tracker.mjs**: Records original trust level without decay (保存時は減衰なし)
- **kurouto-neko Q5-DT**: Reviews raw trust values in session file (レビュー時は生データ参照)

## v3 Extensions

### Cycle Detection (v3.1)

tpg-tracker.mjs にエッジ追加前の循環参照検出を追加。反復DFSで到達可能性を判定し、循環検出時はエッジ追加をスキップして stderr 警告を出力する。現行の線形チェーン構造では循環は発生しないが、将来の handoff_schema 統合でクロスエージェントエッジが追加された際の安全弁として機能する。

### ISV Drift Event Integration (v3.2)

IDD（Intent Drift Detector）がWARNING/ALERTを検出した際、ドリフトイベントを `~/.claude/isv-drift-log.jsonl` にJSONL形式で追記する。ISV分析スクリプト（isv-analyze.mjs）がこのログを読み取り、タスク成功/失敗パターンとドリフト傾向を相関分析できる。

Event schema:
```json
{"type":"drift_event","ts":"...","drift_level":"WARNING","drift_angle":32.5,"similarity":0.65,"tool_count":15,"anchor_count":0,"intent_vector":{...}}
```

### Handoff Schema Trust Context (v3.3, spec only)

handoff_schema モジュールのハンドオフデータに `trust_context` フィールドを追加する仕様。handoff-schema.md に統合済み（v3.3, 2026-06-20）。

```yaml
trust_context:
  effective_trust: "MEDIUM"    # ハンドオフ時点の実効信頼レベル
  low_node_count: 2            # 直近ウィンドウ内のLOWノード数
  contamination_path: false    # 汚染パスの有無
  tpg_snapshot_id: "tpg_xxx"   # TPGグラフのスナップショットID
```

## Limitations

- Tracks tool-level data flow only (not internal reasoning chains)
- Cannot detect trust contamination within a single prompt (only across tool calls)
- Session-scoped (no cross-session persistence)
- Warning-only mode by default (does not block operations)
- Trust decay is position-based (node index), not time-based
- Cycle detection overhead: O(V+E) per edge addition (V<=500, negligible)

## Version Changelog（必須セクション — 猫会議 2026-06-19 指摘対応）

> バージョンアップ時は「何を変えたか」だけでなく**「前バージョンの何が不十分で、なぜこの変更が必要だったか」**を記録する。
> 1日に複数バージョンが出る場合は特に、各バージョン間の「捨てた理由」を明文化すること（電話猫+やさぐれ猫指摘）。

| Version | Date | What Changed | Why Previous Was Insufficient |
|---------|------|-------------|-------------------------------|
| v1.0 | 2026-06-19 | 基本実装: ノード追加・エッジ追加・weakest-link伝搬・汚染パス検出 | N/A（初期実装） |
| v2.0 | 2026-06-19 | 信頼スコア減衰（effectiveTrust）+ kurouto Q5-Data-Trust追加 | v1は信頼レベルが固定値でノード位置による劣化を表現できなかった。長い伝搬チェーンで信頼が過大評価されるリスク |
| v3.0 | 2026-06-19 | 循環参照検出（hasCycle）+ ISV連携（formatDriftEvent）+ handoff_schema trust_context仕様 | v2はDAG前提だったが実運用で循環エッジが発生しうることが判明。ISVとの接続がなく意図逸脱とデータ信頼の相関分析が不可能だった |
