#!/usr/bin/env node
// hooks-overview.md と実ファイルの件数を突合するスクリプト
// 使い方: node count-hooks.mjs [--update]
//   --update: hooks-overview.md のヘッダ件数を自動修正

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// パス解決
const homeDir = (process.env.USERPROFILE || process.env.HOME || '').replace(/\\/g, '/');
const hooksDir = `${homeDir}/.claude/hooks`;
const overviewPath = `${hooksDir}/hooks-overview.md`;

// hookファイル拡張子（.bak は除外）
const HOOK_EXTS = ['.mjs', '.sh', '.ps1'];

// hookディレクトリ定義
const HOOK_DIRS = [
  { dir: 'pre_tool_use', label: 'Pre-Tool-Use' },
  { dir: 'post_tool_use', label: 'Post-Tool-Use' },
  { dir: 'user_prompt_submit', label: 'User Prompt Submit' },
];

// ディレクトリ内の実ファイルを取得（.bak / _deleted/ 除外）
function listActualHooks(dirPath) {
  if (!existsSync(dirPath)) return [];
  return readdirSync(dirPath)
    .filter(f => HOOK_EXTS.some(ext => f.endsWith(ext)))
    .filter(f => !f.includes('.bak'))
    .sort();
}

// hooks-overview.md からhookファイル名とセクション件数を抽出
function parseDocumentedHooks(content) {
  const result = {};
  let currentSection = null;

  for (const line of content.split('\n')) {
    // セクション見出し検出: ## Pre-Tool-Use（28件）
    const sectionMatch = line.match(/^## (Pre-Tool-Use|Post-Tool-Use|User Prompt Submit)（(\d+)件）/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      if (!result[currentSection]) {
        result[currentSection] = { declared: parseInt(sectionMatch[2]), hooks: [] };
      }
      continue;
    }

    // 別の H2 見出しでセクション終了
    if (line.startsWith('## ') && currentSection && !line.includes('件）')) {
      currentSection = null;
      continue;
    }

    // テーブル行からhookファイル名を抽出
    if (currentSection) {
      const hookMatch = line.match(/\| `([^`]+\.(mjs|sh|ps1))` \|/);
      if (hookMatch && !hookMatch[1].includes('.bak')) {
        result[currentSection].hooks.push(hookMatch[1]);
      }
    }
  }
  return result;
}

// メイン処理
const updateMode = process.argv.includes('--update');

if (!existsSync(overviewPath)) {
  console.error(`エラー: ${overviewPath} が見つかりません`);
  process.exit(1);
}

const overviewContent = readFileSync(overviewPath, 'utf8');
const documented = parseDocumentedHooks(overviewContent);

console.log('hooks 件数チェック');
console.log('='.repeat(50));

let totalActual = 0;
let totalDoc = 0;
let hasDiscrepancy = false;
const updates = [];

for (const { dir, label } of HOOK_DIRS) {
  const dirPath = join(hooksDir, dir);
  const actual = listActualHooks(dirPath);
  const doc = documented[label] || { declared: 0, hooks: [] };
  const docSet = new Set(doc.hooks);
  const actualSet = new Set(actual);

  // 未記載ファイル（実体はあるが文書に載っていない）
  const undocumented = actual.filter(f => !docSet.has(f));
  // 記載のみ（文書にあるが実体がない）
  const missing = doc.hooks.filter(f => !actualSet.has(f));

  totalActual += actual.length;
  totalDoc += doc.declared;

  const headerMatch = actual.length === doc.declared;

  console.log(`\n${label}: 実${actual.length}件 / 記載${doc.declared}件 / 文書内${doc.hooks.length}件${headerMatch ? '' : ' ⚠️'}`);

  if (undocumented.length > 0) {
    hasDiscrepancy = true;
    console.log(`  未記載: ${undocumented.join(', ')}`);
  }
  if (missing.length > 0) {
    hasDiscrepancy = true;
    console.log(`  実体なし: ${missing.join(', ')}`);
  }
  if (actual.length !== doc.declared) {
    hasDiscrepancy = true;
    updates.push({ label, oldCount: doc.declared, newCount: actual.length });
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`合計: 実${totalActual}件 / 記載${totalDoc}件${hasDiscrepancy ? ' — 差異あり' : ' — 一致'}`);

// --update でヘッダ件数を自動修正
if (updateMode && updates.length > 0) {
  let updated = overviewContent;
  for (const { label, oldCount, newCount } of updates) {
    updated = updated.replace(
      `## ${label}（${oldCount}件）`,
      `## ${label}（${newCount}件）`
    );
  }
  writeFileSync(overviewPath, updated, 'utf8');
  console.log(`\nhooks-overview.md のヘッダ件数を更新しました（${updates.length}件修正）`);
}

process.exit(hasDiscrepancy ? 1 : 0);
