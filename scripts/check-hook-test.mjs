#!/usr/bin/env node
// check-hook-test.mjs — hook変更後のテスト実施チェック
// hookファイルのmtimeとhook-test-log.jsonlを突合し、
// 変更後にPASS+BLOCKの両テストが未実施のhookを検出する。
// artifact-check.sh（報告前CP #3）から呼ばれる。

import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const home = process.env.HOOK_TEST_HOME || process.env.HOME || process.env.USERPROFILE;
const HOOKS_DIR = join(home, '.claude/hooks');
const LOG_FILE = join(home, '.claude/hook-test-log.jsonl');

// 直近N日以内に変更されたhookのみ対象（デフォルト7日）
const DAYS = parseInt(process.argv[2] || '7', 10);
const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);

// hookファイル拡張子（HOOK_EXTENSIONS と統一: mjs / js / sh / ps1）
const HOOK_EXT_RE = /\.(mjs|js|sh|ps1)$/;

// hookファイル収集（pre_tool_use / post_tool_use 配下）
const hookFiles = [];
for (const subdir of ['pre_tool_use', 'post_tool_use']) {
  const dir = join(HOOKS_DIR, subdir);
  if (!existsSync(dir)) continue;
  let files;
  try { files = readdirSync(dir); } catch { continue; }
  for (const f of files) {
    if (!HOOK_EXT_RE.test(f)) continue;
    const fullPath = join(dir, f);
    try {
      const stat = statSync(fullPath);
      if (stat.mtime >= cutoff) {
        hookFiles.push({ name: f, path: fullPath, mtime: stat.mtime });
      }
    } catch { /* stat失敗はスキップ */ }
  }
}

if (hookFiles.length === 0) {
  console.log('hook変更なし → [N/A]');
  process.exit(0);
}

// hook-test-log.jsonlからテスト記録を抽出
const testLog = new Map();
if (existsSync(LOG_FILE)) {
  const content = readFileSync(LOG_FILE, 'utf8').trim();
  if (content) {
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        const ts = new Date(entry.ts);
        if (isNaN(ts.getTime()) || ts < cutoff) continue;
        const hookName = entry.hook;
        if (!testLog.has(hookName)) {
          testLog.set(hookName, { pass: new Set(), block: new Set(), latestTs: ts });
        }
        const record = testLog.get(hookName);
        if (ts > record.latestTs) record.latestTs = ts;
        // exit 0 = PASS, exit 2 = BLOCK
        if (entry.verdict === 'PASS' || entry.exit === 0) record.pass.add(entry.tool);
        if (entry.verdict === 'BLOCK' || entry.exit === 2) record.block.add(entry.tool);
      } catch { /* JSONパース失敗はスキップ */ }
    }
  }
}

// 突合して結果出力
let issues = 0;

for (const hook of hookFiles) {
  const record = testLog.get(hook.name);
  const mtimeStr = hook.mtime.toISOString().slice(0, 16);

  if (!record) {
    // テスト記録なし
    console.log(`  ✗ ${hook.name} — テスト未実施（変更: ${mtimeStr}）`);
    issues++;
    continue;
  }

  // hook変更後にテストされたか確認
  if (record.latestTs < hook.mtime) {
    console.log(`  ✗ ${hook.name} — 変更後テスト未実施（変更: ${mtimeStr}, 最終テスト: ${record.latestTs.toISOString().slice(0, 16)}）`);
    issues++;
    continue;
  }

  // PASS + BLOCK の両方があるか
  const hasPass = record.pass.size > 0;
  const hasBlock = record.block.size > 0;
  if (hasPass && hasBlock) {
    console.log(`  ✓ ${hook.name} — PASS(${record.pass.size}件)+BLOCK(${record.block.size}件)`);
  } else if (hasPass) {
    console.log(`  △ ${hook.name} — PASSのみ（BLOCKテスト未実施）`);
    issues++;
  } else if (hasBlock) {
    console.log(`  △ ${hook.name} — BLOCKのみ（PASSテスト未実施）`);
    issues++;
  }
}

if (issues > 0) {
  console.log(`\n  → yoshi hook-test でPASS+BLOCKの両方を確認してください`);
}

process.exit(issues > 0 ? 1 : 0);
