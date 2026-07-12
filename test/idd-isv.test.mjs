#!/usr/bin/env node
// idd-isv.test.mjs — IDD→ISV連携のユニットテスト
// 直接実行: node test/idd-isv.test.mjs

import assert from 'node:assert/strict';
import { resolve } from 'node:path';

const IDD_CORE_PATH = resolve('scripts/idd-core.mjs');

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

console.log('=== IDD→ISV連携テスト ===\n');

// idd-core.mjs を動的 import
const core = await import(`file:///${IDD_CORE_PATH.replace(/\\/g, '/')}`);
const { formatDriftEvent, detectDrift } = core;

// テスト1: WARNING時にイベント生成
test('WARNING時にJSONLイベントを生成', () => {
  const session = {
    intent_vector: { urgency: 0.5, risk: 0.3, complexity: 0.5, novelty: 0.3, purpose_alignment: 0.8 },
    tool_count: 15,
    anchor_count: 0,
  };
  const drift = { level: 'WARNING', angle_deg: 32.5, similarity: 0.65 };
  const result = formatDriftEvent(session, drift);
  assert.ok(result !== null, 'WARNINGでnullは不正');
  const parsed = JSON.parse(result);
  assert.equal(parsed.type, 'drift_event');
  assert.equal(parsed.drift_level, 'WARNING');
  assert.equal(parsed.drift_angle, 32.5);
  assert.equal(parsed.tool_count, 15);
});

// テスト2: ALERT時にイベント生成
test('ALERT時にJSONLイベントを生成', () => {
  const session = {
    intent_vector: { urgency: 0.5, risk: 0.3, complexity: 0.5, novelty: 0.3, purpose_alignment: 0.8 },
    tool_count: 25,
    anchor_count: 2,
  };
  const drift = { level: 'ALERT', angle_deg: 55.0, similarity: 0.42 };
  const result = formatDriftEvent(session, drift);
  assert.ok(result !== null);
  const parsed = JSON.parse(result);
  assert.equal(parsed.drift_level, 'ALERT');
  assert.equal(parsed.anchor_count, 2);
});

// テスト3: OK時はnull
test('OK時はnull（記録不要）', () => {
  const session = { intent_vector: {}, tool_count: 10, anchor_count: 0 };
  const drift = { level: 'OK', angle_deg: 10.0, similarity: 0.95 };
  const result = formatDriftEvent(session, drift);
  assert.equal(result, null);
});

// テスト4: driftResult が null
test('driftResult が null でも安全', () => {
  const session = { intent_vector: {}, tool_count: 5, anchor_count: 0 };
  const result = formatDriftEvent(session, null);
  assert.equal(result, null);
});

// テスト5: intent_vector がイベントに含まれる
test('intent_vectorがイベントに保存される', () => {
  const iv = { urgency: 0.8, risk: 0.1, complexity: 0.9, novelty: 0.5, purpose_alignment: 0.7 };
  const session = { intent_vector: iv, tool_count: 20, anchor_count: 1 };
  const drift = { level: 'WARNING', angle_deg: 28.0, similarity: 0.68 };
  const result = formatDriftEvent(session, drift);
  const parsed = JSON.parse(result);
  assert.deepEqual(parsed.intent_vector, iv);
});

console.log(`\n結果: ${passed} PASS / ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
