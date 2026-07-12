#!/usr/bin/env node
// gate-guard.mjs - 開始ゲート構造ガード
// PreToolUse(Read/Edit/Write) で起動。
// - Read: ゲートファイル Read でフェーズ自動遷移（前方遷移のみ。逆行・横滑りは前方遷移ガードでスキップ）
// - Edit/Write: プロジェクトのソースコード編集時に plans/ と checklist/ の存在を確認。
//   不在ならブロックし、開始ゲート通過を強制する。

import { readFileSync, readdirSync, existsSync } from 'fs';
import { execFileSync } from 'node:child_process';
import { resolve, normalize } from 'path';

const input = JSON.parse(readFileSync(process.stdin.fd, 'utf-8'));
const { tool_name, tool_input } = input;

// --- 環境変数ベースのパス解決（56bddc1 スクラブパターン踏襲） ---
// 実運用は settings.json の env（NEKO_WORK_DIR）で注入。未設定時は cwd フォールバック
const workDir = (process.env.NEKO_WORK_DIR || process.cwd()).replace(/\\/g, '/');
// CLAUDE_CONFIG_DIR は Claude Code 本体の管理変数。未設定時は USERPROFILE/HOME から解決
const homeClaudeDir = (process.env.CLAUDE_CONFIG_DIR || ((process.env.USERPROFILE || process.env.HOME || '') + '/.claude')).replace(/\\/g, '/');
// phase-context の実体と管理スクリプトは workDir 基準で解決
const phaseContextPath = workDir + '/.phase-context.json';
const phaseScriptPath = workDir + '/multi-agent-neko/scripts/phase-context.mjs';

// --- ゲートファイル Read 時のフェーズ自動更新（S3: hook化） ---
if (tool_name === 'Read') {
  const readPath = normalize(tool_input.file_path || '').replace(/\\/g, '/');
  // ゲートファイル→フェーズのマッピング
  const gatePhaseMap = {
    'gates-start-nano.md': 'recon',
    'gates-start-mini.md': 'planning',
    'gates-start-full.md': 'planning',
    'gates-design.md': 'designing',
    'gates-complete.md': 'reviewing',
    'gates-complete-mini.md': 'reviewing',
    'gates-complete-full.md': 'reviewing',
  };
  // フェーズの線形順序（前方遷移ガード用）
  // 注: phase-context.mjs の VALID_PHASES と同期必須（phase 追加時は両方更新。別プロセスのため定数共有不可）
  // 注: ALLOWED_TRANSITIONS（遷移グラフ）とは意味論が別物 — これは逆行検知専用の線形順序
  const PHASE_ORDER = ['idle', 'recon', 'planning', 'designing', 'implementing', 'reviewing', 'done'];
  const readFileName = readPath.split('/').pop();
  const targetPhase = gatePhaseMap[readFileName];
  // .claude/gates/ 配下のゲートファイルReadのみ対象
  if (targetPhase && readPath.includes('.claude/gates/')) {
    try {
      // 既存のタスク名と現フェーズを取得（なければ pending / null）
      let taskName = 'pending';
      let currentPhase = null;
      try {
        const ctx = JSON.parse(readFileSync(phaseContextPath, 'utf8'));
        if (ctx.taskName) taskName = ctx.taskName;
        if (ctx.phase) currentPhase = ctx.phase;
      } catch { /* ファイル不在・破損は null のまま（初回セッション扱い、従来通り set 実行） */ }
      // --- 前方遷移ガード（設計レビュー会議 HIGH 対応） ---
      // phase-context.mjs の ALLOWED_TRANSITIONS は遷移を拒否しない（drift記録のみ）ため、
      // 後方・同位への auto-set はここでスキップして逆行・横滑りを防ぐ。
      // 現フェーズ不明（null）は従来通り set 実行 — 初回セッションの gates-start Read を妨げない。
      // 手動 set（phase-context.mjs 直接実行）は本ガードの対象外（総司令指示の巻き戻しを妨げない）。
      const curIdx = currentPhase ? PHASE_ORDER.indexOf(currentPhase) : -1;
      const tgtIdx = PHASE_ORDER.indexOf(targetPhase);
      if (curIdx >= 0 && tgtIdx >= 0 && tgtIdx <= curIdx) {
        process.stderr.write(`[phase-tracker] auto-set skip: ${currentPhase} -> ${targetPhase} は後方・同位遷移（前方遷移ガード）\n`);
        process.exit(0);
      }
      execFileSync('node', [
        phaseScriptPath,
        'set', targetPhase,
        '--actor', 'gate-guard-auto',
        '--task', taskName,
      ], { stdio: 'pipe', timeout: 5000 });
      process.stderr.write(`[phase-tracker] auto-set: ${targetPhase} (task: ${taskName})\n`);
    } catch (err) {
      // fail-open: フェーズ更新失敗でもReadをブロックしない
      process.stderr.write(`[phase-tracker] auto-set failed (fail-open): ${err.message}\n`);
    }
  }
  process.exit(0);
}

// Edit/Write のみ対象
if (tool_name !== 'Edit' && tool_name !== 'Write') {
  process.exit(0);
}

const filePath = normalize(tool_input.file_path || '').replace(/\\/g, '/');

// --- ~/.claude/ 配下のスキル・コマンドファイル編集チェック ---
const claudeSkillDirs = ['commands', 'skills'];
if (filePath.startsWith(homeClaudeDir + '/')) {
  const claudeRelative = filePath.slice(homeClaudeDir.length + 1);
  const claudeParts = claudeRelative.split('/');
  // commands/*.md or skills/*/*.md のみ対象
  if (claudeParts.length >= 2 && claudeSkillDirs.includes(claudeParts[0])) {
    // スキル/コマンド名を抽出（拡張子除去）
    const skillFile = claudeParts[0] === 'commands'
      ? claudeParts[1].replace(/\.md$/, '')  // commands/nano-banana.md → nano-banana
      : claudeParts[1];                       // skills/foo/SKILL.md → foo
    const plansDir = resolve(workDir, 'plans');
    let planFound = false;
    if (existsSync(plansDir)) {
      try {
        const planFiles = readdirSync(plansDir);
        planFound = planFiles.some(
          f => f.includes(skillFile) && f.endsWith('.md')
        );
      } catch {
        planFound = true; // エラー時はブロックしない
      }
    }
    if (!planFound) {
      const reason = [
        `🚫 スキル/コマンド変更に計画書がありません！`,
        `  対象: ${claudeRelative}`,
        `  必要: plans/ に「${skillFile}」を含む計画書（例: plans/YYYYMMDD_${skillFile}-update.md）`,
        '',
        'スキル変更も開発作業です。計画書とチェックリストを先に作成してください。',
      ].join('\n');
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: reason,
        },
      }));
      process.exit(0);
    }
  }
  // ~/.claude/hooks/hooks-overview.md はハーネス管理文書 → レビュー必須警告
  if (claudeRelative === 'hooks/hooks-overview.md') {
    process.stderr.write(`⚠️ [review-required] ${claudeRelative} はハーネス管理文書。変更後に kurouto-neko レビュー必須（review-protocol.md レビュー必須化スケール注記）\n`);
  }
  // ~/.claude/ 配下のその他ファイル（settings.json等）はスキップ
  process.exit(0);
}

// workDir 配下でなければスキップ
if (!filePath.startsWith(workDir + '/')) {
  process.exit(0);
}

// workDir 直下のファイル（CLAUDE.md等）はスキップ
const relative = filePath.slice(workDir.length + 1);
const parts = relative.split('/');
if (parts.length <= 1) {
  process.exit(0);
}

const projectName = parts[0];

// --- チェックリスト未完了検出（daily E-2: 報告フェーズブロック） ---
// result/ への書き込み（報告書作成）は下の metaDirs スキップで通過してしまうため、
// スキップされる前にここで検証する。
// 現在フェーズが reviewing（報告フェーズ）であれば、対応する checklist/*.md に
// 未チェック項目（- [ ]）が残っていないかを検証し、残っていればブロックする。
// reviewing→done遷移（phase-context.mjs set done は report レビューAPPROVEを別途要求する）
// の手前、報告書執筆時点での安全網として機能する。
if (projectName === 'result') {
  try {
    if (existsSync(phaseContextPath)) {
      const ctx = JSON.parse(readFileSync(phaseContextPath, 'utf8'));
      const taskName = ctx.taskName;
      // reviewingフェーズ かつ taskName が開始ゲート未設定状態(pending/unknown)でない場合のみ検証
      if (ctx.phase === 'reviewing' && taskName && !['pending', 'unknown'].includes(taskName)) {
        const checklistDirForReport = resolve(workDir, 'checklist');
        if (existsSync(checklistDirForReport)) {
          // checklist/*{taskName}*.md をGlob的に検索（既存の計画書/チェックリスト存在確認と同じincludes方式）
          const matchedChecklists = readdirSync(checklistDirForReport).filter(
            f => f.includes(taskName) && f.endsWith('.md')
          );
          const uncheckedItems = [];
          for (const f of matchedChecklists) {
            let content;
            try { content = readFileSync(resolve(checklistDirForReport, f), 'utf8'); } catch { continue; }
            // `- [ ]` 形式の未チェック行を抽出（先頭インデント許容、大文字小文字問わずスペース有無を許容）
            const lines = content.split('\n').filter(l => /^\s*-\s*\[\s*\]/.test(l));
            for (const line of lines) {
              uncheckedItems.push(`${f}: ${line.trim()}`);
            }
          }
          if (uncheckedItems.length > 0) {
            console.error(`🚫 チェックリスト未完了！報告書作成前に以下の項目を確認してください（taskName: ${taskName}）:`);
            for (const item of uncheckedItems) {
              console.error(`    ${item}`);
            }
            console.error('');
            console.error('全項目にチェック（- [x]）を入れてから報告書を作成してください。');
            process.exit(2);
          }
        }
      }
    }
  } catch {
    // fail-open: JSON破損・読み取りエラー時はブロックしない（既存方針踏襲）
  }
}

// メタディレクトリはスキップ（ゲート成果物自体の作成を妨げない）
// NOTE: multi-agent-neko は開発対象として扱う（メタディレクトリから除外 2026-03-15）
// NOTE: scripts は作業ツール置き場（gate_check.py / reindex.sh / audit-harness.mjs 等）
// として扱い、計画書ゲートから除外（2026-05-23 第205回フルコース メイン2、Nit-B 対応）
const metaDirs = [
  'plans', 'checklist', 'result', 'whiteboard', 'Purpose', 'memory',
  'metrics', '_archive', '_deleted', 'topic', 'kidou', 'scratch',
  'claude-skills', '依頼事項', 'test-plan', 'audit', 'logs', 'designs',
  'chat-logs', 'reviews', 'daily', 'scripts',
];
if (metaDirs.includes(projectName)) {
  process.exit(0);
}

// phase-context.json 存在チェック（開始ゲート通過強制）
// fail-closed: ファイル不在 = BLOCK（古い計画書素通り防止）
if (!existsSync(phaseContextPath)) {
  const reason = [
    '開始ゲートを先に通してください。gates-start-*.md をReadしてください。',
    '',
    '.phase-context.json が存在しません。',
    'このファイルを削除してもブロックは解除されません（fail-closed設計）。',
    'gates-start-nano.md / gates-start-mini.md / gates-start-full.md のいずれかを Read して',
    '開始ゲートを通過してから作業を開始してください。',
  ].join('\n');
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

// phase-context.json のフェーズ値チェック
// idle/planning/done はブロック。designing は自動昇格。implementing/reviewing は通過
try {
  const ctx = JSON.parse(readFileSync(phaseContextPath, 'utf8'));
  // 陳腐コンテキスト検知: updatedAt が2時間超なら警告（S2: 2026-07-03）
  if (ctx.updatedAt) {
    try {
      const ageMs = Date.now() - new Date(ctx.updatedAt).getTime();
      const TWO_HOURS = 2 * 60 * 60 * 1000;
      if (ageMs > TWO_HOURS) {
        const ageH = Math.floor(ageMs / 3600000);
        process.stderr.write(`⚠️ [gate-guard] phase-context が ${ageH}時間前のものです。新タスクなら開始ゲートを通し直してください。\n`);
      }
    } catch { /* Date parse失敗は無視 */ }
  }
  // idle/planning/done はコード編集ブロック（designing は下で自動昇格）
  // done: タスク完了後のコード編集を阻止し、新タスクの開始ゲート通過を強制（S2: 2026-07-03）
  const blockedPhases = ['idle', 'planning', 'done'];
  if (ctx.phase && blockedPhases.includes(ctx.phase)) {
    // done フェーズは別メッセージ（kurouto Warning対応: 2026-07-03）
    const phaseMsg = ctx.phase === 'done'
      ? [
          `前のタスクが完了済み（phase: done）です。新しいタスクの開始ゲートを通してください。`,
          '',
          `前タスク: ${ctx.taskName || '不明'}`,
          `手順: gates-start-nano.md / gates-start-mini.md / gates-start-full.md のいずれかを Read`,
        ].join('\n')
      : [
          `現在のフェーズは「${ctx.phase}」です。コード編集は implementing フェーズ以降で行ってください。`,
          '',
          `タスク: ${ctx.taskName || '不明'}`,
          `遷移コマンド: node ${phaseScriptPath} set implementing --actor <actor> --task <task>`,
        ].join('\n');
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: phaseMsg,
      },
    }));
    process.exit(0);
  }
  // designing → implementing 自動昇格（ゲートファイルにトリガーがないため hook で遷移）
  if (ctx.phase === 'designing') {
    try {
      execFileSync('node', [
        phaseScriptPath,
        'set', 'implementing',
        '--actor', 'gate-guard-auto',
        '--task', ctx.taskName || 'pending',
      ], { stdio: 'pipe', timeout: 5000 });
      process.stderr.write(`[phase-tracker] auto-promote: designing -> implementing (task: ${ctx.taskName || 'pending'})\n`);
    } catch (err) {
      // fail-open: 昇格失敗でもEdit/Writeを通す
      process.stderr.write(`[phase-tracker] auto-promote failed (fail-open): ${err.message}\n`);
    }
    process.exit(0);
  }

  // --- kantoku-guard: stall検知（Layer 1, v5） ---
  // implementing/reviewing フェーズで updatedAt から15分以上経過している場合、
  // 作業停滞（stall）の可能性をstderrに警告する（ブロックはしない）。
  // idle/planning/done は上でブロック済み、designing は自動昇格済み。
  const STALL_THRESHOLD_MS = 15 * 60 * 1000;
  const kantokuActivePhases = ['implementing', 'reviewing'];
  if (ctx.phase && kantokuActivePhases.includes(ctx.phase) && ctx.updatedAt) {
    const elapsed = Date.now() - new Date(ctx.updatedAt).getTime();
    if (elapsed > STALL_THRESHOLD_MS) {
      const mins = Math.floor(elapsed / 60000);
      process.stderr.write(
        `[kantoku-guard] stall警告: phase=${ctx.phase}, task=${ctx.taskName || 'unknown'}, ${mins}分間未更新\n`
      );
    }
  }

  // --- kantoku-guard: ドリフト履歴警告（Layer 1, v5） ---
  // phase-context.json に driftCount（逸脱記録件数）が1件以上残っている場合、
  // 過去に逸脱があった状態での作業継続であることを可視化する。
  if (ctx.driftCount && ctx.driftCount > 0) {
    process.stderr.write(
      `[kantoku-guard] ドリフト履歴警告: ${ctx.driftCount}件の逸脱記録あり (task=${ctx.taskName || 'unknown'})\n`
    );
  }

  // --- kantoku-guard: 未設定タスク警告（Layer 1, v5） ---
  // taskName が 'pending'/'unknown' のまま（開始ゲートでの設定未完了のまま）
  // done以外のフェーズで作業が進んでいる場合に警告する。
  const pendingNames = ['pending', 'unknown'];
  if (ctx.taskName && pendingNames.includes(ctx.taskName) && ctx.phase !== 'done') {
    process.stderr.write(
      `[kantoku-guard] タスク未設定警告: taskName=${ctx.taskName}, phase=${ctx.phase}。開始ゲートでtaskNameを設定してください\n`
    );
  }
} catch {
  // JSON破損時はブロックしない（fail-open）
}

// プロジェクト内の .claude/ — rules/gates/agents はレビュー必須警告
// NOTE: metaDirs に .claude を含めないこと（下記ハーネスチェックが無効化されるため）
const harnessSubDirs = new Set(['rules', 'gates', 'agents']);
if (parts.some(p => p === '.claude')) {
  const claudeIdx = parts.indexOf('.claude');
  if (claudeIdx + 1 < parts.length && harnessSubDirs.has(parts[claudeIdx + 1])) {
    process.stderr.write(`⚠️ [review-required] ${relative} はハーネスファイル。変更後に kurouto-neko レビュー必須（review-protocol.md レビュー必須化スケール注記）\n`);
  }
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

// 日付鮮度チェック: ファイル名先頭のYYYYMMDDが直近N日以内か判定
// 日付プレフィックスなしのファイルは後方互換で通過させる
function isRecentFile(filename, maxDaysOld) {
  const match = filename.match(/^(\d{4})(\d{2})(\d{2})_/);
  if (!match) return true;
  const fileDate = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
  const jst = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
  const [y, m, d] = jst.split('-').map(Number);
  const today = new Date(Date.UTC(y, m - 1, d));
  const diffDays = Math.round((today - fileDate) / 86400000);
  return diffDays >= 0 && diffDays <= maxDaysOld;
}

// plans/ にプロジェクト名を含む .md が存在するか
// 形式: YYYYMMDD_{PJ名}.md, {PJ名}_*.md, YYYYMMDD_{PJ名含む説明}.md
const plansDir = resolve(workDir, 'plans');
let planExists = false;
if (existsSync(plansDir)) {
  try {
    const planFiles = readdirSync(plansDir);
    planExists = planFiles.some(
      f => f.includes(projectName) && f.endsWith('.md') && isRecentFile(f, 3)
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
      f => f.includes(projectName) && f.endsWith('.md') && isRecentFile(f, 3)
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
  const hints = [];
  if (!planExists) {
    hints.push(`  → 計画書: /neko-gundan design "タスク説明" を実行、もしくは plans/YYYYMMDD_${projectName}.md を作成してください`);
  }
  if (!checklistExists) {
    hints.push(`  → チェックリスト: checklist/YYYYMMDD_${projectName}.md を作成してください`);
  }

  const reason = [
    `🚫 開始ゲート未完了！プロジェクト「${projectName}」の以下の成果物が存在しません:`,
    ...missing.map(m => `  - ${m}`),
    '',
    ...hints,
  ].join('\n');

  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
}
