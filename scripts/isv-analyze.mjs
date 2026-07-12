#!/usr/bin/env node
// isv-analyze.mjs — ISV Phase 4: パターン分析スクリプト
// ISVログ（isv-log.md）を解析し、成功/失敗パターンを抽出する。
// 依存ゼロ（Node.js標準ライブラリのみ）。
// Usage: node isv-analyze.mjs [--path <isv-log.md>] [--json]

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// デフォルトパス（MEMORY.md symlink経由）
const DEFAULT_PATH = resolve(
  process.env.USERPROFILE || process.env.HOME || '.',
  '.claude/projects/C--work/memory/isv-log.md'
);

// 文字列→数値マッピング（Pre-Mortem #5 対策）
const STRING_TO_NUM = {
  high: 0.8,
  medium: 0.5,
  low: 0.3,
  very_high: 0.9,
  very_low: 0.1,
};

// 値をパース（数値 or 文字列→数値変換）
function parseValue(raw, isIntent = false) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim().toLowerCase();
  const n = Number(s);
  if (!isNaN(n)) {
    // 1-5スケール値を0-1に正規化（intent次元で値>1の場合）
    if (isIntent && n > 1) return n / 5;
    return n;
  }
  // 文字列マッピング
  if (STRING_TO_NUM[s] !== undefined) return STRING_TO_NUM[s];
  // APPROVE等の結果値
  if (s === 'approve' || s === 'pass') return 1.0;
  if (s === 'fail' || s === 'reject') return 0.0;
  // マッピング不能→中間値（Pre-Mortem #5）
  return 0.5;
}

// ISVログをパースしてエントリ配列に変換
function parseISVLog(content) {
  const entries = [];
  // ### で始まるエントリヘッダを検出
  const blocks = content.split(/^### /m).slice(1);

  for (const block of blocks) {
    const lines = block.split('\n');
    const header = lines[0].trim();

    // ヘッダから日付・PJ名・タスク概要を抽出（2フォーマット対応）
    // 初期型: YYYY-MM-DD [PJ名] タスク名
    // 番号付き型: #N: YYYY-MM-DD タスク名 — PJ名
    let date, project, task;
    const fmt1 = header.match(/(?:#\d+:\s*)?(\d{4}-\d{2}-\d{2})\s+\[([^\]]+)\]\s*(.*)/);
    const fmt2 = header.match(/(?:#\d+:\s*)?(\d{4}-\d{2}-\d{2})\s+(.+?)\s+—\s+(.+)/);
    if (fmt1) {
      [, date, project, task] = fmt1;
    } else if (fmt2) {
      date = fmt2[1]; task = fmt2[2]; project = fmt2[3];
    } else {
      continue;
    }

    // 規模の抽出（括弧以降を除去して基本規模のみ取得）
    const scaleMatch = block.match(/規模:\s*(偵察|小隊|中隊|大隊|連隊)/);
    const scale = scaleMatch ? scaleMatch[1] : 'unknown';

    // 意図ベクトルの抽出
    const intentMatch = block.match(/意図:\s*(.*)/);
    const intent = {};
    if (intentMatch) {
      const pairs = intentMatch[1].matchAll(/(\w+)=([^\s]+)/g);
      for (const [, key, val] of pairs) {
        intent[key] = parseValue(val, true);
      }
    }

    // 結果ベクトルの抽出
    const resultMatch = block.match(/結果:\s*(.*)/);
    const result = {};
    if (resultMatch) {
      const pairs = resultMatch[1].matchAll(/(\w+)=([^\s]+)/g);
      for (const [, key, val] of pairs) {
        result[key] = parseValue(val);
      }
    }

    // 学びの抽出
    const learnMatch = block.match(/学び:\s*(.*(?:\n(?!- ).*)*)/);
    const learning = learnMatch ? learnMatch[1].trim() : '';

    entries.push({
      date,
      project,
      task: task.trim(),
      scale,
      intent,
      result,
      learning,
    });
  }

  return entries;
}

// 統計計算
function computeStats(values) {
  if (values.length === 0) return { mean: 0, std: 0, min: 0, max: 0, count: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return {
    mean: Math.round(mean * 1000) / 1000,
    std: Math.round(Math.sqrt(variance) * 1000) / 1000,
    min: Math.round(Math.min(...values) * 1000) / 1000,
    max: Math.round(Math.max(...values) * 1000) / 1000,
    count: values.length,
  };
}

// メイン分析
function analyze(entries) {
  // 意図ベクトルの5次元統計
  const intentDims = ['urgency', 'risk', 'complexity', 'novelty', 'purpose_alignment'];
  const intentStats = {};
  for (const dim of intentDims) {
    const vals = entries.map(e => e.intent[dim]).filter(v => v !== null && v !== undefined);
    intentStats[dim] = computeStats(vals);
  }

  // 結果ベクトルの統計
  const resultDims = ['confidence', 'outcome', 'review_cycles', 'intervention_count'];
  const resultStats = {};
  for (const dim of resultDims) {
    const vals = entries.map(e => e.result[dim]).filter(v => v !== null && v !== undefined);
    resultStats[dim] = computeStats(vals);
  }

  // 成功パターン（outcome >= 0.9）
  const successEntries = entries.filter(e => (e.result.outcome || 0) >= 0.9);
  const successIntentStats = {};
  for (const dim of intentDims) {
    const vals = successEntries.map(e => e.intent[dim]).filter(v => v !== null && v !== undefined);
    successIntentStats[dim] = computeStats(vals);
  }

  // リスクパターン（outcome < 0.9 or intervention_count >= 2）
  const riskEntries = entries.filter(
    e => (e.result.outcome || 0) < 0.9 || (e.result.intervention_count || 0) >= 2
  );
  const riskIntentStats = {};
  for (const dim of intentDims) {
    const vals = riskEntries.map(e => e.intent[dim]).filter(v => v !== null && v !== undefined);
    riskIntentStats[dim] = computeStats(vals);
  }

  // 規模別集計
  const scaleGroups = {};
  for (const e of entries) {
    const s = e.scale.replace(/（.*）/, '');
    if (!scaleGroups[s]) scaleGroups[s] = [];
    scaleGroups[s].push(e);
  }
  const scaleStats = {};
  for (const [scale, group] of Object.entries(scaleGroups)) {
    scaleStats[scale] = {
      count: group.length,
      avg_outcome: computeStats(group.map(e => e.result.outcome).filter(v => v != null)).mean,
      avg_intervention: computeStats(group.map(e => e.result.intervention_count).filter(v => v != null)).mean,
      avg_review_cycles: computeStats(group.map(e => e.result.review_cycles).filter(v => v != null)).mean,
    };
  }

  // 重み推定（成功パターンとリスクパターンの差分で重要度を推定）
  const weights = {};
  for (const dim of intentDims) {
    const sMean = successIntentStats[dim]?.mean || 0.5;
    const rMean = riskIntentStats[dim]?.mean || 0.5;
    // 差分の絶対値が大きいほど、その次元は成功/失敗の区別に寄与する
    weights[dim] = Math.round(Math.abs(sMean - rMean) * 100) / 100;
  }
  // purpose_alignment に基礎重みを加算（設計方針: 最重要次元）
  weights.purpose_alignment = Math.round((weights.purpose_alignment + 0.3) * 100) / 100;

  return {
    total_entries: entries.length,
    date_range: {
      first: entries[0]?.date || 'N/A',
      last: entries[entries.length - 1]?.date || 'N/A',
    },
    intent_stats: intentStats,
    result_stats: resultStats,
    success_patterns: {
      count: successEntries.length,
      intent_profile: successIntentStats,
    },
    risk_patterns: {
      count: riskEntries.length,
      intent_profile: riskIntentStats,
    },
    scale_stats: scaleStats,
    estimated_weights: weights,
  };
}

// CLI
function main() {
  const args = process.argv.slice(2);
  let filePath = DEFAULT_PATH;
  let jsonMode = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path' && args[i + 1]) filePath = args[++i];
    if (args[i] === '--json') jsonMode = true;
  }

  const content = readFileSync(filePath, 'utf8');
  const entries = parseISVLog(content);
  const result = analyze(entries);

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    // 人間可読フォーマット
    console.log(`=== ISV Phase 4 Analysis ===`);
    console.log(`Total entries: ${result.total_entries}`);
    console.log(`Date range: ${result.date_range.first} ~ ${result.date_range.last}`);
    console.log();

    console.log(`--- Intent Stats ---`);
    for (const [dim, s] of Object.entries(result.intent_stats)) {
      console.log(`  ${dim}: mean=${s.mean} std=${s.std} [${s.min}..${s.max}] n=${s.count}`);
    }
    console.log();

    console.log(`--- Result Stats ---`);
    for (const [dim, s] of Object.entries(result.result_stats)) {
      console.log(`  ${dim}: mean=${s.mean} std=${s.std} [${s.min}..${s.max}] n=${s.count}`);
    }
    console.log();

    console.log(`--- Success Patterns (outcome >= 0.9): ${result.success_patterns.count} entries ---`);
    for (const [dim, s] of Object.entries(result.success_patterns.intent_profile)) {
      console.log(`  ${dim}: mean=${s.mean}`);
    }
    console.log();

    console.log(`--- Risk Patterns (outcome < 0.9 or intervention >= 2): ${result.risk_patterns.count} entries ---`);
    for (const [dim, s] of Object.entries(result.risk_patterns.intent_profile)) {
      console.log(`  ${dim}: mean=${s.mean}`);
    }
    console.log();

    console.log(`--- Scale Stats ---`);
    for (const [scale, s] of Object.entries(result.scale_stats)) {
      console.log(`  ${scale}: n=${s.count} outcome=${s.avg_outcome} intervention=${s.avg_intervention} cycles=${s.avg_review_cycles}`);
    }
    console.log();

    console.log(`--- Estimated Weights (for IDD) ---`);
    for (const [dim, w] of Object.entries(result.estimated_weights)) {
      console.log(`  ${dim}: ${w}`);
    }
  }
}

main();
