#!/usr/bin/env node
// commit-guard.mjs - コミット時の成果物ガード
// PreToolUse(Bash) で起動。
// git commit 実行時に以下を確認:
//   全commit必須（7種）: plans/ designs/ test-plan/ audit/ logs/ result/ metrics/
//   コード変更時のみ追加: checklist/
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

let projectName = null;

// 方法1: cdコマンドからプロジェクトディレクトリを特定
const workDirEscaped = workDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cdPattern = new RegExp(`cd\\s+(?:${workDirEscaped})\\/([^\\s/&;]+)`, 'i');
const cdMatch = command.match(cdPattern);
if (cdMatch) {
  projectName = cdMatch[1];
}

// 方法2: cdパターン不一致時、cwdがworkDir配下のプロジェクトディレクトリなら推定
if (!projectName) {
  const cwd = process.cwd().replace(/\\/g, '/');
  if (cwd.startsWith(workDir + '/')) {
    const relative = cwd.slice(workDir.length + 1);
    const parts = relative.split('/');
    if (parts.length >= 1 && parts[0]) {
      projectName = parts[0];
    }
  }
}

// 方法3: コマンド内の -C オプションからプロジェクトディレクトリを特定
if (!projectName) {
  const cOptPattern = new RegExp(`git\\s+-C\\s+(?:${workDirEscaped})\\/([^\\s/&;]+)`, 'i');
  const cOptMatch = command.match(cOptPattern);
  if (cOptMatch) {
    projectName = cOptMatch[1];
  }
}

// プロジェクト特定できない場合はスキップ（ブロックしない）
if (!projectName) {
  process.exit(0);
}

// メタディレクトリはスキップ
const metaDirs = [
  'plans', 'checklist', 'result', 'whiteboard', 'Purpose', 'memory',
  'metrics', '_archive', '_deleted', 'topic', 'test-plan', 'designs',
  'audit', 'logs',
];
if (metaDirs.includes(projectName)) {
  process.exit(0);
}

// --- フェーズコンテキスト読み取り ---

// .phase-context.json の taskName があれば、成果物検索にタスク名を使用（横断タスク対応）
let artifactName = projectName;
const phaseContextPath = resolve(workDir, '.phase-context.json');
if (existsSync(phaseContextPath)) {
  try {
    const ctx = JSON.parse(readFileSync(phaseContextPath, 'utf-8'));
    if (ctx.taskName) {
      artifactName = ctx.taskName;
    }
    // 偵察規模は成果物チェック不要
    if (ctx.scale && /^(偵察|recon|scout(ing)?)$/i.test(ctx.scale)) {
      process.exit(0);
    }
  } catch {
    // パースエラー時はprojectName使用
  }
}

// --- ユーティリティ: ディレクトリ内にプロジェクト名を含む.mdがあるか ---

function hasProjectFile(dirPath, projName) {
  if (!existsSync(dirPath)) return false;
  try {
    const files = readdirSync(dirPath);
    return files.some(f => f.includes(projName) && f.endsWith('.md'));
  } catch {
    return true; // 読み取りエラーはブロックしない
  }
}

// --- 成果物チェック ---

const now = new Date();
const today = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
const missing = [];

// 全commit必須（7種）
const alwaysRequired = [
  { dir: 'plans',     label: '計画書',       hint: '作業着手前に作成' },
  { dir: 'designs',   label: '設計書',       hint: '設計不要でも「設計対象なし」と理由を記録' },
  { dir: 'test-plan', label: 'テスト計画書', hint: 'テスト不要でも「テスト対象なし」と理由を記録' },
  { dir: 'audit',     label: '監査ログ',     hint: 'トレーサビリティ・承認記録を記入' },
  { dir: 'logs',      label: '生ログ',       hint: 'エージェント行動の証跡を記入' },
  { dir: 'result',    label: '報告書',       hint: 'どんな些細な作業でも必須' },
];

for (const { dir, label, hint } of alwaysRequired) {
  if (!hasProjectFile(resolve(workDir, dir), artifactName)) {
    missing.push({ dir, label, hint });
  }
}

// metrics/ チェック（PJ別累積ファイル: {PJ名}_metrics.md）
const metricsDir = resolve(workDir, 'metrics');
let metricsExists = false;
if (existsSync(metricsDir)) {
  try {
    const metricsFiles = readdirSync(metricsDir);
    metricsExists = metricsFiles.some(
      f => f.includes(artifactName) && f.endsWith('_metrics.md')
    );
  } catch {
    metricsExists = true;
  }
}
if (!metricsExists) {
  missing.push({ dir: 'metrics', label: 'メトリクス', hint: 'PJ別累積ファイルにタスク行を追記' });
}

// コード変更時のみ追加: checklist/
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
  hasCodeChanges = false;
}

if (hasCodeChanges) {
  if (!hasProjectFile(resolve(workDir, 'checklist'), artifactName)) {
    missing.push({ dir: 'checklist', label: 'チェックリスト', hint: 'コード変更あり — 作業+QA項目を作成' });
  }
}

// チェックリスト未チェック項目検出（チェックリストが存在すれば常にチェック）
{
  const checklistDir = resolve(workDir, 'checklist');
  if (existsSync(checklistDir)) {
    try {
      const checklistFiles = readdirSync(checklistDir).filter(
        f => f.includes(artifactName) && f.endsWith('.md')
      );
      const todayFiles = checklistFiles.filter(f => f.startsWith(today));
      const sorted = (todayFiles.length > 0 ? todayFiles : checklistFiles).sort().reverse();
      if (sorted.length > 0) {
        const content = readFileSync(resolve(checklistDir, sorted[0]), 'utf-8');
        const lines = content.split('\n');
        const unchecked = lines.filter(l => /^\s*- \[ \]/.test(l) && !l.includes('[N/A]'));
        if (unchecked.length > 0) {
          const preview = unchecked.slice(0, 3).map(l => l.trim()).join(' / ');
          missing.push({
            dir: 'checklist',
            label: `未チェック項目 ${unchecked.length} 件`,
            hint: `${sorted[0]} — ${preview}`,
          });
        }
      }
    } catch {
      // チェックリスト読み取りエラーはブロックしない
    }
  }
}

// --- 結果判定 ---

if (missing.length > 0) {
  const hints = missing.map(({ dir, hint }) =>
    `  → ${dir}/ に作成してください（${hint}）`
  );

  const reason = [
    `🚫 コミット前の成果物チェック！プロジェクト「${projectName}」${artifactName !== projectName ? `（タスク: ${artifactName}）` : ''}の以下が不足:`,
    ...missing.map(({ dir, label, hint }) => `  - ${dir}/*_${artifactName}*.md（${label} — ${hint}）`),
    '',
    ...hints,
    '',
    '【全commit必須の成果物（7種）】',
    '・計画書（plans/）・設計書（designs/）・テスト計画書（test-plan/）',
    '・監査ログ（audit/）・生ログ（logs/）・報告書（result/）・メトリクス（metrics/）',
    '【コード変更時のみ追加】',
    '・チェックリスト（checklist/）',
  ].join('\n');

  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
}
