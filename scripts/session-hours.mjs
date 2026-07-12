#!/usr/bin/env node
// セッション累積稼働時間の計算
// daily note からセッション時間を解析し累積を出力する
// handover / dreaming から呼び出して使う
//
// 使い方: node scripts/session-hours.mjs [YYYY-MM-DD] [daily-dir]
// 出力例:
//   累積: 8h 39m (5セッション)
//   [INFO] 8時間超過

import fs from 'node:fs';

// 引数パース: --write はフラグ、位置引数は日付とディレクトリ
const positional = process.argv.slice(2).filter(a => !a.startsWith('--'));
const targetDate = positional[0] || new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' });
const dailyDir = positional[1] || ((process.env.NEKO_WORK_DIR || process.cwd()).replace(/\\/g, '/') + '/daily');
const dailyFile = `${dailyDir}/${targetDate}.md`;

if (!fs.existsSync(dailyFile)) {
  console.log('累積: 0h 0m (daily note未生成)');
  process.exit(0);
}

const content = fs.readFileSync(dailyFile, 'utf8');

// リスト行（- で始まる）から「HH:MM〜HH:MM」パターンを抽出
// daily note形式: 見出しに「セッション」、データ行に時間。両方対応
// 時刻区切り文字: 〜 ~ ～ - － → ⇒ （daily noteで使われる全パターン）
const timePattern = /(\d{1,2}):(\d{2})\s*[〜~～\-－→⇒]\s*(\d{1,2}):(\d{2})/g;
const sessionLines = content.split('\n').filter(line =>
  /^\s*-/.test(line) && /\d{1,2}:\d{2}\s*[〜~～\-－→⇒]\s*\d{1,2}:\d{2}/.test(line)
);

let totalMinutes = 0;
let sessionCount = 0;
const seen = new Set();

for (const line of sessionLines) {
  // 見出し行（### ）はスキップ、メトリクス行（- セッション）のみ対象
  if (line.startsWith('###') || line.startsWith('##')) continue;

  let match;
  timePattern.lastIndex = 0;
  while ((match = timePattern.exec(line)) !== null) {
    const startH = parseInt(match[1], 10);
    const startM = parseInt(match[2], 10);
    const endH = parseInt(match[3], 10);
    const endM = parseInt(match[4], 10);

    const key = `${startH}:${startM}-${endH}:${endM}`;
    if (seen.has(key)) continue;
    seen.add(key);

    let startTotal = startH * 60 + startM;
    let endTotal = endH * 60 + endM;
    // 日跨ぎ対応
    if (endTotal < startTotal) endTotal += 1440;

    const diff = endTotal - startTotal;
    // 妥当性チェック（0分超 12時間未満）
    if (diff > 0 && diff < 720) {
      totalMinutes += diff;
      sessionCount++;
    }
  }
}

const hours = Math.floor(totalMinutes / 60);
const mins = totalMinutes % 60;

const summary = `累積: ${hours}h ${mins}m (${sessionCount}セッション)`;
console.log(summary);

if (totalMinutes >= 720) {
  console.log(`[HEADS-UP] ${hours}時間超過`);
} else if (totalMinutes >= 480) {
  console.log(`[INFO] ${hours}時間超過`);
}

// --write フラグ: daily note の累積時間を書き込む（毎回最新値に更新）
if (process.argv.includes('--write') && sessionCount > 0) {
  const marker = '## 累積稼働';
  const threshold = totalMinutes >= 720 ? ' [HEADS-UP]' : totalMinutes >= 480 ? ' [INFO]' : '';
  const newSection = `${marker}\n- ${summary}${threshold}`;
  const updated = content.includes(marker)
    ? content.replace(/## 累積稼働\n- 累積:.*/, newSection)
    : content + '\n' + newSection + '\n';
  fs.writeFileSync(dailyFile, updated);
}
