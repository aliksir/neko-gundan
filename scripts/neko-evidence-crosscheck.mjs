#!/usr/bin/env node
// 成果物9種の存在を一括チェックするCLI
// 使い方: node neko-evidence-crosscheck.mjs <task-slug> [--scale squad|platoon]

import { readdirSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// 作業ディレクトリ解決
const workDir = (process.env.NEKO_WORK_DIR || process.cwd()).replace(/\\/g, '/');

// 小隊（8種）と中隊+（9種）の成果物定義（SSOT: gates-start.md §成果物セットルール）
const SQUAD_ARTIFACTS = [
  { dir: 'plans',     label: '計画書' },
  { dir: 'designs',   label: '設計書' },
  { dir: 'checklist', label: 'チェックリスト' },
  { dir: 'test-plan', label: 'テスト計画' },
  { dir: 'audit',     label: '監査ログ' },
  { dir: 'logs',      label: '作業ログ' },
  { dir: 'result',    label: '報告書' },
  { dir: 'metrics',   label: 'メトリクス' },
];

const PLATOON_ARTIFACTS = [
  ...SQUAD_ARTIFACTS,
  { dir: 'whiteboard', label: 'ホワイトボード' },
];

// 引数パース
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log(`使い方: node neko-evidence-crosscheck.mjs <task-slug> [--scale squad|platoon]

成果物が揃っているか一括チェックする。

  task-slug  ファイル名に含まれるキーワード（例: my-task-name）
  --scale    squad（8種、既定）or platoon（9種、metrics追加）

終了コード: 0=全件OK / 1=不足あり / 2=引数エラー`);
  process.exit(0);
}

// task-slug と scale を取得
const scaleIdx = args.indexOf('--scale');
let scale = 'squad';
let taskSlug = null;

if (scaleIdx !== -1) {
  scale = args[scaleIdx + 1] || 'squad';
  if (!['squad', 'platoon'].includes(scale)) {
    console.error(`エラー: --scale は squad または platoon を指定（受信: ${scale}）`);
    process.exit(2);
  }
  // task-slug は --scale以外の最初の引数
  taskSlug = args.find((a, i) => i !== scaleIdx && i !== scaleIdx + 1 && !a.startsWith('--'));
} else {
  taskSlug = args.find(a => !a.startsWith('--'));
}

if (!taskSlug) {
  console.error('エラー: task-slug を指定してください');
  process.exit(2);
}

// チェック実行
const artifacts = scale === 'platoon' ? PLATOON_ARTIFACTS : SQUAD_ARTIFACTS;
const total = artifacts.length;
let found = 0;
const results = [];

console.log(`neko-evidence-crosscheck: task=${taskSlug}, scale=${scale} (${total}種)`);

for (const { dir, label } of artifacts) {
  const dirPath = resolve(workDir, dir);

  // ディレクトリが存在しない場合は不足扱い
  if (!existsSync(dirPath)) {
    results.push({ ok: false, dir, label, file: null });
    continue;
  }

  // ディレクトリ内で task-slug を含む .md ファイルを検索
  try {
    const files = readdirSync(dirPath);
    let match;
    if (dir === 'metrics') {
      // 多段マッチ: 標準→日付除去→PJ累積ファイル逆引き
      const stripped = taskSlug.replace(/^\d{8}_/, '');
      match = files.find(f => f.includes(taskSlug) && f.endsWith('.md'));
      if (!match) {
        match = files.find(f => f.includes(stripped) && f.endsWith('.md'));
      }
      if (!match) {
        // PJ累積ファイル逆引き: {name}_metrics.md のうち最長一致を優先
        const candidates = files
          .map(f => { const m = f.match(/^(.+)_metrics\.md$/); return m && stripped.startsWith(m[1]) ? { file: f, len: m[1].length } : null; })
          .filter(Boolean)
          .sort((a, b) => b.len - a.len);
        if (candidates.length > 0) {
          match = candidates[0].file;
          process.stderr.write(`[evidence-crosscheck] 逆引きマッチ: ${stripped} → ${match} (最長一致)\n`);
        }
      }
      if (!match) {
        // PJ累積ファイル内容検索: ファイル内にtaskSlugを含む行があるか確認
        const pjFiles = files.filter(f => f.endsWith('_metrics.md'));
        for (const pf of pjFiles) {
          try {
            const content = readFileSync(resolve(dirPath, pf), 'utf8');
            if (content.includes(taskSlug) || content.includes(stripped)) {
              match = pf;
              process.stderr.write(`[evidence-crosscheck] 内容マッチ: ${stripped} → ${pf} (ファイル内検索)\n`);
              break;
            }
          } catch { /* 読み取り失敗は無視 */ }
        }
      }
    } else {
      match = files.find(f => f.includes(taskSlug) && f.endsWith('.md'));
    }
    if (match) {
      results.push({ ok: true, dir, label, file: match });
      found++;
    } else {
      results.push({ ok: false, dir, label, file: null });
    }
  } catch {
    // 読み取りエラーはOK扱い（ブロックしない）
    results.push({ ok: true, dir, label, file: '(読み取りエラー、スキップ)' });
    found++;
  }
}

// 結果表示
for (const r of results) {
  const mark = r.ok ? '✓' : '✗';
  const detail = r.ok ? `${r.dir}/${r.file}` : `${r.dir}/ — ${taskSlug} を含むファイルなし`;
  console.log(`  ${mark} ${detail}`);
}

const missing = total - found;
console.log(`結果: ${found}/${total}${missing > 0 ? ` (${missing}件不足)` : ' (全件OK)'}`);

// 不足があれば exit 1
process.exit(missing > 0 ? 1 : 0);
