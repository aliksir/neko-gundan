#!/usr/bin/env node
// tpg-v3.test.mjs — TPG v3 循環参照検出のユニットテスト
// 直接実行: node test/tpg-v3.test.mjs

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

// tpg-tracker.mjs から hasCycle 関数を抽出してテスト
// hook ファイルは ESM export していないため、関数を直接コピーしてテスト

// テスト対象: hasCycle関数（tpg-tracker.mjs と同一ロジック）
function hasCycle(graph, fromId, toId) {
  if (fromId === toId) return true;
  const adjacency = {};
  for (const edge of graph.edges) {
    if (!adjacency[edge.from]) adjacency[edge.from] = [];
    adjacency[edge.from].push(edge.to);
  }
  if (!adjacency[fromId]) adjacency[fromId] = [];
  adjacency[fromId].push(toId);

  const visited = new Set();
  const stack = [toId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === fromId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of (adjacency[current] || [])) {
      stack.push(next);
    }
  }
  return false;
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`  FAIL: ${name} — ${e.message}`);
    failed++;
  }
}

console.log('=== TPG v3 循環参照検出テスト ===\n');

// テスト1: 線形グラフ（循環なし）
test('線形グラフで循環なし', () => {
  const graph = {
    nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
    edges: [{ from: 'A', to: 'B' }, { from: 'B', to: 'C' }],
  };
  assert.equal(hasCycle(graph, 'C', 'D'), false);
});

// テスト2: 自己ループ
test('自己ループを検出', () => {
  const graph = { nodes: [{ id: 'A' }], edges: [] };
  assert.equal(hasCycle(graph, 'A', 'A'), true);
});

// テスト3: 直接循環（A→B→A）
test('直接循環を検出（A→B→A）', () => {
  const graph = {
    nodes: [{ id: 'A' }, { id: 'B' }],
    edges: [{ from: 'A', to: 'B' }],
  };
  assert.equal(hasCycle(graph, 'B', 'A'), true);
});

// テスト4: 間接循環（A→B→C→A）
test('間接循環を検出（A→B→C→A）', () => {
  const graph = {
    nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
    edges: [{ from: 'A', to: 'B' }, { from: 'B', to: 'C' }],
  };
  assert.equal(hasCycle(graph, 'C', 'A'), true);
});

// テスト5: 空グラフ
test('空グラフで循環なし', () => {
  const graph = { nodes: [], edges: [] };
  assert.equal(hasCycle(graph, 'X', 'Y'), false);
});

// テスト6: 分岐グラフ（循環なし）
test('分岐グラフで循環なし', () => {
  const graph = {
    nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }],
    edges: [{ from: 'A', to: 'B' }, { from: 'A', to: 'C' }, { from: 'B', to: 'D' }],
  };
  assert.equal(hasCycle(graph, 'C', 'D'), false);
});

console.log(`\n結果: ${passed} PASS / ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
