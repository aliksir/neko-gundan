# Autopilot Module

> **Module**: `autopilot` | **Default**: ON | **Scale**: Squad+

計画承認後〜完了報告までの自動実行モード。

**Full definition**: `modules/autopilot.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| oyakata-neko | Post-plan-approval | 承認判定→autopilot起動宣言。途中報告省略（停止条件発生時を除く） |
| oyakata-neko | On stop condition | autopilot中断→総司令に状況報告+対応案提示 |
| shigoto-neko | Design review | APPROVE→自動続行、REQUEST_CHANGES→自動修正→再レビュー |
| shigoto-neko | tier2 check | 計画書の具体的記載と照合→記載済み=自動パス、記載外/曖昧=停止 |
| shigoto-neko | Test plan | 自動作成→自動実行 |
| shigoto-neko | Squad review | 別エージェントspawnで/simplify（CR-1維持） |
| shigoto-neko | Completion gate | 全項目実行（自動パス不可） |
| shigoto-neko | On stop condition | 親方猫にSendMessageで報告（総司令には直接報告しない） |
| kurouto-neko | Review | 通常通りレビュー実行 |
