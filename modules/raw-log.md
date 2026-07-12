# Raw Log Module

> **Module**: `raw_log` | **Default**: OFF | **Scale**: Squad+ | **Config**: `neko-modules.yml` → `evidence.raw_log`

Full audit trail of every agent action — what was read, changed, executed, and decided. For engineers who want to see **exactly** what the agent did, not just the summary.

"What did you check before saying YOSHI?"

## Why

Completion gates prove **what was checked**. Raw logs prove **what was done**. When you need to explain every line change to a stakeholder, the report isn't enough — you need the full diff, every command output, and the reasoning behind each decision.

## Output

One file per mission, generated **after work is complete** (not during execution).

```
logs/raw-{mission-name}-{YYYYMMDD}.md
```

## Output Format

ctrl+O（コンテキストビューア）で見える情報と同等の粒度で、全ツールコールを1行ずつ記録する。
**要約禁止。省略禁止。全件記録が最優先。**

```markdown
# Raw Log: {Mission Name}
**Date**: YYYY-MM-DD HH:MM
**Scale**: {squad/platoon/battalion}
**Team**: {agent list}

## Actions

- Read: <project>/src/main.js (250行)
- Read: <project>/package.json (32行)
- Glob: src/**/*.jsx → 8 files
- Grep: "useState" in src/ → 12 matches in 5 files
- Edit: <project>/src/main.js L15-20 — import追加
- Edit: <project>/src/main.js L45-80 — handleSubmit関数書き換え
- Write: <project>/src/utils/helper.js (新規, 35行)
- Bash: cd <project> && npm install (exit:0)
- Bash: cd <project> && npm run build (exit:0)
- Bash: cd <project> && npm test (exit:1, FAIL: 2/15)
- Decision: テスト失敗はimportパスの変更漏れ → helper.jsのexportを修正
- Edit: <project>/src/utils/helper.js L12 — export名修正
- Bash: cd <project> && npm test (exit:0, PASS: 15/15)
- SendMessage: → genba-neko-1 "テスト修正完了、再レビュー依頼"
- Agent: genba-neko-1 (worktree, background) "エッジケーステスト追加"
- Skill: /simplify → 変更ファイル3件レビュー
```

### 記録ルール

| ルール | 内容 |
|--------|------|
| **全件記録** | Read/Write/Edit/Bash/Grep/Glob/Agent/Skill/MCP等、**全てのツールコールを1件ずつ記録**。省略・まとめ・要約禁止 |
| **1行1アクション** | `- Read: {path} ({行数})` のようにツール名+対象+結果を1行で。リストマーカー `- ` 付き |
| **結果を含める** | Bash→exit code、Grep→match数、テスト→pass/fail数 |
| **失敗も記録** | エラー���リトライ・失敗した試行も全て記録（むしろ重要） |
| **Decisionは理由付き** | 判断・選択をした箇所は `- Decision:` で理由を1行記録 |
| **Readも全件** | ファイル読み込みは全て記録。「10ファイル読んだ」ではなく各ファイルを1行ずつ |

### ツール別フォーマット

| Action | Format |
|--------|--------|
| **Read** | `- Read: {path} ({N}行)` / `- Read: {path} L{start}-{end}` |
| **Edit** | `- Edit: {path} L{line} — {何を変えたか}` |
| **Write** | `- Write: {path} (新規, {N}行)` / `- Write: {path} (上書き, {N}行)` |
| **Bash** | `- Bash: {command} (exit:{code})` 失敗時は `(exit:{code}, {エラー要約})` |
| **Grep** | `- Grep: "{pattern}" in {path} → {N} matches in {M} files` |
| **Glob** | `- Glob: {pattern} → {N} files` |
| **Decision** | `- Decision: {何を判断したか} → {選んだ結果と理由}` |
| **SendMessage** | `- SendMessage: → {recipient} "{要約}"` |
| **Agent** | `- Agent: {name} ({options}) "{task}"` |
| **Skill** | `- Skill: /{name} → {結果要約}` |
| **MCP** | `- MCP: {tool_name}({params要約}) → {結果要約}` |

### トークン使用量・タイミング記録（オプショナル）

着想元: open-multi-agent の `onTrace`（全LLMコール・ツール実行にタイミング+トークン使用量を自動記録するspan構造）。
猫軍団ではコード内自動計測ではなく、現場猫がハンドオフ時に自己申告する形式で導入する。

#### いつ記録するか

- **全エージェント**: ハンドオフ（完了報告）時にセッション全体のサマリーを記録
- **記録は任意だが推奨**: トークン情報が取得できない場合は省略可。タイミングは作業開始〜完了の経過時間で代用可

#### セッションサマリーフォーマット

完了報告の末尾に以下を付与する:

```yaml
resource_usage:
  duration_min: 12        # 作業開始〜完了の経過時間（分）
  tokens:
    input: 45200          # 入力トークン数（概算可）
    output: 8300          # 出力トークン数（概算可）
    cache_read: 38000     # キャッシュ読み取りトークン数（取得可能な場合）
  tool_calls: 47          # ツールコール総数
  errors: 2               # エラー発生回数
```

#### ログ内フォーマット（詳細記録が必要な場合）

高コストなツールコール（外部API・大規模Bash等）に限り、個別タイミングを記録してよい:

```markdown
- Bash: npm run build (exit:0) [23.4s]
- Agent: genba-neko-2 (worktree, background) "テスト追加" [4.2min]
- MCP: playwright-browser__navigate("https://...") → OK [8.1s]
```

角括弧 `[{duration}]` を行末に付与する。単位は秒(`s`)または分(`min`)。

#### 集計セクション（生ログ末尾）

仕事猫がraw-log生成時に、全エージェントのresource_usageを集計してログ末尾に追加する:

```markdown
## Resource Summary

| Agent | Duration | Input Tokens | Output Tokens | Cache Tokens | Tool Calls | Errors |
|-------|----------|-------------|---------------|-------------|------------|--------|
| shigoto-neko | 8min | 32,000 | 6,100 | 28,000 | 35 | 0 |
| genba-neko-1 | 12min | 45,200 | 8,300 | 38,000 | 47 | 2 |
| genba-neko-2 | 10min | 38,500 | 7,200 | 31,000 | 42 | 1 |
| **Total** | **30min** | **115,700** | **21,600** | **97,000** | **124** | **3** |
```

この集計は完了ゲート後のメトリクス記録にも活用できる（`metrics/` へのインプット）。

## Generation Procedure

### Genba-neko: Record During Work

During execution, keep a mental note of actions taken. No file writes during work — just remember what you did. At handoff time, include a **structured action list** in your completion report:

```yaml
actions:
  - tool: Edit
    file: src/checks/inbound.js
    line: 31
    diff: |
      + /\b(?:Invoke-Expression|IEX)\s*[\s(]/i,
      + /\bStart-Process\b/i,
  - tool: Bash
    command: node -e "const {CHECKS}..."
    output: "IN-002 patterns: 16"
    exit: 0
```

### Shigoto-neko: Generate Log File

After all genba-neko complete and before the completion gate:

1. Collect action lists from all genba-neko completion reports
2. Run `git diff` to capture the authoritative diff (not relying on agent memory)
3. Combine into the log file format
4. Write to `logs/raw-{mission}-{YYYYMMDD}.md`

### Enrichment from Git

The git diff is the **source of truth** for code changes. Agent-reported diffs are cross-checked:

```bash
git diff HEAD~{N}..HEAD -- {files}
```

If the agent's reported diff doesn't match git, use git's version and flag the discrepancy.

## Configuration

Enable in `neko-gundan.config.yaml`:

```yaml
shitsuke:
  raw_log: true
```

Set the output directory in CLAUDE.md (optional, defaults to `logs/`):

```markdown
### ログ出力
- raw_log_output_dir: logs/
```

## Completion Gate

When this module is active, add gate item: "Raw log generated — `logs/raw-{mission}-*.md` exists with action details"

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| genba-neko | Post-work (completion report) | Include structured action list in handoff |
| shigoto-neko | Pre-completion-gate | Collect action lists, run git diff, generate raw log file |
| shigoto-neko | Completion gate | Verify raw log file exists |
