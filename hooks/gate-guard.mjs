#!/usr/bin/env node
// gate-guard.mjs - 開始ゲート構造ガード
// PreToolUse(Edit/Write) で起動。
// プロジェクトのソースコード編集時に plans/ と checklist/ の存在を確認。
// 不在ならブロックし、開始ゲート通過を強制する。

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, normalize } from 'path';

const input = JSON.parse(readFileSync(process.stdin.fd, 'utf-8'));
const { tool_name, tool_input } = input;

// Edit/Write のみ対象
if (tool_name !== 'Edit' && tool_name !== 'Write') {
  process.exit(0);
}

const filePath = normalize(tool_input.file_path || '').replace(/\\/g, '/');
const workDir = 'C:/work';

// C:\work 配下でなければスキップ
if (!filePath.startsWith(workDir + '/')) {
  process.exit(0);
}

// C:\work\ 直下のファイル（CLAUDE.md等）はスキップ
const relative = filePath.slice(workDir.length + 1);
const parts = relative.split('/');
if (parts.length <= 1) {
  process.exit(0);
}

const projectName = parts[0];

// メタディレクトリはスキップ（ゲート成果物自体の作成を妨げない）
// NOTE: neko-gundan自体も開発対象になり得る。自分のリポ名はここに入れないこと (2026-03-15)
const metaDirs = [
  'plans', 'checklist', 'result', 'whiteboard', 'Purpose', 'memory',
  'metrics', '_archive', '_deleted', 'topic', 'kidou', 'scratch',
  'claude-skills', '依頼事項',
];
if (metaDirs.includes(projectName)) {
  process.exit(0);
}

// プロジェクト内の .claude/ ディレクトリはスキップ
if (parts.some(p => p === '.claude')) {
  process.exit(0);
}

// プロジェクト内のメタファイルはスキップ
const fileName = parts[parts.length - 1];
const metaFiles = [
  'CLAUDE.md', 'MEMORY.md', '.gitignore', '.env.example',
  'README.md', 'handover.md',
];
if (metaFiles.includes(fileName)) {
  process.exit(0);
}

// --- 構造チェック ---

// plans/ にプロジェクト名を含む .md が存在するか
// 形式: YYYYMMDD_{PJ名}.md, {PJ名}_*.md, YYYYMMDD_{PJ名含む説明}.md
const plansDir = resolve(workDir, 'plans');
let planExists = false;
if (existsSync(plansDir)) {
  try {
    const planFiles = readdirSync(plansDir);
    planExists = planFiles.some(
      f => f.includes(projectName) && f.endsWith('.md')
    );
  } catch {
    // ディレクトリ読み取りエラーは無視（ブロックしない）
    planExists = true;
  }
}

// checklist/*_{project}*.md が存在するか（形式: YYYYMMDD_{PJ名}.md）
const checklistDir = resolve(workDir, 'checklist');
let checklistExists = false;
if (existsSync(checklistDir)) {
  try {
    const checklistFiles = readdirSync(checklistDir);
    checklistExists = checklistFiles.some(
      f => f.includes(projectName) && f.endsWith('.md')
    );
  } catch {
    checklistExists = true;
  }
}

// 結果判定
const missing = [];
if (!planExists) missing.push(`plans/${projectName}_*.md（計画書）`);
if (!checklistExists) missing.push(`checklist/*_${projectName}*.md（チェックリスト）`);

if (missing.length > 0) {
  const reason = [
    `🚫 開始ゲート未完了！プロジェクト「${projectName}」の以下の成果物が存在しません:`,
    ...missing.map(m => `  - ${m}`),
    '',
    '先に開始ゲートを通してください（rules/gates.md 参照）。',
    '計画書とチェックリストを作成してから実装に着手すること。',
  ].join('\n');

  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
}
