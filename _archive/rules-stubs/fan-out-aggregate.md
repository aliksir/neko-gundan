# Fan-Out/Aggregate Module (FANOUT-001)

> **Module**: `fan_out_aggregate` | **Default**: ON | **Scale**: Platoon+

Structured collection and integration of parallel agent results.

**Full definition**: `modules/fan-out-aggregate.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | Task decomposition (pre-dispatch) | 各現場猫の出力契約と集約粒度を定義 |
| shigoto-neko | Post-all-completion (collect phase) | 全現場猫の完了報告を収集チェックリストで構造化 |
| shigoto-neko | Aggregate phase | 矛盾・重複チェック → マージ判定 → 統合テスト → ホワイトボード更新 |
| shigoto-neko | Pre-completion-gate | Aggregation Result が ✅ Merged であることを確認 |
| genba-neko | Post-work (completion report) | 出力契約に従った構造化報告（files_changed, tests, findings） |
