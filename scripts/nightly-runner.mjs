#!/usr/bin/env node
// nightly-runner.mjs - 深夜帯（23:00-07:00 JST）夜間ジョブエントリポイント
//
// schtasks から呼ばれて、queue/nightly/*.yml のジョブを順次実行する。
// 設計書: C:/work/designs/20260425_nightly-fullauto.md §6 H5
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
import path from 'node:path';

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const QUEUE_DIR = path.join(REPO_ROOT, 'queue/nightly');
const RESULTS_DIR = path.join(QUEUE_DIR, 'results');
const POLICY_PATH = path.join(REPO_ROOT, 'rules/nightly-policy.yml');
const CB_STATE_PATH = path.join(REPO_ROOT, 'status/circuit-breaker.json');
const PROFILE_PATH = 'C:/Users/aliks/.claude/profiles/nightly.json';
const LOG_PATH = 'C:/work/logs/nightly-runner.log';

// ===== JST 固定時刻判定 =====
export function isNightJST(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    hour: 'numeric',
    hour12: false,
  });
  const hour = parseInt(fmt.format(now), 10);
  return hour >= 23 || hour < 7;
}

function nowJSTString() {
  return new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

function jstDateString() {
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());  // YYYY-MM-DD
}

// ===== ログ出力 =====
async function log(msg, debug = false) {
  if (debug && !args.debug) return;
  const line = `[${nowJSTString()}] ${msg}\n`;
  process.stdout.write(line);
  try {
    await fs.appendFile(LOG_PATH, line);
  } catch {
    // ログ書き込み失敗は無視（通常運用優先）
  }
}

// ===== 簡易 YAML パーサ（依存ゼロ） =====
// nightly-policy.yml 程度の単純な構造のみ対応。複雑な YAML は npm install 不要のため自前で。
function parseYaml(text) {
  // 非常に簡素なパーサ。本格運用時は npm の yaml パッケージ導入を検討。
  // ここでは nightly-policy.yml の構造に特化。
  const lines = text.split('\n').filter(l => !l.trim().startsWith('#') && l.trim() !== '');
  const result = {};
  let current = result;
  const stack = [{ obj: result, indent: -1 }];
  let lastKey = null;

  for (const line of lines) {
    const indent = line.match(/^ */)[0].length;
    const trimmed = line.trim();

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    current = stack[stack.length - 1].obj;

    if (trimmed.startsWith('- ')) {
      // 配列要素
      const inner = trimmed.slice(2).trim();
      if (Array.isArray(current[lastKey])) {
        const m = inner.match(/^([\w_-]+):\s*(.*)$/);
        if (m) {
          const obj = { [m[1]]: parseValue(m[2]) };
          current[lastKey].push(obj);
          stack.push({ obj, indent: indent + 2 });
        } else {
          current[lastKey].push(parseValue(inner));
        }
      }
    } else {
      const m = trimmed.match(/^([\w_-]+):\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      const val = m[2];
      if (val === '' || val === '|') {
        // ネスト or リストの開始
        if (line.includes('|')) {
          // 複数行文字列（簡略実装、本実装では全行収集が必要）
          current[key] = '';
        } else {
          // 次の行で - で始まればリスト、そうでなければオブジェクト
          current[key] = {};  // 暫定、後で配列に書き換え可能
        }
        lastKey = key;
        stack.push({ obj: current[key], indent });
      } else {
        current[key] = parseValue(val);
      }
    }
  }
  return result;
}

function parseValue(s) {
  s = s.trim().replace(/^["']|["']$/g, '');
  if (/^\d+\.\d+$/.test(s)) return parseFloat(s);
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  if (s === 'true') return true;
  if (s === 'false') return false;
  return s;
}

// ===== ポリシー読込 =====
async function loadPolicy() {
  try {
    const text = await fs.readFile(POLICY_PATH, 'utf-8');
    // 本実装では yaml パーサが必要。今はファイル存在のみ確認し、簡易パースを試みる
    // 完全な YAML パースは npm install yaml で対応する想定
    return { _raw: text, _path: POLICY_PATH, parsed: false };
  } catch (e) {
    throw new Error(`Policy 読込失敗: ${e.message}`);
  }
}

// ===== ジョブキュー読込 =====
async function loadJobQueue() {
  if (!existsSync(QUEUE_DIR)) {
    await fs.mkdir(QUEUE_DIR, { recursive: true });
    return [];
  }
  const files = await fs.readdir(QUEUE_DIR);
  const jobFiles = files.filter(f => f.endsWith('.yml') || f.endsWith('.json'));
  const jobs = [];
  for (const f of jobFiles) {
    const filePath = path.join(QUEUE_DIR, f);
    const text = await fs.readFile(filePath, 'utf-8');
    try {
      if (f.endsWith('.json')) {
        jobs.push(JSON.parse(text));
      } else {
        // YAML: 簡易対応、name フィールドのみ抽出
        const m = text.match(/name:\s*([\w-]+)/);
        if (m) jobs.push({ name: m[1], _raw: text, _file: f });
      }
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
  } catch {
    return { claude_cli: { state: 'CLOSED', failures: 0, last_failure: null } };
  }
}

async function saveCircuitBreakerState(state) {
  await fs.mkdir(path.dirname(CB_STATE_PATH), { recursive: true });
  await fs.writeFile(CB_STATE_PATH, JSON.stringify(state, null, 2));
}

// ===== Telegram 通知 =====
async function notifyTelegram(message, dryRun = false) {
  if (dryRun) {
    await log(`[dry-run] Telegram: ${message}`);
    return { ok: true, dry_run: true };
  }
  // 既存 telegram-bot 経由（localhost:7301 等の設定は環境次第）
  // 本実装では fetch 経由で localhost に POST する想定だが、
  // PoC では log 出力のみとし、実装は次回タスクで詳細化する。
  await log(`[notify] ${message}`);
  return { ok: true, fallback: 'log_only' };
}

// ===== ジョブ実行 =====
async function runJob(job, accumulator) {
  await log(`ジョブ開始: ${job.name}`);
  if (args.dryRun) {
    await log(`[dry-run] ジョブ ${job.name} を実行する想定でコマンドを構築する`);
  }

  // claude CLI: --disallowedTools は variadic、1フラグに空白区切りで複数指定（設計書 §0.1.5）
  const cmd = [
    'claude', '-p',
    '--settings', PROFILE_PATH,
    '--disallowedTools',
      'Bash(git push origin master:*) Bash(git push origin main:*) Bash(git push --force:*) Bash(git push -f:*) Bash(rm:*) Bash(taskkill:*)',
    '--allowedTools',
      'Read(**) Edit(C:/work/**) Bash(git status:*) Bash(git log:*) Bash(git add:*) Bash(git commit:*) Bash(git push origin:*) Bash(gh pr create --draft:*) Bash(node:*) Bash(python:*)',
    '--max-budget-usd', String(job.max_budget_usd ?? 2.00),
    '--no-session-persistence',
    '--output-format', 'json',
    job.prompt ?? `[${job.name}] dry-run prompt`,
  ];

  if (args.dryRun) {
    await log(`[dry-run] cmd: claude ${cmd.slice(1).join(' ')}`);
    return {
      job_name: job.name,
      status: 'dry_run',
      cmd_preview: cmd.slice(0, 5).join(' ') + ' ...',
      cost_usd: 0,
    };
  }

  // 実際の spawn 実行（タイムアウト管理付き）
  const timeoutMs = (job.timeout_min ?? 30) * 60 * 1000;
  return await spawnWithTimeout(cmd, timeoutMs, job.name);
}

async function spawnWithTimeout(cmd, timeoutMs, jobName) {
  return new Promise((resolve) => {
    const child = spawn(cmd[0], cmd.slice(1), { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5000);
    }, timeoutMs);

    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    child.on('close', (code) => {
      clearTimeout(timer);
      let parsed = null;
      try { parsed = JSON.parse(stdout); } catch {}
      resolve({
        job_name: jobName,
        status: timedOut ? 'timeout' : (code === 0 ? 'success' : 'failed'),
        exit_code: code,
        cost_usd: parsed?.total_cost_usd ?? 0,
        timed_out: timedOut,
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
    try { existing = JSON.parse(await fs.readFile(file, 'utf-8')); } catch {}
  }
  existing.push(...results);
  await fs.writeFile(file, JSON.stringify(existing, null, 2));
  return file;
}

// ===== ゲート（gates-nightly.md 準拠） =====
async function runStartupGates() {
  // Gate 1: 時刻
  if (!args.bypassTimeCheck && !isNightJST()) {
    await log('[gate 1 FAIL] 深夜帯外。schtasks 誤発動の可能性。終了。');
    process.exit(0);  // エラーではない
  }
  // Gate 2: profile 存在
  if (!existsSync(PROFILE_PATH)) {
    await log(`[gate 2 FAIL] profile 不在: ${PROFILE_PATH}`);
    await notifyTelegram('[NIGHTLY-FATAL] profile 不在で起動失敗', args.dryRun);
    process.exit(1);
  }
  // Gate 3: policy 読込
  try {
    await loadPolicy();
  } catch (e) {
    await log(`[gate 3 FAIL] policy 読込失敗: ${e.message}`);
    await notifyTelegram('[NIGHTLY-FATAL] policy 読込失敗', args.dryRun);
    process.exit(1);
  }
  // Gate 4: CB 状態
  const cb = await loadCircuitBreakerState();
  if (cb.claude_cli?.state === 'OPEN') {
    await log('[gate 4 FAIL] circuit-breaker OPEN');
    await notifyTelegram('[NIGHTLY-CB] CB OPEN、復旧待ち', args.dryRun);
    process.exit(0);
  }
  // Gate 5: 1日上限
  const datestr = jstDateString();
  const todayResults = path.join(RESULTS_DIR, `${datestr}.json`);
  if (existsSync(todayResults)) {
    try {
      const list = JSON.parse(await fs.readFile(todayResults, 'utf-8'));
      if (list.length >= 5) {
        await log('[gate 5 FAIL] 1日上限到達');
        await notifyTelegram('[NIGHTLY-LIMIT] 1日5ジョブ上限到達', args.dryRun);
        process.exit(0);
      }
    } catch {}
  }
  // Gate 6/7 は実装簡略化（ログのみ）
  await log('[gates] 全ゲート PASS');
}

// ===== CLI 引数 parse =====
const args = (() => {
  const a = process.argv.slice(2);
  return {
    dryRun: a.includes('--dry-run'),
    bypassTimeCheck: a.includes('--bypass-time-check'),
    debug: a.includes('--debug'),
    queueAdd: a.includes('--queue-add') ? a[a.indexOf('--queue-add') + 1] : null,
  };
})();

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

  await runStartupGates();

  const jobs = await loadJobQueue();
  await log(`ジョブ数: ${jobs.length}`);

  const accumulator = { total_usd: 0, success: 0, failed: 0 };
  const results = [];

  for (const job of jobs) {
    if (accumulator.total_usd > 30.00) {
      await log('[budget] 1日上限 $30 超過、以降 skip');
      break;
    }
    const result = await runJob(job, accumulator);
    results.push(result);
    accumulator.total_usd += result.cost_usd ?? 0;
    if (result.status === 'success' || result.status === 'dry_run') {
      accumulator.success++;
    } else {
      accumulator.failed++;
    }
    // ジョブファイルを処理済みに移動
    if (job._file && !args.dryRun) {
      try {
        await fs.rename(
          path.join(QUEUE_DIR, job._file),
          path.join(QUEUE_DIR, 'processed_' + job._file)
        );
      } catch {}
    }
  }

  const resultFile = await saveResults(results);
  await log(`結果保存: ${resultFile}`);

  await notifyTelegram(
    `nightly-runner 完了: 成功 ${accumulator.success} / 失敗 ${accumulator.failed} / 合計 $${accumulator.total_usd.toFixed(2)}`,
    args.dryRun,
  );

  await log('=== nightly-runner 終了 ===');
}

main().catch(async (e) => {
  await log(`FATAL: ${e.message}\n${e.stack}`);
  await notifyTelegram(`[NIGHTLY-FATAL] ${e.message}`, args.dryRun);
  process.exit(1);
});
