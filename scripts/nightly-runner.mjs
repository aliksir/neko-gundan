#!/usr/bin/env node
// nightly-runner.mjs - 深夜帯（23:00-07:00 JST）夜間ジョブエントリポイント
//
// 設計書: designs/20260425_nightly-fullauto.md §6 H5
// ルール: ~/.claude/rules/nightly-autopilot.md
// ポリシー: multi-agent-neko/rules/nightly-policy.yml
// ゲート: ~/.claude/gates/gates-nightly.md
//
// CLI 引数:
//   --dry-run             Telegram 送信や Draft PR 作成をモックする
//   --bypass-time-check   時刻ゲート（gate 1）を skip（テスト用）
//   --queue-add <type>    queue/nightly/ にジョブを追加して終了
//   --debug               詳細ログを出力

import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
export const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const QUEUE_DIR = path.join(REPO_ROOT, 'queue/nightly');
const RESULTS_DIR = path.join(QUEUE_DIR, 'results');
const POLICY_PATH = path.join(REPO_ROOT, 'rules/nightly-policy.yml');
const CB_STATE_PATH = path.join(REPO_ROOT, 'status/circuit-breaker.json');

// ===== パス解決（env 優先、未設定時は現行パスに解決＝挙動不変。既存 hooks 規約準拠）=====
// NEKO_WORK_DIR        作業ルート（default: REPO_ROOT の親）
// HOME / USERPROFILE   ホーム（CLAUDE_CONFIG_DIR の導出元）
// CLAUDE_CONFIG_DIR    .claude 設定ディレクトリ（default: ${HOME}/.claude）
// NEKO_PROFILE_PATH    夜間 profile（default: ${CLAUDE_CONFIG_DIR}/profiles/nightly.json）
// NEKO_LOG_DIR         ログ出力先（default: ${WORK_DIR}/logs）
// NEKO_MEMO_YOSHI_DIR  memo-yoshi リポ（default: ${WORK_DIR}/memo-yoshi）
// LESSONS_DIR の C--work は Claude Code project-dir エンコード（PII でない。WORK_DIR 非追従の既知の限界）
export function resolvePaths(env = process.env, repoRoot = REPO_ROOT) {
  const workDir = (env.NEKO_WORK_DIR || path.resolve(repoRoot, '..')).replace(/\\/g, '/');
  const homeDir = (env.HOME || env.USERPROFILE || '').replace(/\\/g, '/');
  const claudeConfigDir = (env.CLAUDE_CONFIG_DIR || `${homeDir}/.claude`).replace(/\\/g, '/');
  const profilePath = (env.NEKO_PROFILE_PATH || `${claudeConfigDir}/profiles/nightly.json`).replace(/\\/g, '/');
  const logDir = (env.NEKO_LOG_DIR || `${workDir}/logs`).replace(/\\/g, '/');
  const memoYoshiDir = (env.NEKO_MEMO_YOSHI_DIR || `${workDir}/memo-yoshi`).replace(/\\/g, '/');
  const lessonsDir = `${claudeConfigDir}/projects/C--work/memory/lessons`;
  return { workDir, homeDir, claudeConfigDir, profilePath, logDir, logPath: `${logDir}/nightly-runner.log`, memoYoshiDir, lessonsDir };
}

const { workDir: WORK_DIR, claudeConfigDir: CLAUDE_CONFIG_DIR, profilePath: PROFILE_PATH,
        logPath: LOG_PATH, memoYoshiDir: MEMO_YOSHI_DIR, lessonsDir: LESSONS_DIR } = resolvePaths();

// CB 状態遷移: OPEN → HALF-OPEN になるまでの cool-down 秒数（modules/circuit-breaker.md 準拠）
const CB_COOLDOWN_SEC = 60;
const CB_FAILURE_THRESHOLD = 3;

// ジョブ status 定数（stringly-typed 排除）
export const STATUS = Object.freeze({
  SUCCESS: 'success',
  FAILED: 'failed',
  TIMEOUT: 'timeout',
  DRY_RUN: 'dry_run',
  SKIPPED_CB_OPEN: 'skipped_cb_open',
});

// CLI 引数 parse（log() より先に初期化、TDZ 回避）
const args = (() => {
  const a = process.argv.slice(2);
  const queueAddIdx = a.indexOf('--queue-add');
  return {
    dryRun: a.includes('--dry-run'),
    bypassTimeCheck: a.includes('--bypass-time-check'),
    debug: a.includes('--debug'),
    queueAdd: queueAddIdx >= 0 && queueAddIdx + 1 < a.length ? a[queueAddIdx + 1] : null,
  };
})();

// ===== JST 固定時刻判定（モジュールスコープで Intl 一度だけ生成） =====
const NIGHT_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tokyo',
  hour: 'numeric',
  hour12: false,
});
const DATE_FMT = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function isNightJST(now = new Date()) {
  const hour = parseInt(NIGHT_FMT.format(now), 10);
  return hour >= 23 || hour < 7;
}

function nowJSTString() {
  return new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

function jstDateString() {
  return DATE_FMT.format(new Date());
}

// ===== ログ出力 =====
// fs.appendFile が正（bat redirect は排除済み）。stdout は補助（EPIPE 時は無視）
async function log(msg, debugOnly = false) {
  if (debugOnly && !args.debug) return;
  const line = `[${nowJSTString()}] ${msg}\n`;
  try { process.stdout.write(line); } catch { /* EPIPE safe */ }
  try {
    await fs.appendFile(LOG_PATH, line);
  } catch (e) {
    try { process.stderr.write(`[nightly-runner] log write failed: ${e.message}\n`); } catch { /* ignore */ }
  }
}

// ===== テンプレ展開（{KEY} → vars[KEY]、未知のキーは保持）=====
// 用途: nightly-policy.yml の prompt_template 内 {YYYYMMDD} 等を実値に置換
// 仕様: SCREAMING_SNAKE_CASE のみマッチ、未知キーはリテラル維持（過剰展開しない）
export function expandTemplate(text, vars) {
  return text.replace(/\{([A-Z_][A-Z0-9_]*)\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match;
  });
}

// ===== YAML パーサ（nightly-policy.yml の構造に特化、依存ゼロ）=====
// 対応構造: top-level key: value、ネスト object、`- name: ...` 配列要素
// 非対応: 複数行文字列の `|`、フロー記法 `[a, b]`、複雑な anchor
//
// stack の各要素: { container, key, indent, ref }
//   container[key] が ref を指す（ルートは container=null, key=null, ref=root）
//   配列要素 `- ...` 出現時、現在の ref が {} なら親の container[key] を [] に書き換える
export function parseYaml(text) {
  const lines = text.split('\n');
  const root = {};
  const stack = [{ container: null, key: null, indent: -1, ref: root }];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const indent = raw.length - raw.trimStart().length;

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const top = stack[stack.length - 1];
    let current = top.ref;

    // 配列要素
    if (trimmed.startsWith('- ')) {
      const inner = trimmed.slice(2);
      if (!Array.isArray(current)) {
        if (top.container !== null && top.key !== null) {
          top.container[top.key] = [];
          current = top.container[top.key];
          top.ref = current;
        } else {
          continue;
        }
      }
      const m = inner.match(/^([\w_-]+):\s*(.*)$/);
      if (m) {
        const newObj = {};
        newObj[m[1]] = parseValue(m[2]);
        current.push(newObj);
        // indent + 1: 次の行の "    key:" (indent+2) を要素内フィールドとして取り込めるよう
        stack.push({ container: current, key: current.length - 1, indent: indent + 1, ref: newObj });
      } else {
        current.push(parseValue(inner));
      }
      continue;
    }

    // key: value 形式
    const m = trimmed.match(/^([\w_-]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, val] = m;
    if (val === '|') {
      // YAML pipe block scalar: kurouto P0（cycle3）。後続のインデント超過行を文字列として収集
      const block = [];
      let blockIndent = null;
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        if (next.trim() === '') { block.push(''); i++; continue; }
        const nextIndent = next.length - next.trimStart().length;
        if (nextIndent <= indent) break;
        if (blockIndent === null) blockIndent = nextIndent;
        block.push(next.slice(blockIndent));
        i++;
      }
      while (block.length > 0 && block[block.length - 1] === '') block.pop();
      current[key] = block.length > 0 ? block.join('\n') + '\n' : '';
    } else if (val === '') {
      current[key] = {};
      stack.push({ container: current, key, indent, ref: current[key] });
    } else {
      current[key] = parseValue(val);
    }
  }

  return root;
}

function parseValue(s) {
  s = s.trim();
  // 引用符付きはそのまま中身を取り出し（コメントは除去しない）
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  // 引用符なしはインラインコメント `# ...` を除去
  const hashIdx = s.indexOf('#');
  if (hashIdx >= 0) s = s.slice(0, hashIdx).trim();
  if (s === '' || s === '|') return '';
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  return s;
}

// ===== policy.prompt_template を job に注入（kurouto P0 cycle3）=====
// queue JSON は軽量定義のため prompt_template を持たない。policy.yml が真の prompt 出典として
// buildClaudeCmd に届くよう、policy エントリの prompt_template を job にマージする。
// jobs は filter 済（nightly_ok 該当のみ）を期待。
export function mergePolicyPromptTemplates(jobs, policy) {
  const okEntries = new Map((policy?.nightly_ok ?? []).map(p => [p.name, p]));
  return jobs.map(j => {
    const policyEntry = okEntries.get(j.name);
    if (policyEntry?.prompt_template && j.prompt == null && j.prompt_template == null) {
      return { ...j, prompt_template: policyEntry.prompt_template };
    }
    return j;
  });
}

// ===== ポリシー読込 =====
async function loadPolicy() {
  const text = await fs.readFile(POLICY_PATH, 'utf-8');
  const parsed = parseYaml(text);
  // 必須フィールド確認
  if (!parsed.nightly_ok || !Array.isArray(parsed.nightly_ok)) {
    throw new Error('policy.nightly_ok が配列でない');
  }
  if (!parsed.limits || typeof parsed.limits !== 'object') {
    throw new Error('policy.limits 不在');
  }
  return parsed;
}

// ===== ジョブキュー読込 =====
async function loadJobQueue() {
  if (!existsSync(QUEUE_DIR)) {
    await fs.mkdir(QUEUE_DIR, { recursive: true });
    return [];
  }
  const files = await fs.readdir(QUEUE_DIR);
  const jobFiles = files.filter(f =>
    !f.startsWith('processed_') &&
    !f.startsWith('.') &&
    (f.endsWith('.yml') || f.endsWith('.json'))
  );
  const jobs = [];
  for (const f of jobFiles) {
    const filePath = path.join(QUEUE_DIR, f);
    const text = await fs.readFile(filePath, 'utf-8');
    try {
      let parsed;
      if (f.endsWith('.json')) {
        parsed = JSON.parse(text);
      } else {
        parsed = parseYaml(text);
      }
      jobs.push({ ...parsed, _file: f });
    } catch (e) {
      await log(`ジョブファイル parse 失敗: ${f} - ${e.message}`);
    }
  }
  return jobs;
}

// ===== サーキットブレーカー状態 =====
async function loadCircuitBreakerState() {
  if (!existsSync(CB_STATE_PATH)) {
    return { claude_cli: { state: 'CLOSED', failures: 0, last_failure: null } };
  }
  try {
    const text = await fs.readFile(CB_STATE_PATH, 'utf-8');
    return JSON.parse(text);
  } catch (e) {
    process.stderr.write(`[nightly-runner] CB 状態 JSON 破損、CLOSED で再初期化: ${e.message}\n`);
    return { claude_cli: { state: 'CLOSED', failures: 0, last_failure: null } };
  }
}

async function saveCircuitBreakerState(state) {
  await fs.mkdir(path.dirname(CB_STATE_PATH), { recursive: true });
  await fs.writeFile(CB_STATE_PATH, JSON.stringify(state, null, 2));
}

function cbIsOpen(cb, key = 'claude_cli') {
  const k = cb[key];
  if (!k) return false;
  if (k.state === 'OPEN') {
    // OPEN → HALF-OPEN 遷移判定（cool-down 経過後）
    if (k.last_failure) {
      const elapsedSec = (Date.now() - new Date(k.last_failure).getTime()) / 1000;
      if (elapsedSec >= CB_COOLDOWN_SEC) {
        k.state = 'HALF-OPEN';
        return false;  // HALF-OPEN は1リクエストだけ試行可
      }
    }
    return true;
  }
  return false;
}

function cbRecordFailure(cb, key = 'claude_cli') {
  cb[key] ??= { state: 'CLOSED', failures: 0, last_failure: null };
  cb[key].failures = (cb[key].failures ?? 0) + 1;
  cb[key].last_failure = new Date().toISOString();
  if (cb[key].failures >= CB_FAILURE_THRESHOLD) {
    cb[key].state = 'OPEN';
  }
}

function cbRecordSuccess(cb, key = 'claude_cli') {
  cb[key] ??= { state: 'CLOSED', failures: 0, last_failure: null };
  cb[key].state = 'CLOSED';
  cb[key].failures = 0;
}

// ===== Telegram 通知 =====
// 既存パターン: ~/.claude/hooks/telegram/send_to_bot.mjs と同等
// PoC では log 出力のみ。本格運用時は localhost:18923/notify への POST に切替
async function notifyTelegram(message, dryRun = false) {
  if (dryRun) {
    await log(`[dry-run-notify] ${message}`);
    return { ok: true, dry_run: true };
  }
  await log(`[notify] ${message}`);
  return { ok: true, fallback: 'log_only' };
}

// ===== claude CLI cmd 構築 =====
// dateStr: 第3引数で固定日付を注入可能（テスト容易性）。デフォルトは JST 当日 YYYYMMDD。
export function buildClaudeCmd(job, profilePath = PROFILE_PATH, dateStr = jstDateString().replace(/-/g, ''), opts = {}) {
  const workDir = opts.workDir ?? WORK_DIR;
  const memoYoshiDir = opts.memoYoshiDir ?? MEMO_YOSHI_DIR;
  const claudeConfigDir = opts.claudeConfigDir ?? CLAUDE_CONFIG_DIR;
  const lessonsDir = opts.lessonsDir ?? LESSONS_DIR;

  // テンプレ展開: prompt_template 内の {YYYYMMDD} / {WORK_DIR} / {MEMO_YOSHI_DIR} 等を実値に置換
  const rawPrompt = job.prompt ?? job.prompt_template ?? `[${job.name}] dry-run prompt`;
  const expandedPrompt = expandTemplate(rawPrompt, {
    YYYYMMDD: dateStr,
    JOB_NAME: job.name,
    WORK_DIR: workDir,
    MEMO_YOSHI_DIR: memoYoshiDir,
    CLAUDE_CONFIG_DIR: claudeConfigDir,
    LESSONS_DIR: lessonsDir,
  });

  // claude CLI: --disallowedTools / --allowedTools は variadic、1フラグに空白区切り（設計書 §0.1.5）
  return [
    'claude', '-p',
    '--settings', profilePath,
    '--add-dir', memoYoshiDir,
    '--disallowedTools',
      'Bash(git push origin master:*) Bash(git push origin main:*) Bash(git push --force:*) Bash(git push -f:*) Bash(rm:*) Bash(taskkill:*)',
    '--allowedTools',
      // Bash(git checkout:*)/(git switch:*)/(git branch:*) は kurouto P0 指摘で追加。prompt_template ステップ2 `git checkout -b` を blocked させないため。
      `Read(**) Edit(${workDir}/**) Bash(git status:*) Bash(git log:*) Bash(git add:*) Bash(git commit:*) Bash(git checkout:*) Bash(git switch:*) Bash(git branch:*) Bash(git push origin:*) Bash(gh pr create --draft:*) Bash(node:*) Bash(python:*)`,
    '--no-session-persistence',
    '--output-format', 'json',
    expandedPrompt,
  ];
}

// ===== ジョブ実行 =====
async function runJob(job) {
  await log(`ジョブ開始: ${job.name}`);
  const cmd = buildClaudeCmd(job);

  if (args.dryRun) {
    await log(`[dry-run] cmd preview: claude ${cmd.slice(1, 5).join(' ')} ...`);
    return {
      job_name: job.name,
      status: STATUS.DRY_RUN,
      cmd_full: cmd.slice(0, 7).join(' ') + ' ...',
      cost_usd: 0,
    };
  }

  const timeoutMs = (job.timeout_min ?? 30) * 60 * 1000;
  return await spawnWithTimeout(cmd, timeoutMs, job.name);
}

// stdout バッファ上限（OOM 回避）
const STDOUT_MAX_BYTES = 10 * 1024 * 1024;  // 10MB

async function spawnWithTimeout(cmd, timeoutMs, jobName) {
  return new Promise((resolve) => {
    const child = spawn(cmd[0], cmd.slice(1), { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let stdoutTruncated = false;
    let timedOut = false;

    let killTimer = null;
    const termTimer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      // SIGTERM 後5秒で SIGKILL（kurouto-neko 実装レビュー Q1 修正）
      killTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
      killTimer.unref?.();
    }, timeoutMs);
    termTimer.unref?.();

    child.stdout.on('data', d => {
      if (stdout.length < STDOUT_MAX_BYTES) {
        stdout += d.toString();
        if (stdout.length >= STDOUT_MAX_BYTES) {
          stdoutTruncated = true;
          stdout = stdout.slice(0, STDOUT_MAX_BYTES);
        }
      }
    });
    child.stderr.on('data', d => stderr += d.toString());

    child.on('close', (code) => {
      clearTimeout(termTimer);
      if (killTimer) clearTimeout(killTimer);
      let parsed = null;
      try { parsed = JSON.parse(stdout); } catch {}
      resolve({
        job_name: jobName,
        status: timedOut ? STATUS.TIMEOUT : (code === 0 ? STATUS.SUCCESS : STATUS.FAILED),
        exit_code: code,
        cost_usd: parsed?.total_cost_usd ?? 0,
        timed_out: timedOut,
        stdout_truncated: stdoutTruncated,
        stderr_tail: stderr.slice(-500),
      });
    });
  });
}

// ===== 結果保存 =====
async function saveResults(results) {
  const datestr = jstDateString();
  const file = path.join(RESULTS_DIR, `${datestr}.json`);
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  let existing = [];
  if (existsSync(file)) {
    try {
      existing = JSON.parse(await fs.readFile(file, 'utf-8'));
      if (!Array.isArray(existing)) existing = [];
    } catch (e) {
      process.stderr.write(`[nightly-runner] results.json 破損、空で再開（既存データ消失）: ${e.message}\n`);
      existing = [];
    }
  }
  existing.push(...results);
  await fs.writeFile(file, JSON.stringify(existing, null, 2));
  return file;
}

// jobs ファイルが results JSON として渡された配列ならカウント（テスト容易性のため export）。
// 実装本体: list 引数を受け取り、dry_run を除外したカウントを返す純粋関数。
export function countNonDryRunResults(list) {
  if (!Array.isArray(list)) return 0;
  return list.filter(e => e?.status !== STATUS.DRY_RUN).length;
}

async function countTodayResults() {
  const file = path.join(RESULTS_DIR, `${jstDateString()}.json`);
  if (!existsSync(file)) return 0;
  try {
    const list = JSON.parse(await fs.readFile(file, 'utf-8'));
    return countNonDryRunResults(list);
  } catch {
    return 0;
  }
}

// ===== ゲート（gates-nightly.md 準拠） =====
// process.exit() は stdout 未フラッシュで出力消失する（2026-06-22 調査で判明）
// GateFailure を throw → main catch で exitCode 設定 → 自然終了でフラッシュ待ち
class GateFailure extends Error {
  constructor(exitCode) { super('gate'); this.exitCode = exitCode; }
}

async function failGate(gateNum, msg, exitCode, telegramMsg) {
  await log(`[gate ${gateNum} FAIL] ${msg}`);
  if (telegramMsg) await notifyTelegram(telegramMsg, args.dryRun);
  throw new GateFailure(exitCode);
}

async function runStartupGates(policy) {
  // Gate 1: 時刻（exit 0 = エラーではない、schtasks 誤発動の可能性）
  if (!args.bypassTimeCheck && !isNightJST()) {
    await failGate(1, '深夜帯外。schtasks 誤発動の可能性。終了。', 0);
  }
  // Gate 2: profile 存在（exit 1 = 致命的）
  if (!existsSync(PROFILE_PATH)) {
    await failGate(2, `profile 不在: ${PROFILE_PATH}`, 1, '[NIGHTLY-FATAL] profile 不在で起動失敗');
  }
  // Gate 3: policy 既に load 済（呼び出し元で確認済）
  // Gate 4: CB 状態（exit 0 = 運用的中止）
  const cb = await loadCircuitBreakerState();
  if (cbIsOpen(cb)) {
    await failGate(4, 'circuit-breaker OPEN', 0, '[NIGHTLY-CB] CB OPEN、復旧待ち');
  }
  // Gate 5: 1日上限（policy 駆動）
  const todayCount = await countTodayResults();
  const maxJobs = policy.limits?.max_jobs_per_night ?? 5;
  if (todayCount >= maxJobs) {
    await failGate(5, `1日上限到達 (${todayCount}/${maxJobs})`, 0, '[NIGHTLY-LIMIT] 1日ジョブ上限到達');
  }
  // Gate 6: AGENT_STOP チェック（監督猫により作業停止中はジョブスキップ）
  const agentStopPath = `${CLAUDE_CONFIG_DIR}/AGENT_STOP`;
  if (existsSync(agentStopPath)) {
    await failGate(6, 'AGENT_STOP 存在（監督猫により作業停止中）', 0,
      '[NIGHTLY-KANTOKU] AGENT_STOP によりジョブスキップ。解除は総司令のみ');
  }
  await log(`[gates] 起動前ゲート PASS（時刻/profile/policy/CB/上限 ${todayCount}/${maxJobs}/AGENT_STOP）`);
  return cb;
}

// ===== --queue-add ヘルパー =====
async function queueAdd(jobType) {
  await fs.mkdir(QUEUE_DIR, { recursive: true });
  const datestr = jstDateString().replace(/-/g, '');
  const file = path.join(QUEUE_DIR, `${datestr}_${jobType}.json`);
  await fs.writeFile(file, JSON.stringify({
    name: jobType,
    queued_at: nowJSTString(),
    max_budget_usd: 2.00,
    timeout_min: 30,
  }, null, 2));
  await log(`ジョブ追加: ${file}`);
}

// ===== メイン =====
async function main() {
  await log(`=== nightly-runner 起動 ${args.dryRun ? '[dry-run]' : ''} ===`);

  if (args.queueAdd) {
    await queueAdd(args.queueAdd);
    return;
  }

  // policy load（gate 3 兼ねる）
  let policy;
  try {
    policy = await loadPolicy();
    await log(`[gate 3] policy 読込 PASS（OK ${policy.nightly_ok.length}件 / NG ${policy.nightly_ng?.length ?? 0}件）`);
  } catch (e) {
    await log(`[gate 3 FAIL] policy 読込失敗: ${e.message}`);
    await notifyTelegram('[NIGHTLY-FATAL] policy 読込失敗', args.dryRun);
    process.exit(1);
  }

  const cb = await runStartupGates(policy);

  // ジョブ読込 + policy フィルタ + policy.prompt_template の注入（kurouto P0 cycle3）
  const allJobs = await loadJobQueue();
  const okNames = new Set(policy.nightly_ok.map(p => p.name));
  const ngNames = new Set((policy.nightly_ng ?? []).map(p => p.name));
  const filteredJobs = allJobs.filter(j => {
    if (ngNames.has(j.name)) {
      log(`ジョブ ${j.name} は nightly_ng 該当、skip`);
      return false;
    }
    if (!okNames.has(j.name)) {
      log(`ジョブ ${j.name} は policy 未登録、skip`);
      return false;
    }
    return true;
  });
  const validJobs = mergePolicyPromptTemplates(filteredJobs, policy);
  await log(`ジョブ数: 全${allJobs.length} / valid ${validJobs.length}`);

  // 予算上限は撤廃（2026-05-09、Claude Code Pro plan 運用のため。cost_usd 記録は維持）
  const results = [];
  let totalUsd = 0;

  for (const job of validJobs) {
    if (cbIsOpen(cb)) {
      results.push({ job_name: job.name, status: STATUS.SKIPPED_CB_OPEN, cost_usd: 0 });
      continue;
    }

    const result = await runJob(job);
    results.push(result);
    totalUsd += result.cost_usd ?? 0;

    if (result.status === STATUS.SUCCESS || result.status === STATUS.DRY_RUN) {
      cbRecordSuccess(cb);
    } else if (result.status === STATUS.FAILED || result.status === STATUS.TIMEOUT) {
      cbRecordFailure(cb);
    }

    // ジョブファイルを処理済みにリネーム（dry-run 時は skip）
    if (job._file && !args.dryRun) {
      try {
        await fs.rename(
          path.join(QUEUE_DIR, job._file),
          path.join(QUEUE_DIR, 'processed_' + job._file),
        );
      } catch (e) {
        await log(`ジョブファイル rename 失敗 (${job._file}): ${e.message}`);
      }
    }
  }

  // CB 状態永続化
  await saveCircuitBreakerState(cb);

  // 結果集計（results から導出、二重管理排除）
  const success = results.filter(r => r.status === STATUS.SUCCESS).length;
  const dryRun = results.filter(r => r.status === STATUS.DRY_RUN).length;
  const failed = results.filter(r => [STATUS.FAILED, STATUS.TIMEOUT].includes(r.status)).length;
  const skipped = results.filter(r => r.status === STATUS.SKIPPED_CB_OPEN).length;

  const resultFile = await saveResults(results);
  await log(`結果保存: ${resultFile}`);

  await notifyTelegram(
    `nightly-runner 完了: 成功 ${success} / dry-run ${dryRun} / 失敗 ${failed} / skip ${skipped} / 合計 $${totalUsd.toFixed(2)}`,
    args.dryRun,
  );

  await log('=== nightly-runner 終了 ===');
}

// テストインポート時は main() を起動しない
const isMain = (() => {
  try {
    return path.resolve(process.argv[1] ?? '') === path.resolve(__filename);
  } catch {
    return false;
  }
})();

if (isMain) {
  main().catch(async (e) => {
    if (e instanceof GateFailure) {
      process.exitCode = e.exitCode;
      return;
    }
    await log(`FATAL: ${e.message}\n${e.stack}`);
    await notifyTelegram(`[NIGHTLY-FATAL] ${e.message}`, args.dryRun);
    process.exitCode = 1;
  });
}
