#!/usr/bin/env node
// commit-guard.mjs - コミット時の成果物ガード
// PreToolUse(Bash) で起動。
// git commit 実行時に以下を確認:
//   1. result/ に報告書があるか（全commit必須）
//   2. コードファイル変更時は checklist/ にチェックリストがあるか
//
// 計画書（plans/）は後追いOKなのでブロックしない。
// ただし報告書作成時に計画書も必ず残すこと（ルール上の義務）。
//
// 環境変数:
//   NEKO_WORK_DIR: 作業ルートディレクトリ（default: process.cwd()の親）
//
// settings.json hook設定例:
//   { "matcher": "Bash", "hooks": [{ "type": "command",
//     "command": "node path/to/hooks/commit-guard.mjs", "timeout": 10 }] }

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, basename } from 'path';
import { execSync } from 'child_process';

const input = JSON.parse(readFileSync(process.stdin.fd, 'utf-8'));
const { tool_name, tool_input } = input;

// Bash のみ対象
if (tool_name !== 'Bash') {
  process.exit(0);
}

const command = tool_input.command || '';

// git commit コマンドかどうか判定（git add は対象外）
if (!command.match(/git\s+commit\b/)) {
  process.exit(0);
}

// git commit --amend はスキップ（既存コミットの修正）
if (command.includes('--amend')) {
  process.exit(0);
}

// 作業ディレクトリの特定
const workDir = (process.env.NEKO_WORK_DIR || process.cwd()).replace(/\\/g, '/');

// --- コミット対象プロジェクトの特定 ---

// cdコマンドからプロジェクトディレクトリを特定
let projectName = null;
const workDirEscaped = workDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cdPattern = new RegExp(`cd\\s+(?:${workDirEscaped})\\/([^\\s/&;]+)`, 'i');
const cdMatch = command.match(cdPattern);
if (cdMatch) {
  projectName = cdMatch[1];
}

// プロジェクト特定できない場合はスキップ（ブロックしない）
if (!projectName) {
  process.exit(0);
}

// メタディレクトリはスキップ
const metaDirs = [
  'plans', 'checklist', 'result', 'whiteboard', 'Purpose', 'memory',
  'metrics', '_archive', '_deleted', 'topic', 'scratch', 'test-plan',
];
if (metaDirs.includes(projectName)) {
  process.exit(0);
}

// --- 成果物チェック ---

const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const missing = [];

// 1. 報告書チェック（全commit必須）
const resultDir = resolve(workDir, 'result');
let resultExists = false;
if (existsSync(resultDir)) {
  try {
    const resultFiles = readdirSync(resultDir);
    // プロジェクト名を含む報告書があればOK（当日 or 過去）
    resultExists = resultFiles.some(
      f => f.includes(projectName) && f.endsWith('.md')
    );
  } catch {
    resultExists = true; // 読み取りエラーはブロックしない
  }
}

if (!resultExists) {
  missing.push(`result/${today}_${projectName}.md（報告書）`);
}

// 2. 計画書チェック（全commit必須 — 後追いOKだがコミット時には存在すること）
const plansDir = resolve(workDir, 'plans');
let planExists = false;
if (existsSync(plansDir)) {
  try {
    const planFiles = readdirSync(plansDir);
    planExists = planFiles.some(
      f => f.includes(projectName) && f.endsWith('.md')
    );
  } catch {
    planExists = true;
  }
}

if (!planExists) {
  missing.push(`plans/*_${projectName}*.md（計画書 — 後追いOKだがコミット前に作成必須）`);
}

// 3. コードファイル変更時のチェックリスト確認
let hasCodeChanges = false;
const codeExtensions = [
  '.js', '.mjs', '.ts', '.tsx', '.py', '.rb', '.go', '.rs', '.java',
  '.c', '.cpp', '.h', '.cs', '.php', '.swift', '.kt', '.vue', '.svelte',
  '.jsx', '.sh', '.bash', '.ps1', '.sql',
];

try {
  const projectDir = resolve(workDir, projectName);
  const staged = execSync('git diff --cached --name-only', {
    cwd: projectDir,
    encoding: 'utf-8',
    timeout: 5000,
  }).trim();

  if (staged) {
    hasCodeChanges = staged.split('\n').some(f => {
      const ext = '.' + f.split('.').pop();
      return codeExtensions.includes(ext.toLowerCase());
    });
  }
} catch {
  // git diff 失敗時はブロックしない
  hasCodeChanges = false;
}

if (hasCodeChanges) {
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

  if (!checklistExists) {
    missing.push(`checklist/*_${projectName}*.md（チェックリスト — コード変更あり）`);
  }

  // 4. コードファイル変更時のテスト計画書確認
  // テスト不要でも「テスト対象なし」でファイルを作成すること
  const testPlanDir = resolve(workDir, 'test-plan');
  let testPlanExists = false;
  if (existsSync(testPlanDir)) {
    try {
      const testPlanFiles = readdirSync(testPlanDir);
      testPlanExists = testPlanFiles.some(
        f => f.includes(projectName) && f.endsWith('.md')
      );
    } catch {
      testPlanExists = true;
    }
  }

  if (!testPlanExists) {
    missing.push(`test-plan/*_${projectName}*.md（テスト計画書 — コード変更あり。テスト不要でも「テスト対象なし」で作成必須）`);
  }
}

// --- 結果判定 ---

if (missing.length > 0) {
  const reason = [
    `🚫 コミット前の成果物チェック！プロジェクト「${projectName}」の以下が不足:`,
    ...missing.map(m => `  - ${m}`),
    '',
    '【ルール】',
    '・どんな些細な作業でも報告書（result/）は必ず作成すること',
    '・コード変更時はチェックリスト（checklist/）も必須',
    '・コード変更時はテスト計画書（test-plan/）も必須（テスト不要でも「テスト対象なし」で作成）',
    '・計画書（plans/）は後追いOKだが、報告書作成時に必ず残すこと',
  ].join('\n');

  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
}
