#!/usr/bin/env node
// commit-guard.mjs - コミット時の成果物ガード
// PreToolUse(Bash) で起動。
// git commit 実行時に以下を確認:
//   1. result/ に当日の報告書があるか（全commit必須）
//   2. plans/ に計画書があるか（全commit必須）
//   3. test-plan/ にテスト計画書があるか（全commit必須）
//   4. audit/ に監査ログがあるか（全commit必須）
//   5. logs/ に生ログがあるか（全commit必須）
//   6. コードファイル変更時は checklist/ にチェックリストがあるか
//
// 計画書（plans/）も必須。作業着手前に作成すること。

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve } from 'path';
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

const workDir = 'C:/work';

// --- コミット対象プロジェクトの特定 ---

// cdコマンドからプロジェクトディレクトリを特定
let projectName = null;
const cdMatch = command.match(/cd\s+(?:C:\/work|\/c\/work)\/([^\s/&;]+)/i);
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
  'metrics', '_archive', '_deleted', 'topic', 'kidou', 'scratch',
  'claude-skills', '依頼事項', 'test-plan', 'audit', 'logs',
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
    resultExists = resultFiles.some(
      f => f.includes(projectName) && f.startsWith(today) && f.endsWith('.md')
    );
    // 当日以外の日付でも、プロジェクト名を含む報告書があればOK（後追い想定）
    if (!resultExists) {
      resultExists = resultFiles.some(
        f => f.includes(projectName) && f.endsWith('.md')
      );
      // ただし存在するファイルが7日以上前のものだけなら不足と判定
      // → 複雑になるので、当日 or プロジェクト名一致でOKとする
    }
  } catch {
    resultExists = true; // 読み取りエラーはブロックしない
  }
}

if (!resultExists) {
  missing.push(`result/${today}_${projectName}.md（報告書）`);
}

// 2. 計画書チェック（全commit必須 — 当日の計画書が必要。過去の計画書はカウントしない）
const plansDir = resolve(workDir, 'plans');
let planExists = false;
if (existsSync(plansDir)) {
  try {
    const planFiles = readdirSync(plansDir);
    planExists = planFiles.some(
      f => f.includes(projectName) && f.startsWith(today) && f.endsWith('.md')
    );
  } catch {
    planExists = true;
  }
}

if (!planExists) {
  missing.push(`plans/${today}_${projectName}.md（計画書 — 当日の計画書が必要。過去の計画書は別タスクのもの）`);
}

// 3. テスト計画書チェック（全commit必須 — 当日日付）
const testPlanDir = resolve(workDir, 'test-plan');
let testPlanExists = false;
if (existsSync(testPlanDir)) {
  try {
    const testPlanFiles = readdirSync(testPlanDir);
    testPlanExists = testPlanFiles.some(
      f => f.includes(projectName) && f.startsWith(today) && f.endsWith('.md')
    );
  } catch {
    testPlanExists = true;
  }
}

if (!testPlanExists) {
  missing.push(`test-plan/${today}_${projectName}.md（テスト計画書 — テスト不要でも「テスト対象なし」と理由を記録）`);
}

// 4. 監査ログチェック（全commit必須 — 当日日付）
const auditDir = resolve(workDir, 'audit');
let auditExists = false;
if (existsSync(auditDir)) {
  try {
    const auditFiles = readdirSync(auditDir);
    auditExists = auditFiles.some(
      f => f.includes(projectName) && f.startsWith(today) && f.endsWith('.md')
    );
  } catch {
    auditExists = true;
  }
}

if (!auditExists) {
  missing.push(`audit/${today}_${projectName}.md（監査ログ — トレーサビリティ・承認記録）`);
}

// 5. 生ログチェック（全commit必須 — 当日日付）
const logsDir = resolve(workDir, 'logs');
let rawLogExists = false;
if (existsSync(logsDir)) {
  try {
    const logFiles = readdirSync(logsDir);
    rawLogExists = logFiles.some(
      f => f.includes(projectName) && f.startsWith(today) && f.endsWith('.md')
    );
  } catch {
    rawLogExists = true;
  }
}

if (!rawLogExists) {
  missing.push(`logs/${today}_${projectName}.md（生ログ — エージェント行動の証跡）`);
}

// 6. コードファイル変更時のチェックリスト確認
// git diff --cached でステージ済みファイルにコードファイルが含まれるか確認
let hasCodeChanges = false;
const codeExtensions = ['.js', '.mjs', '.ts', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.cs', '.php', '.swift', '.kt', '.vue', '.svelte', '.jsx', '.sh', '.bash', '.ps1', '.sql'];

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

  // 3.5. チェックリストの未チェック項目検出
  if (checklistExists && existsSync(checklistDir)) {
    try {
      const checklistFiles = readdirSync(checklistDir).filter(
        f => f.includes(projectName) && f.endsWith('.md')
      );
      // 最新のチェックリストを対象（日付降順で最初のもの）
      const sorted = checklistFiles.sort().reverse();
      if (sorted.length > 0) {
        const content = readFileSync(resolve(checklistDir, sorted[0]), 'utf-8');
        const lines = content.split('\n');
        const unchecked = lines.filter(l => /^\s*- \[ \]/.test(l) && !l.includes('[N/A]'));
        if (unchecked.length > 0) {
          missing.push(
            `checklist/${sorted[0]} に未チェック項目が ${unchecked.length} 件あります。` +
            `\n    先頭3件: ${unchecked.slice(0, 3).map(l => l.trim()).join(' / ')}` +
            `\n    チェックを埋めてからコミットしてください（不要項目は [N/A] と記載）`
          );
        }
      }
    } catch {
      // チェックリスト読み取りエラーはブロックしない
    }
  }

}

// --- 結果判定 ---

if (missing.length > 0) {
  const reason = [
    `🚫 コミット前の成果物チェック！プロジェクト「${projectName}」の以下が不足:`,
    ...missing.map(m => `  - ${m}`),
    '',
    '【ルール — 全commit必須の成果物6種】',
    '・報告書（result/）— どんな些細な作業でも必須',
    '・計画書（plans/）— 作業着手前に作成',
    '・テスト計画書（test-plan/）— テスト不要でも「テスト対象なし」と理由を記録',
    '・監査ログ（audit/）— トレーサビリティ・承認記録',
    '・生ログ（logs/）— エージェント行動の証跡',
    '・チェックリスト（checklist/）— コード変更時のみ',
  ].join('\n');

  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
}
