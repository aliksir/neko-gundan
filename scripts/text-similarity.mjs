#!/usr/bin/env node
// text-similarity.mjs — テキスト類似度計算の共通モジュール（tokenize + jaccard）
// 依存ゼロ・Node.js ESM。形態素解析器を使わず、ASCII単語+CJKバイグラムのJaccard類似度で近似する。

// ============================================================
// トークナイズ: ASCII単語（識別子・略語・数値向け）+ CJK文字バイグラム
// 形態素解析器なしでの近似手法。Elasticsearch/PostgreSQL等のn-gramトークナイザと同種の考え方。
// ============================================================
export function tokenize(text) {
  const tokens = new Set();
  if (!text) return tokens;

  // 英数字+アンダースコアの連続を1トークンとして抽出（2文字未満はノイズとして除外）
  const asciiWords = text.match(/[A-Za-z0-9_]+/g) || [];
  for (const w of asciiWords) {
    if (w.length >= 2) tokens.add(w.toLowerCase());
  }

  // ASCII単語・記号（\p{P}=約物、\p{S}=数学記号等）・空白を除去した残りをCJKバイグラム化する
  const residual = text
    .replace(/[A-Za-z0-9_]+/g, ' ')
    .replace(/[\p{P}\p{S}\s]/gu, ' ');
  const chunks = residual.split(/\s+/).filter(Boolean);
  for (const chunk of chunks) {
    if (chunk.length === 1) {
      tokens.add(chunk);
    } else {
      for (let i = 0; i < chunk.length - 1; i++) {
        tokens.add(chunk.slice(i, i + 2));
      }
    }
  }
  return tokens;
}

// Jaccard係数 = |A∩B| / |A∪B|
export function jaccard(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
