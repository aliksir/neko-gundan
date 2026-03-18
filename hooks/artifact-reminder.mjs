#!/usr/bin/env node
// artifact-reminder.mjs - 計画書作成時の成果物テンプレートリマインダー
// PostToolUse(Write) で起動。
// plans/ に計画書を作成した直後に、対応する成果物テンプレートの存在を確認し、
// 不足分を警告する。
//
// 環境変数:
//   NEKO_WORK_DIR: 作業ルートディレクトリ（default: process.cwd()の親）
//
// settings.json hook設定例:
//   { "matcher": "Write", "hooks": [{ "type": "command",
//     "command": "node path/to/hooks/artifact-reminder.mjs", "timeout": 3 }] }

import { readFileSync, existsSync, readdirSync } from 'fs';
import { basename, resolve } from 'path';

const input = JSON.parse(readFileSync(process.stdin.fd, 'utf-8'));
const { tool_name, tool_input } = input;

// Write のみ対象
if (tool_name !== 'Write') {
  process.exit(0);
}

const filePath = (tool_input && tool_input.file_path) || '';

// plans/ への書き込みのみ対象
const normalizedPath = filePath.replace(/\\/g, '/');
if (!normalizedPath.includes('/plans/')) {
  process.exit(0);
}

// ファイル名からタスク名を抽出（YYYYMMDD_タスク名.md → YYYYMMDD_タスク名）
const fileName = basename(normalizedPath, '.md');
if (!fileName || fileName.length < 10) {
  process.exit(0);
}

// 作業ディレクトリの特定
const workDir = (process.env.NEKO_WORK_DIR || resolve(process.cwd(), '..')).replace(/\\/g, '/');

// チェック対象の成果物ディレクトリ
const artifactDirs = [
  { dir: 'designs', label: '設計書' },
  { dir: 'checklist', label: 'チェックリスト' },
  { dir: 'test-plan', label: 'テスト計画書' },
  { dir: 'audit', label: '監査ログ' },
  { dir: 'logs', label: '生ログ' },
];

const missing = [];

for (const { dir, label } of artifactDirs) {
  const dirPath = `${workDir}/${dir}`;
  if (!existsSync(dirPath)) {
    missing.push(`${dir}/${fileName}.md（${label}）`);
    continue;
  }

  try {
    const files = readdirSync(dirPath);
    const found = files.some(f => f === `${fileName}.md`);
    if (!found) {
      missing.push(`${dir}/${fileName}.md（${label}）`);
    }
  } catch {
    // 読み取りエラー時はスキップ
  }
}

if (missing.length > 0) {
  const message = [
    `📋 計画書「${fileName}」を作成しました。以下の成果物テンプレートがまだ作成されていません:`,
    ...missing.map(m => `  - ${m}`),
    '',
    '成果物セットを一括作成してください（1タスク = 1セット）。',
  ].join('\n');

  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: message,
    },
  }));
}
