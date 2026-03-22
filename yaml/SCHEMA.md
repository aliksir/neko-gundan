# YAML Schema Definition for Neko-Gundan

## Gate Schema
```yaml
gate:
  name: string           # ゲート名
  scale: string          # squad / platoon / all
  items_count: number    # 項目数
  execution:             # 実行手順
    forced_read: boolean
    sequential: boolean
  items:
    - id: number
      check: string      # チェック項目名
      method: string     # 確認方法
      evidence: string   # 証跡形式（オプション）
```

## Agent Schema
```yaml
agent:
  name: string           # エージェント名
  role: string           # lead / manager / worker / reviewer
  model: string          # opus / sonnet
  persona:
    character: string    # キャラ名
    traits: [string]     # 性格特性
    speech: [string]     # 口癖
  tools: [string]        # 使用可能ツール
  critical_rules: [string]  # 必須ルール（CR-1等）
  steps:
    - id: number
      name: string       # ステップ名
      actions: [string]  # 具体アクション
      condition: string  # 実行条件（オプション）
  rubric:                # レビュールブリック（reviewer only）
    aspects:
      - name: string
        weight: number
        criteria: string
```

## Module Schema (rules/ pointer)
```yaml
module:
  name: string           # モジュール名
  id: string             # モジュールID（HEARTBEAT-001等）
  default: string        # ON / OFF
  scale: string          # All / Squad+ / Platoon+ / Battalion
  description: string    # 1行説明
  full_definition: string  # 詳細定義ファイルパス
  integration_points:
    - agent: string
      phase: string
      action: string
```

## Module Detail Schema (modules/ full)
```yaml
module_detail:
  name: string
  id: string
  default: string
  scale: string
  why: string            # 導入理由
  procedures:
    - id: number
      name: string
      steps: [string]
  templates:             # テンプレート（オプション）
    - name: string
      format: string
  integration_points:
    - agent: string
      phase: string
      action: string
```
