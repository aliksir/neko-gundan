// check-hook-test.test.mjs — check-hook-test.mjs のテストスイート
// hookのmtimeとhook-test-log.jsonlの突合ロジックを HOOK_TEST_HOME 経由で検証する
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// テスト対象スクリプトの絶対パス
const SCRIPT = path.join(__dirname, 'check-hook-test.mjs')

// ランダムな一時ディレクトリを作成して返す
function makeTmpDir() {
  const dir = path.join(os.tmpdir(), `check-hook-test-${Math.random().toString(36).slice(2)}`)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

// hook ディレクトリ構造（pre/post 両方）を作成する
function makeHookDirs(homeDir) {
  fs.mkdirSync(path.join(homeDir, '.claude/hooks/pre_tool_use'), { recursive: true })
  fs.mkdirSync(path.join(homeDir, '.claude/hooks/post_tool_use'), { recursive: true })
}

// HOOK_TEST_HOME を設定してスクリプトを子プロセスで実行する
function run(homeDir, extraArgs = []) {
  try {
    const stdout = execFileSync('node', [SCRIPT, ...extraArgs], {
      env: { ...process.env, HOOK_TEST_HOME: homeDir },
      encoding: 'utf8',
    })
    return { status: 0, stdout }
  } catch (err) {
    return { status: err.status ?? 1, stdout: err.stdout ?? '' }
  }
}

// hookファイルが1つもない場合は "hook変更なし" と出力して exit 0
test('hookファイルなし → exit 0, stdout に hook変更なし', () => {
  const home = makeTmpDir()
  try {
    makeHookDirs(home)
    const result = run(home)
    assert.equal(result.status, 0, `exit code が 0 ではありません\nstdout: ${result.stdout}`)
    assert.match(result.stdout, /hook変更なし/, `"hook変更なし" が含まれていません\nstdout: ${result.stdout}`)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

// PASS + BLOCK 両方テスト済みのhookは ✓ と表示され exit 0
test('PASS+BLOCK両方テスト済み → exit 0, stdout に ✓', () => {
  const home = makeTmpDir()
  try {
    makeHookDirs(home)
    // hookのmtimeを1時間前にする（テストログより古い状態にする）
    const hookPath = path.join(home, '.claude/hooks/pre_tool_use/my-hook.mjs')
    fs.writeFileSync(hookPath, '// test hook\n')
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    fs.utimesSync(hookPath, oneHourAgo, oneHourAgo)
    // テストログ: PASS + BLOCK を30分前のタイムスタンプで記録（hookより後）
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const logLines = [
      JSON.stringify({ hook: 'my-hook.mjs', tool: 'Read', verdict: 'PASS', exit: 0, ts: thirtyMinAgo }),
      JSON.stringify({ hook: 'my-hook.mjs', tool: 'Edit', verdict: 'BLOCK', exit: 2, ts: thirtyMinAgo }),
    ]
    fs.writeFileSync(path.join(home, '.claude/hook-test-log.jsonl'), logLines.join('\n') + '\n')
    const result = run(home)
    assert.equal(result.status, 0, `exit code が 0 ではありません\nstdout: ${result.stdout}`)
    assert.match(result.stdout, /✓/, `✓ が含まれていません\nstdout: ${result.stdout}`)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

// PASSのみのhookは △ と表示され exit 1
test('PASSのみ → exit 1, stdout に △', () => {
  const home = makeTmpDir()
  try {
    makeHookDirs(home)
    const hookPath = path.join(home, '.claude/hooks/pre_tool_use/my-hook.mjs')
    fs.writeFileSync(hookPath, '// test hook\n')
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    fs.utimesSync(hookPath, oneHourAgo, oneHourAgo)
    // BLOCKテストなし、PASSのみ
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const logLine = JSON.stringify({ hook: 'my-hook.mjs', tool: 'Read', verdict: 'PASS', exit: 0, ts: thirtyMinAgo })
    fs.writeFileSync(path.join(home, '.claude/hook-test-log.jsonl'), logLine + '\n')
    const result = run(home)
    assert.equal(result.status, 1, `exit code が 1 ではありません\nstdout: ${result.stdout}`)
    assert.match(result.stdout, /△/, `△ が含まれていません\nstdout: ${result.stdout}`)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

// テスト記録が一切ない場合は ✗ と表示され exit 1
test('テスト記録なし → exit 1, stdout に ✗', () => {
  const home = makeTmpDir()
  try {
    makeHookDirs(home)
    // hookファイルを作成するが hook-test-log.jsonl は作らない
    const hookPath = path.join(home, '.claude/hooks/pre_tool_use/my-hook.mjs')
    fs.writeFileSync(hookPath, '// test hook\n')
    const result = run(home)
    assert.equal(result.status, 1, `exit code が 1 ではありません\nstdout: ${result.stdout}`)
    assert.match(result.stdout, /✗/, `✗ が含まれていません\nstdout: ${result.stdout}`)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

// BLOCKのみ（PASSテストなし）のhookは △ と表示され exit 1
test('BLOCKのみ → exit 1, stdout に △', () => {
  const home = makeTmpDir()
  try {
    makeHookDirs(home)
    const hookPath = path.join(home, '.claude/hooks/pre_tool_use/my-hook.mjs')
    fs.writeFileSync(hookPath, '// test hook\n')
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    fs.utimesSync(hookPath, oneHourAgo, oneHourAgo)
    // PASSテストなし、BLOCKのみ
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const logLine = JSON.stringify({ hook: 'my-hook.mjs', tool: 'Edit', verdict: 'BLOCK', exit: 2, ts: thirtyMinAgo })
    fs.writeFileSync(path.join(home, '.claude/hook-test-log.jsonl'), logLine + '\n')
    const result = run(home)
    assert.equal(result.status, 1, `exit code が 1 ではありません\nstdout: ${result.stdout}`)
    assert.match(result.stdout, /△/, `△ が含まれていません\nstdout: ${result.stdout}`)
    assert.match(result.stdout, /PASS.*未実施|PASSテスト未実施/, `PASSテスト未実施メッセージが含まれていません\nstdout: ${result.stdout}`)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

// .sh 拡張子の hook ファイルも検出される
test('.sh hookファイル検出 → exit 1, stdout に ✗', () => {
  const home = makeTmpDir()
  try {
    makeHookDirs(home)
    const hookPath = path.join(home, '.claude/hooks/pre_tool_use/my-guard.sh')
    fs.writeFileSync(hookPath, '#!/bin/bash\necho ok\n')
    const result = run(home)
    assert.equal(result.status, 1, `exit code が 1 ではありません\nstdout: ${result.stdout}`)
    assert.match(result.stdout, /my-guard\.sh/, `.sh ファイルが検出されていません\nstdout: ${result.stdout}`)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

// .js 拡張子の hook ファイルも検出される
test('.js hookファイル検出 → exit 1, stdout に ✗', () => {
  const home = makeTmpDir()
  try {
    makeHookDirs(home)
    const hookPath = path.join(home, '.claude/hooks/post_tool_use/my-logger.js')
    fs.writeFileSync(hookPath, '// hook\n')
    const result = run(home)
    assert.equal(result.status, 1, `exit code が 1 ではありません\nstdout: ${result.stdout}`)
    assert.match(result.stdout, /my-logger\.js/, `.js ファイルが検出されていません\nstdout: ${result.stdout}`)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

// Invalid Date 行があってもスキップしてクラッシュしない
test('Invalid Date行 → スキップされてクラッシュしない', () => {
  const home = makeTmpDir()
  try {
    makeHookDirs(home)
    const hookPath = path.join(home, '.claude/hooks/pre_tool_use/my-hook.mjs')
    fs.writeFileSync(hookPath, '// test hook\n')
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    fs.utimesSync(hookPath, oneHourAgo, oneHourAgo)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    // "not-a-date" の行は isNaN チェックでスキップされる
    const logLines = [
      JSON.stringify({ hook: 'my-hook.mjs', tool: 'Read', verdict: 'PASS', exit: 0, ts: 'not-a-date' }),
      JSON.stringify({ hook: 'my-hook.mjs', tool: 'Read', verdict: 'PASS', exit: 0, ts: thirtyMinAgo }),
      JSON.stringify({ hook: 'my-hook.mjs', tool: 'Edit', verdict: 'BLOCK', exit: 2, ts: thirtyMinAgo }),
    ]
    fs.writeFileSync(path.join(home, '.claude/hook-test-log.jsonl'), logLines.join('\n') + '\n')
    const result = run(home)
    // クラッシュせず 0 または 1 で終了すること
    assert.ok(
      result.status === 0 || result.status === 1,
      `クラッシュせず正常終了すること (status=${result.status})`
    )
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})
