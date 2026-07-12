---
name: welcome-neko
description: "Interactive installer, updater, and configurator for Neko Gundan multi-agent framework. Handles mode selection, file deployment from GitHub, status checks, and shitsuke (module toggle). Supports Japanese and English."
metadata:
  author: aliks
  version: "1.0.0"
risk: low
source: community
---

# Welcome Neko — 猫軍団インタラクティブセットアップ

対話式で猫軍団のインストール・更新・モード変更・状態確認・しつけを行うスキル。

## Trigger

`/welcome-neko` or "install neko gundan" or "setup neko gundan" or "猫軍団を入れて"

## Step 1: Language Selection

Ask the user which language they prefer for the interactive session:

```
🐱 Welcome to Neko Gundan!

Which language do you prefer?
  1. 日本語
  2. English

（番号で選んでください / Choose a number）
```

Use AskUserQuestion to get the response. Store the choice and use it for ALL subsequent messages in this session.

## Step 2: Main Menu

Show the main menu in the selected language. Use AskUserQuestion for selection.

**Japanese:**
```
🐱 猫軍団セットアップメニュー

  1. 🆕 インストール — 猫軍団を初めて導入する
  2. 🔄 アップデート — 最新版に更新する
  3. ➕ モード変更 — モードの追加・削除
  4. 📊 状態確認 — インストール済みの構成を表示
  5. 🎓 しつけ — モジュールのON/OFF切り替え

どれをやりますか？（番号で選んでください）
```

**English:**
```
🐱 Neko Gundan Setup Menu

  1. 🆕 Install — Set up Neko Gundan for the first time
  2. 🔄 Update — Update to the latest version
  3. ➕ Mode Change — Add or remove modes
  4. 📊 Status — Show current installation state
  5. 🎓 Shitsuke — Toggle modules ON/OFF

What would you like to do? (Choose a number)
```

---

## Menu 1: Install

### Step 1.1: Detect Target Project

Check the current working directory:
- If `.claude/` exists, ask: "This project already has .claude/. Add Neko Gundan here?" (or Japanese equivalent)
- If not, confirm: "Install Neko Gundan in {cwd}?" (or Japanese equivalent)

### Step 1.2: Mode Selection

Present modes with descriptions. Use AskUserQuestion.

**Japanese:**
```
どんな課題を解決したいですか？

  1. 🐱 koneko（子猫）— PROプランの予算で品質を上げたい
  2. ✅ quality — コードレビューの質を改善したい
  3. ⚡ implement — 大規模変更を並列で安全に回したい
  4. 🗺️ plan — コードを書く前に設計・計画したい
  5. 🛡️ security — 誤削除・破壊操作を防ぎたい
  6. 🎯 おすすめ: quality+security（レビュー+安全）
  7. 🌟 全部入り

番号で選んでください（複数可: 2,5）
```

**English:**
```
What problem do you want to solve?

  1. 🐱 koneko — Quality on a PRO budget
  2. ✅ quality — Better code reviews
  3. ⚡ implement — Safe parallel execution
  4. 🗺️ plan — Think before coding
  5. 🛡️ security — Prevent accidental destruction
  6. 🎯 Recommended: quality+security
  7. 🌟 Everything

Choose a number (multiple OK: 2,5)
```

### Step 1.3: Mode-to-File Mapping

Map the selected mode(s) to files. Reference table:

| Mode | Agents | Rules | Modules |
|------|--------|-------|---------|
| koneko | koneko-neko.md | koneko-gates.md, safety-tiers.md | — |
| quality | kurouto-neko.md | review-protocol.md, completion-gates.md | ensemble-judge.md, jit-tests.md, reflexion.md, linter-protection.md, objection-flow.md, process-weight.md, checklist-export.md, quality-metrics.md, arbitrator.md, raw-log.md |
| implement | shigoto-neko.md, genba-neko.md | — | race-prevention.md, heartbeat.md, reflexion.md, tdd-separation.md, objection-flow.md, capacity-escalation.md, handoff-schema.md, progress-visibility.md |
| plan | oyakata-neko.md | — | whiteboard.md, isv.md, spec-driven-review.md, module-addition.md, faceted-prompting.md |
| security | — | safety-tiers.md | fides.md, race-prevention.md |

Shared files (e.g., reflexion.md, objection-flow.md) are deduplicated automatically.

If plan or implement is selected, also include: `commands/neko-gundan.md`

### Step 1.4: Fetch and Deploy Files

For each file in the resolved list:

1. Check if `{project}/.claude/{subdir}/{filename}` already exists
   - If yes: skip and report "(already exists, skipped)"
   - If user chose "overwrite all": overwrite
2. Fetch from GitHub:
   ```
   WebFetch url="https://raw.githubusercontent.com/aliksir/neko-gundan/master/{subdir}/{filename}"
   ```
   Where `{subdir}` is `agents/`, `rules/`, `modules/`, or `commands/` depending on the file type.
3. Write to `{project}/.claude/{subdir}/{filename}`

### Step 1.5: Generate CLAUDE.md Snippet

After deploying files, generate a CLAUDE.md snippet for the user to add to their project's CLAUDE.md.

The snippet should include:
- Agent role references (`@.claude/agents/...`)
- Rule references (`@.claude/rules/...`)
- Module references (as stubs — module name + "Read full definition at modules/X.md")

Present the snippet and ask: "Add this to your CLAUDE.md?" / "CLAUDE.mdに追記しますか？"

If yes, append to the project's CLAUDE.md (create if not exists).

### Step 1.6: Completion

Report what was installed:
```
🐱 インストール完了！ヨシッ！

  モード: quality + security
  エージェント: kurouto-neko
  ルール: 3ファイル
  モジュール: 12ファイル
  CLAUDE.md: 更新済み

次のステップ:
  - /welcome-neko で状態確認・しつけ設定ができます
  - 詳しくは: https://github.com/aliksir/neko-gundan
```

---

## Menu 2: Update

### Step 2.1: Detect Current Installation

Scan `{project}/.claude/` for neko-gundan files:
- `Glob pattern=".claude/agents/*-neko.md"`
- `Glob pattern=".claude/rules/*.md"`
- `Glob pattern=".claude/modules/*.md"`

### Step 2.2: Check Upstream Versions

For each installed file, fetch the latest from GitHub and compare:
```
WebFetch url="https://raw.githubusercontent.com/aliksir/neko-gundan/master/{subdir}/{filename}"
```

Compare content with local file using Read. If different, show a summary of changes.

### Step 2.3: Interactive Update

For each file with changes, ask:
- "Update {filename}? (y/n/diff)" / "{filename}を更新しますか？（y/n/diff）"
- If "diff": show the key differences, then ask again
- If "y": overwrite
- If "n": skip

### Step 2.4: Report

Show summary of updated/skipped files.

---

## Menu 3: Mode Change

### Step 3.1: Show Current Modes

Detect installed modes by checking which agent files exist:
- oyakata-neko.md → plan
- shigoto-neko.md → implement
- kurouto-neko.md → quality
- koneko-neko.md → koneko
- safety-tiers.md (without agents) → security

### Step 3.2: Add or Remove

Ask: "Add or remove a mode?" / "モードを追加しますか？削除しますか？"

**Add**: Show available modes (not yet installed) → select → fetch and deploy (same as Install Step 1.4)

**Remove**: Show installed modes → select → move files to `_deleted/` (NOT delete) → update CLAUDE.md

---

## Menu 4: Status

Scan and report:

```
🐱 猫軍団ステータス

  インストール先: /path/to/project/.claude/
  モード: quality + security

  エージェント:
    ✅ kurouto-neko.md (reviewer)

  ルール:
    ✅ review-protocol.md
    ✅ completion-gates.md
    ✅ safety-tiers.md

  モジュール:
    ✅ reflexion.md (ON)
    ✅ linter-protection.md (ON)
    ⬚ heartbeat.md (not installed)
    ...

  CLAUDE.md: 猫軍団スニペットあり
```

Use Glob to scan, Read to check content.

---

## Menu 5: Shitsuke (Module Toggle)

### Step 5.1: Show Current Module State

Check if `neko-gundan.config.yaml` exists (search: `{project}/multi-agent-neko/neko-gundan.config.yaml` for cloned repo, or `{project}/.claude/neko-gundan.config.yaml` for welcome-neko install). If found, read it. If not, all installed modules are ON by default.

List all installed modules with their ON/OFF state.

### Step 5.2: Toggle

Ask which module to toggle. Use AskUserQuestion.

### Step 5.3: Apply

If `neko-gundan.config.yaml` doesn't exist, create it at the appropriate location. Update the module's enabled state.

Show the updated state and confirm.

---

## Important Rules

- **Never delete files directly**. Use `_deleted/` for removed files.
- **Never overwrite without asking**. Always confirm before overwriting existing files.
- **Respect existing customizations**. If a file has been modified locally (different from upstream), warn the user.
- **All output in the selected language**. Consistently use Japanese or English throughout the session.
- **GitHub fetch failures are non-fatal**. If a file can't be fetched, report and continue with the rest.
