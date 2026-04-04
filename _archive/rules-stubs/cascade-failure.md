# Cascade Failure Module (CASCADE-001)

> **Module**: `cascade_failure` | **Default**: ON | **Scale**: Platoon+

Task dependency declaration and automatic blocking on upstream failure.

**Full definition**: `modules/cascade-failure.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | Task decomposition (pre-dispatch) | ホワイトボードにタスク依存グラフを記述。循環依存チェック |
| shigoto-neko | Progress monitoring (polling) | FAIL検知時にcascade判定を実行。BLOCKEDタスクの現場猫に中断指示 |
| shigoto-neko | Post-fix | 依存先修正完了後、BLOCKEDタスクをPENDINGに戻して再開指示 |
| genba-neko | Pre-work | ホワイトボードの依存グラフで自タスクの依存先状態を確認 |
| genba-neko | On BLOCKED notification | 作業を中断し、仕事猫の再開指示を待つ |
