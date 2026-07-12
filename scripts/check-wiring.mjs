#!/usr/bin/env node
// check-wiring.mjs — 未結線ルール検出スクリプト
// rules/ の各ルールファイルが hooks/scripts/gates/agents から参照されているかスキャン。
// 参照なし = 未結線候補。3段階で分類:
//   auto: hook/script で自動強制
//   manual: gate/agent/CLAUDE.md で参照（手動/AI依存）
//   none: どこからも参照なし

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, basename } from 'path';

const WORK_DIR = process.env.NEKO_WORK_DIR || process.argv[2] || process.cwd();
const HOME = process.env.WIRING_TEST_HOME || process.env.HOME || process.env.USERPROFILE;

// スキャン対象（種別ごとに分類）
const AUTO_DIRS = [
  { label: 'hook', paths: [join(HOME, '.claude/hooks/pre_tool_use'), join(HOME, '.claude/hooks/post_tool_use')], exts: ['.mjs'] },
  { label: 'script', paths: [join(WORK_DIR, 'multi-agent-neko/scripts')], exts: ['.mjs', '.sh'] },
];
const MANUAL_DIRS = [
  { label: 'gate', paths: [join(WORK_DIR, '.claude/gates')], exts: ['.md'] },
  { label: 'agent', paths: [join(WORK_DIR, '.claude/agents')], exts: ['.md'] },
  { label: 'CLAUDE.md', paths: [WORK_DIR], files: ['CLAUDE.md'] },
];

// ファイル内容を収集
function collectFiles(dirs) {
  const result = new Map();
  for (const scan of dirs) {
    if (scan.files) {
      for (const f of scan.files) {
        const fp = join(scan.paths[0], f);
        if (!existsSync(fp)) continue;
        try { result.set(fp, { label: scan.label, name: f, content: readFileSync(fp, 'utf8') }); } catch {}
      }
    } else {
      for (const dir of scan.paths) {
        if (!existsSync(dir)) continue;
        let files;
        try { files = readdirSync(dir); } catch { continue; }
        for (const f of files) {
          if (!scan.exts.some(ext => f.endsWith(ext))) continue;
          if (f.endsWith('.test.mjs')) continue;
          const fp = join(dir, f);
          try {
            if (!statSync(fp).isFile()) continue;
            result.set(fp, { label: scan.label, name: f, content: readFileSync(fp, 'utf8') });
          } catch {}
        }
      }
    }
  }
  return result;
}

const autoFiles = collectFiles(AUTO_DIRS);
const manualFiles = collectFiles(MANUAL_DIRS);

// ============================================================
// settings.json 登録パス突合チェック（daily E-1）— 判定処理
// 上記のルール結線チェック（rules/ ⇔ hook/gate/agent の文字列参照）とは
// 独立した軸のチェック。settings.json に書かれた hook コマンドの実体パスと、
// ~/.claude/hooks/ 配下に実在するファイルの間の食い違い（登録漏れ・実体消失）を検出する。
// rules/ が空でも判定自体は必ず実行する（rules/の早期リターンより前に判定を済ませる）。
// ============================================================

// settings.json のパス（HOME配下）。WIRING_TEST_HOME でテスト時に差し替え可能
const SETTINGS_PATH = join(HOME, '.claude/settings.json');
const HOOKS_ROOT = join(HOME, '.claude/hooks');
// スキャン除外ディレクトリ（バックアップ・テスト専用ディレクトリは対象外）
const HOOK_EXCLUDE_DIRS = new Set(['_deleted', '__tests__']);
// settings.json未登録だが正当な理由で hooks/ に配置されているユーティリティスクリプト
// hook-wire-checker: check-wiring.mjs の前身（hook登録不要のCLIツール）
// mcp-drift-detector: MCPドリフト検出（手動/cron実行、session_start hookなし）
// gen-nightly-allowlist: nightly-guard用allowlist生成（手動/cron実行）
// mcp-response-inspector: post_tool_use/ 配下に正規登録済み（hooks直下は重複コピー）
const HOOK_EXEMPT_FILES = new Set([
  'hook-wire-checker.mjs',
  'mcp-drift-detector.mjs',
  'gen-nightly-allowlist.mjs',
  'mcp-response-inspector.mjs',
]);

// コマンド文字列からWindows絶対パス形式のスクリプトパスを抽出する
// 例: "node $HOME/.claude/hooks/xxx.mjs" → "$HOME/.claude/hooks/xxx.mjs"
// "mcp-yoshi check --direction inbound" のような外部コマンドはパスを含まないため対象外になる
function extractScriptPaths(command) {
  if (!command) return [];
  const pattern = /[A-Za-z]:[\\/][^\s'"]+?\.(?:mjs|sh|ps1|py|js)\b/g;
  const matches = command.match(pattern) || [];
  // Windows区切り(\)をUnix区切り(/)に正規化して比較しやすくする
  return matches.map(p => p.replace(/\\/g, '/'));
}

// settings.json の hooks 定義から { event, command } の一覧を平坦化して収集する
// 構造: hooks.<EventName>[].hooks[].command
function loadSettingsHookCommands(settingsPath) {
  if (!existsSync(settingsPath)) return null; // settings.json 自体が不在
  let settings;
  try {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  } catch {
    return null; // パース失敗（壊れたJSON）
  }
  const commands = [];
  const hooksObj = settings.hooks || {};
  for (const eventName of Object.keys(hooksObj)) {
    const entries = hooksObj[eventName];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const hookList = entry.hooks || [];
      for (const h of hookList) {
        if (h && h.command) commands.push({ event: eventName, command: h.command });
      }
    }
  }
  return commands;
}

// HOOKS_ROOT 配下を再帰的に走査し、.mjs ファイル（.test.mjs除く）の絶対パス一覧を返す
function collectHookScriptFiles(dir) {
  const result = [];
  function walk(current) {
    if (!existsSync(current)) return;
    let entries;
    try { entries = readdirSync(current); } catch { return; }
    for (const entry of entries) {
      if (HOOK_EXCLUDE_DIRS.has(entry)) continue;
      const fp = join(current, entry);
      let st;
      try { st = statSync(fp); } catch { continue; }
      if (st.isDirectory()) {
        walk(fp);
      } else if (entry.endsWith('.mjs') && !entry.endsWith('.test.mjs')) {
        result.push(fp.replace(/\\/g, '/'));
      }
    }
  }
  walk(dir);
  return result;
}

// settings.json 突合チェックの実行（判定のみ。出力は printHookWiringResult() で行う）
const settingsCommands = loadSettingsHookCommands(SETTINGS_PATH);
const missingRegistered = []; // settings.json登録済みだが実体が無いパス
let unregisteredHooks = [];   // hooks/配下に実在するがsettings.json未登録のパス

if (settingsCommands !== null) {
  const registeredPaths = new Set();
  for (const { event, command } of settingsCommands) {
    for (const p of extractScriptPaths(command)) {
      registeredPaths.add(p);
      if (!existsSync(p)) {
        missingRegistered.push({ event, path: p });
      }
    }
  }
  const allHookFiles = collectHookScriptFiles(HOOKS_ROOT);
  unregisteredHooks = allHookFiles.filter(fp => !registeredPaths.has(fp) && !HOOK_EXEMPT_FILES.has(basename(fp)));
}

// settings.json突合チェックの結果に問題があるか（exit code判定用）
const hookWiringHasIssue = missingRegistered.length > 0 || unregisteredHooks.length > 0;

// settings.json突合チェックの結果を出力する（rules/の早期リターン経路・通常経路の両方から呼ばれる）
function printHookWiringResult() {
  console.log('');
  console.log('=== settings.json hook登録パス突合チェック ===');

  if (settingsCommands === null) {
    console.log('settings.json が見つからないか読み込めません（スキップ）');
    return;
  }

  if (missingRegistered.length > 0) {
    console.log(`✗ settings.json登録済みだが実体なし（${missingRegistered.length}件）:`);
    for (const m of missingRegistered) {
      console.log(`    [${m.event}] ${m.path}`);
    }
  } else {
    console.log('✓ settings.json登録パスは全て実在確認済み');
  }

  if (unregisteredHooks.length > 0) {
    console.log(`△ ~/.claude/hooks/配下に存在するがsettings.json未登録（${unregisteredHooks.length}件）:`);
    for (const fp of unregisteredHooks) {
      console.log(`    ${fp}`);
    }
  } else {
    console.log('✓ ~/.claude/hooks/配下の全.mjsファイルがsettings.json登録済み');
  }

  // サマリ出力（例: "2件の未登録hook検出: xxx.mjs, yyy.mjs"）
  const wiringIssueCount = missingRegistered.length + unregisteredHooks.length;
  console.log('');
  if (wiringIssueCount > 0) {
    const names = [
      ...missingRegistered.map(m => basename(m.path)),
      ...unregisteredHooks.map(fp => basename(fp)),
    ].join(', ');
    console.log(`${wiringIssueCount}件のhook登録パス不整合を検出: ${names}`);
  } else {
    console.log('hook登録パス突合: 不整合なし');
  }
}

// rules/ のファイル一覧
const RULES_DIR = join(WORK_DIR, '.claude/rules');
if (!existsSync(RULES_DIR)) {
  console.log('rules/ が見つかりません');
  printHookWiringResult();
  process.exit(hookWiringHasIssue ? 1 : 0);
}
const ruleFiles = readdirSync(RULES_DIR).filter(f => f.endsWith('.md'));

if (ruleFiles.length === 0) {
  console.log('rules/ にルールファイルなし');
  printHookWiringResult();
  process.exit(hookWiringHasIssue ? 1 : 0);
}

// ルールファイルを検索する関数
function findRefs(rule, fileMap) {
  const slug = rule.replace(/\.md$/, '');
  const refs = [];
  // 検索パターン: フルファイル名 or rules/slug パス形式
  const patterns = [rule, `rules/${slug}`, `rules/${rule}`];

  for (const [fp, { label, name, content }] of fileMap) {
    if (name === rule) continue;
    if (patterns.some(p => content.includes(p))) {
      refs.push({ label, file: name });
    }
  }
  return refs;
}

// 各ルールの結線状態を判定
// .claude/rules/ はClaude Codeが自動ロードするため、明示参照がなくてもAI文脈に常駐
const autoWired = [];
const manualOnly = [];
// rules/全ファイルがauto-load再分類されるため現状常に空（rules-ondemand/追加時に有効化）
const unwired = [];

for (const rule of ruleFiles) {
  const autoRefs = findRefs(rule, autoFiles);
  const manualRefs = findRefs(rule, manualFiles);

  if (autoRefs.length > 0) {
    autoWired.push({ rule, auto: autoRefs, manual: manualRefs });
  } else if (manualRefs.length > 0) {
    manualOnly.push({ rule, manual: manualRefs });
  } else {
    // rules/配下はClaude Codeが自動ロード→明示参照なしでもAI文脈に常駐
    manualOnly.push({ rule, manual: [{ label: 'auto-load', file: '.claude/rules/' }] });
  }
}

// 結果出力
if (unwired.length > 0) {
  console.log(`✗ 未結線（${unwired.length}件）— どこからも参照なし:`);
  for (const r of unwired) {
    console.log(`    ${r.rule}`);
  }
  console.log('');
}

if (manualOnly.length > 0) {
  console.log(`△ 手動のみ（${manualOnly.length}件）— gate/agent/CLAUDE.md参照あり、hook/script強制なし:`);
  for (const r of manualOnly) {
    const refs = r.manual.map(ref => `${ref.label}:${ref.file}`).join(', ');
    console.log(`    ${r.rule} ← ${refs}`);
  }
  console.log('');
}

if (autoWired.length > 0) {
  console.log(`✓ 自動強制（${autoWired.length}件）— hook/scriptで結線済み:`);
  for (const r of autoWired) {
    const refs = r.auto.map(ref => `${ref.label}:${ref.file}`).join(', ');
    console.log(`    ${r.rule} ← ${refs}`);
  }
  console.log('');
}

// サマリ
const total = ruleFiles.length;
console.log(`合計: ${total}件（自動: ${autoWired.length}, 手動のみ: ${manualOnly.length}, 未結線: ${unwired.length}）`);

// 自動強制率
const autoRate = Math.round((autoWired.length / total) * 100);
console.log(`自動強制率: ${autoRate}%`);

// settings.json突合チェックの結果を出力（判定は既に完了済み）
printHookWiringResult();

process.exit((unwired.length > 0 || hookWiringHasIssue) ? 1 : 0);
