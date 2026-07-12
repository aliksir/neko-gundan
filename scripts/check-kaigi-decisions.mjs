#!/usr/bin/env node
// check-kaigi-decisions.mjs — 猫会議の指摘とkaigi-decisions.mdの確定済み判断の重複照合スクリプト
// 依存ゼロ・Node.js ESM。形態素解析器を使わず、ASCII単語+CJKバイグラムのJaccard類似度で近似する。
// 使い方: node check-kaigi-decisions.mjs <kaigi-file.md>

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tokenize, jaccard } from './text-similarity.mjs';

// memory/ はシンボリックリンク経由でアクセス（ローカルパスハードコード回避）
const WORK_DIR = process.env.NEKO_WORK_DIR || process.cwd();
const KAIGI_DECISIONS_PATH = join(WORK_DIR, 'memory/kaigi/kaigi-decisions.md');
const SIMILARITY_THRESHOLD = 0.15;
// --verbose: 全ペアの類似度を表示（閾値チューニング用）
const VERBOSE = process.argv.includes('--verbose');

// ============================================================
// kaigi-decisions.md パーサ
// "## D-NNN: タイトル（日付 確定）" 見出し単位でエントリを抽出する
// ============================================================
function parseDecisions(content) {
  const lines = content.split(/\r?\n/);
  const decisions = [];
  let current = null;

  for (const line of lines) {
    const idMatch = line.match(/^##\s+(D-\d+):\s*(.+)$/);
    if (idMatch) {
      // 新しいD-NNN見出しが来たら前のエントリを確定させる
      if (current) decisions.push(current);
      const title = idMatch[2].replace(/[（(][^）)]*[）)]\s*$/, '').trim();
      current = { id: idMatch[1], title, bodyLines: [] };
      continue;
    }
    // D-NNN以外のH2見出し（"## 運用ルール"等）が来たら現在のエントリを終了する
    if (/^##\s+/.test(line)) {
      if (current) { decisions.push(current); current = null; }
      continue;
    }
    if (current) current.bodyLines.push(line);
  }
  if (current) decisions.push(current);

  // 類似度計算用にタイトル+本文を1本のテキストにまとめる
  return decisions.map(d => ({
    id: d.id,
    title: d.title,
    text: `${d.title} ${d.bodyLines.join(' ')}`.trim(),
  }));
}

// ============================================================
// 猫会議ファイルパーサ
// S-N（総司令コメント求む）/ H-N（指摘一覧HIGH）/ E-N（おまかせ委任）を抽出する。
// 「前回コメント追跡」等の過去参照テーブルはスキャン対象外
// （IDが会議間で使い回されるため誤マッチを避ける。D-010参照）。
// ============================================================
function parseFindings(content) {
  const lines = content.split(/\r?\n/);
  const findings = [];
  let mode = null; // null | 'high' | 'strategic' | 'efficiency'
  let inFindingSection = false; // "## 指摘一覧" 配下かどうか

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      const heading = h2Match[1];
      inFindingSection = /指摘一覧/.test(heading);
      if (/総司令コメント求む/.test(heading)) mode = 'strategic';
      else if (/おまかせ委任/.test(heading)) mode = 'efficiency';
      else mode = null;
      continue;
    }
    // "## 指摘一覧" 配下のみ "### HIGH" サブセクションを対象にする（MEDIUM/LOWは対象外）
    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      if (inFindingSection && /^HIGH/.test(h3Match[1].trim())) mode = 'high';
      else if (inFindingSection) mode = null;
      continue;
    }
    if (!mode) continue;
    if (!line.trim().startsWith('|')) continue;

    // 表の行をセル単位に分解する（先頭・末尾の空セルはパイプ由来なので除去）
    const cells = line.split('|').map((c) => c.trim());
    if (cells[0] === '') cells.shift();
    if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
    if (cells.length < 2) continue;

    // 1セル目が "S-1"/"H-1"/"E-1" 形式でなければヘッダ行・区切り行として無視する
    const idMatch = cells[0].match(/^([SHE]-\d+)/);
    if (!idMatch) continue;

    findings.push({ id: idMatch[1], text: cells[1] });
  }
  return findings;
}

// 表示用に長いテキストを短縮する
function truncate(text, maxLen = 24) {
  if (!text) return '';
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

// ============================================================
// メイン処理
// ============================================================
function main() {
  const kaigiFilePath = process.argv[2];
  if (!kaigiFilePath) {
    console.error('使い方: node check-kaigi-decisions.mjs <kaigi-file.md>');
    process.exit(1);
  }

  // kaigi-decisions.md は固定パス。読み込み失敗時は即エラー終了する
  let decisionsRaw;
  try {
    decisionsRaw = readFileSync(KAIGI_DECISIONS_PATH, 'utf-8');
  } catch (err) {
    console.error(`kaigi-decisions.md の読み込みに失敗しました: ${KAIGI_DECISIONS_PATH}`);
    console.error(err.message);
    process.exit(1);
  }

  // 引数の猫会議ファイルは相対/絶対どちらでも受け付ける
  const resolvedPath = resolve(kaigiFilePath);
  let kaigiRaw;
  try {
    kaigiRaw = readFileSync(resolvedPath, 'utf-8');
  } catch (err) {
    console.error(`猫会議ファイルの読み込みに失敗しました: ${resolvedPath}`);
    console.error(err.message);
    process.exit(1);
  }

  const decisions = parseDecisions(decisionsRaw);
  const findings = parseFindings(kaigiRaw);
  // D-NNN側は事前にトークナイズしておき、各指摘との照合で使い回す
  const decisionTokens = decisions.map((d) => ({ ...d, tokens: tokenize(d.text) }));

  console.log(`check-kaigi-decisions: ${findings.length}指摘 vs ${decisions.length}確定判断`);

  if (findings.length === 0) {
    console.log('指摘（S-N/H-N/E-N）が見つかりませんでした。');
    return;
  }

  const cleanIds = [];

  for (const finding of findings) {
    const fTokens = tokenize(finding.text);
    let best = null;

    // 閾値以上の中で最も類似度が高いD-NNNだけを警告対象にする
    for (const d of decisionTokens) {
      const sim = jaccard(fTokens, d.tokens);
      if (sim >= SIMILARITY_THRESHOLD && (!best || sim > best.sim)) {
        best = { id: d.id, title: d.title, sim };
      }
    }

    // verbose: 全ペアの類似度を表示（閾値チューニング用）
    if (VERBOSE) {
      const allSims = decisionTokens.map(d => ({ id: d.id, sim: jaccard(fTokens, d.tokens) }));
      allSims.sort((a, b) => b.sim - a.sim);
      const top = allSims.slice(0, 3).map(s => `${s.id}:${s.sim.toFixed(3)}`).join(' / ');
      console.log(`  ${finding.id} → top3: ${top}`);
    }

    if (best) {
      console.log(
        `⚠️  ${finding.id} "${truncate(finding.text)}" ↔ ${best.id} "${truncate(best.title)}" (similarity: ${best.sim.toFixed(2)})`
      );
    } else {
      cleanIds.push(finding.id);
    }
  }

  if (cleanIds.length > 0) {
    console.log(`✓ ${cleanIds.join(', ')}: 重複なし`);
  }
}

main();
