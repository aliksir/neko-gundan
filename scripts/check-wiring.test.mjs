// check-wiring.test.mjs — check-wiring.mjs のテストスイート
// ルールの結線状態（auto/manual/none）を CLI 実行で検証する
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// テスト対象スクリプトの絶対パス
const SCRIPT = path.join(__dirname, 'check-wiring.mjs')

// ランダムな一時ディレクトリを作成して返す
function makeTmpDir() {
  const dir = path.join(os.tmpdir(), `check-wiring-${Math.random().toString(36).slice(2)}`)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

// WORK_DIR を第1引数、WIRING_TEST_HOME を環境変数として渡して実行する
function run(workDir, homeDir) {
  try {
    const stdout = execFileSync('node', [SCRIPT, workDir], {
      env: { ...process.env, WIRING_TEST_HOME: homeDir },
      encoding: 'utf8',
    })
    return { status: 0, stdout }
  } catch (err) {
    return { status: err.status ?? 1, stdout: err.stdout ?? '' }
  }
}

// テスト共通のディレクトリ構造（最小限）を初期化する
function makeBase(workDir, homeDir) {
  fs.mkdirSync(path.join(workDir, '.claude/rules'), { recursive: true })
  fs.mkdirSync(path.join(workDir, '.claude/gates'), { recursive: true })
  fs.mkdirSync(path.join(workDir, '.claude/agents'), { recursive: true })
  fs.writeFileSync(path.join(workDir, 'CLAUDE.md'), '')
  // hook ディレクトリ（HOME 配下）
  fs.mkdirSync(path.join(homeDir, '.claude/hooks/pre_tool_use'), { recursive: true })
}

// hook ファイルからルール名を参照 → 自動強制と分類される
test('hook参照あり → stdout に 自動強制', () => {
  const workDir = makeTmpDir()
  const homeDir = makeTmpDir()
  try {
    makeBase(workDir, homeDir)
    // ルールファイルを作成
    fs.writeFileSync(path.join(workDir, '.claude/rules/my-rule.md'), '# テストルール\n')
    // hookファイル内でルール名を参照（patterns: my-rule.md）
    fs.writeFileSync(
      path.join(homeDir, '.claude/hooks/pre_tool_use/check.mjs'),
      '// my-rule.md を適用する\n'
    )
    const result = run(workDir, homeDir)
    assert.match(result.stdout, /自動強制/, `"自動強制" が含まれていません\nstdout: ${result.stdout}`)
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
    fs.rmSync(homeDir, { recursive: true, force: true })
  }
})

// gate ファイルからのみ参照 → 手動のみと分類される
test('gate参照あり → stdout に 手動のみ', () => {
  const workDir = makeTmpDir()
  const homeDir = makeTmpDir()
  try {
    makeBase(workDir, homeDir)
    fs.writeFileSync(path.join(workDir, '.claude/rules/gate-rule.md'), '# テストルール\n')
    // gate からルールを参照（hook からは参照なし）
    fs.writeFileSync(
      path.join(workDir, '.claude/gates/gate.md'),
      'rules/gate-rule.md を参照する\n'
    )
    const result = run(workDir, homeDir)
    assert.match(result.stdout, /手動のみ/, `"手動のみ" が含まれていません\nstdout: ${result.stdout}`)
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
    fs.rmSync(homeDir, { recursive: true, force: true })
  }
})

// どこからも参照されていない → 未結線と分類される
test('どこからも参照なし → stdout に 未結線', () => {
  const workDir = makeTmpDir()
  const homeDir = makeTmpDir()
  try {
    makeBase(workDir, homeDir)
    fs.writeFileSync(path.join(workDir, '.claude/rules/orphan-rule.md'), '# 孤立ルール\n')
    // hook も gate も参照なし
    const result = run(workDir, homeDir)
    assert.match(result.stdout, /未結線/, `"未結線" が含まれていません\nstdout: ${result.stdout}`)
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
    fs.rmSync(homeDir, { recursive: true, force: true })
  }
})

// rules/ に .md ファイルが存在しない → exit 0、ルールファイルなし と出力
test('rules/ にファイルなし → exit 0, stdout に ルールファイルなし', () => {
  const workDir = makeTmpDir()
  const homeDir = makeTmpDir()
  try {
    makeBase(workDir, homeDir)
    // .md ファイルなし（.txt のみ配置）
    fs.writeFileSync(path.join(workDir, '.claude/rules/not-a-rule.txt'), 'dummy\n')
    const result = run(workDir, homeDir)
    assert.equal(result.status, 0, `exit code が 0 ではありません\nstdout: ${result.stdout}`)
    assert.match(result.stdout, /ルールファイルなし/, `"ルールファイルなし" が含まれていません\nstdout: ${result.stdout}`)
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
    fs.rmSync(homeDir, { recursive: true, force: true })
  }
})

// ============================================================
// settings.json 登録パス突合チェック（daily E-1）のテスト
// ============================================================

// settings.json が存在しない場合はスキップメッセージが出る（exit codeには影響しない）
test('settings.json 不在 → スキップメッセージ、rules起因以外でexit 0', () => {
  const workDir = makeTmpDir()
  const homeDir = makeTmpDir()
  try {
    makeBase(workDir, homeDir)
    // rules/ は空（.md無し）にして rules起因の exit code を 0 に固定する
    fs.rmSync(path.join(workDir, '.claude/rules/my-rule.md'), { force: true })
    const result = run(workDir, homeDir)
    assert.match(result.stdout, /settings\.json が見つからないか読み込めません/, `スキップメッセージが含まれていません\nstdout: ${result.stdout}`)
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
    fs.rmSync(homeDir, { recursive: true, force: true })
  }
})

// settings.json に実体のないパスが登録されている → missing検出、exit 1
test('settings.json登録パスの実体なし → 検出してexit 1', () => {
  const workDir = makeTmpDir()
  const homeDir = makeTmpDir()
  try {
    makeBase(workDir, homeDir)
    // 存在しないファイルパスを登録した settings.json を作成
    const settings = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'Read',
            hooks: [{ type: 'command', command: `node ${path.join(homeDir, '.claude/hooks/pre_tool_use/ghost-hook.mjs')}` }],
          },
        ],
      },
    }
    fs.writeFileSync(path.join(homeDir, '.claude/settings.json'), JSON.stringify(settings))
    const result = run(workDir, homeDir)
    assert.match(result.stdout, /実体なし/, `"実体なし" が含まれていません\nstdout: ${result.stdout}`)
    assert.match(result.stdout, /ghost-hook\.mjs/, `ゴーストファイル名が含まれていません\nstdout: ${result.stdout}`)
    assert.equal(result.status, 1, `exit code が 1 ではありません\nstdout: ${result.stdout}`)
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
    fs.rmSync(homeDir, { recursive: true, force: true })
  }
})

// hooks/ 配下に settings.json 未登録の .mjs がある → unregistered検出、exit 1
test('hooks/配下の未登録.mjsファイル → 検出してexit 1', () => {
  const workDir = makeTmpDir()
  const homeDir = makeTmpDir()
  try {
    makeBase(workDir, homeDir)
    // settings.json には何も登録しない
    fs.writeFileSync(path.join(homeDir, '.claude/settings.json'), JSON.stringify({ hooks: {} }))
    // hooks/pre_tool_use/ に未登録の.mjsファイルを配置
    fs.writeFileSync(path.join(homeDir, '.claude/hooks/pre_tool_use/orphan-hook.mjs'), '// 未登録hook\n')
    const result = run(workDir, homeDir)
    assert.match(result.stdout, /未登録/, `"未登録" が含まれていません\nstdout: ${result.stdout}`)
    assert.match(result.stdout, /orphan-hook\.mjs/, `未登録ファイル名が含まれていません\nstdout: ${result.stdout}`)
    assert.equal(result.status, 1, `exit code が 1 ではありません\nstdout: ${result.stdout}`)
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
    fs.rmSync(homeDir, { recursive: true, force: true })
  }
})

// settings.json とhooks/配下が完全一致 → 不整合なし
test('settings.jsonとhooks/配下が一致 → 不整合なし', () => {
  const workDir = makeTmpDir()
  const homeDir = makeTmpDir()
  try {
    makeBase(workDir, homeDir)
    const hookPath = path.join(homeDir, '.claude/hooks/pre_tool_use/matched-hook.mjs')
    fs.writeFileSync(hookPath, '// 登録済みhook\n')
    const settings = {
      hooks: {
        PreToolUse: [
          { matcher: 'Read', hooks: [{ type: 'command', command: `node ${hookPath}` }] },
        ],
      },
    }
    fs.writeFileSync(path.join(homeDir, '.claude/settings.json'), JSON.stringify(settings))
    const result = run(workDir, homeDir)
    assert.match(result.stdout, /不整合なし/, `"不整合なし" が含まれていません\nstdout: ${result.stdout}`)
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
    fs.rmSync(homeDir, { recursive: true, force: true })
  }
})

// 自動強制率の計算: auto 2件 + manual 1件 + none 1件 = 50%
test('自動強制率計算（auto 2件 + manual 1件 + none 1件 = 50%）', () => {
  const workDir = makeTmpDir()
  const homeDir = makeTmpDir()
  try {
    makeBase(workDir, homeDir)
    // 4つのルールファイルを作成
    fs.writeFileSync(path.join(workDir, '.claude/rules/rule-auto1.md'), '# auto1\n')
    fs.writeFileSync(path.join(workDir, '.claude/rules/rule-auto2.md'), '# auto2\n')
    fs.writeFileSync(path.join(workDir, '.claude/rules/rule-manual.md'), '# manual\n')
    fs.writeFileSync(path.join(workDir, '.claude/rules/rule-none.md'), '# none\n')
    // hook で auto1・auto2 を参照
    fs.writeFileSync(
      path.join(homeDir, '.claude/hooks/pre_tool_use/hook.mjs'),
      '// rule-auto1.md\n// rule-auto2.md\n'
    )
    // gate で manual を参照（rules/rule-manual パターンで検出される）
    fs.writeFileSync(
      path.join(workDir, '.claude/gates/gate.md'),
      'rules/rule-manual を確認すること\n'
    )
    const result = run(workDir, homeDir)
    // 自動強制率 = 2/4 = 50%
    assert.match(result.stdout, /50%/, `自動強制率 "50%" が含まれていません\nstdout: ${result.stdout}`)
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
    fs.rmSync(homeDir, { recursive: true, force: true })
  }
})
