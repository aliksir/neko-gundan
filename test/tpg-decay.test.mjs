// tpg-decay.test.mjs — TPG信頼スコア減衰のユニットテスト
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// テスト対象の関数（tpg-guard.mjsからexportされる想定）
// 直接定義してテスト（hookファイルはCLI実行前提のため）

// 減衰ウィンドウ定数
const DECAY_WINDOW = 20;
const NO_DECAY_WINDOW = 5;

// 減衰関数: ノードの実効信頼スコアを返す
function effectiveTrust(node, currentIndex, totalNodes) {
  const age = totalNodes - 1 - currentIndex;
  // 直近ノードは減衰なし
  if (age < NO_DECAY_WINDOW) return node.trust;
  // 減衰係数を計算
  const decayFactor = Math.max(0, 1 - (age - NO_DECAY_WINDOW) / DECAY_WINDOW);
  // 減衰係数が0.5超なら元の信頼レベル維持、以下ならMEDIUMに収束
  return decayFactor > 0.5 ? node.trust : 'MEDIUM';
}

describe('effectiveTrust', () => {
  it('直近ノード（age < 5）は減衰なし', () => {
    const node = { trust: 'LOW', source: 'WebFetch' };
    // totalNodes=10, index=9 → age=0
    assert.strictEqual(effectiveTrust(node, 9, 10), 'LOW');
    // index=6 → age=3
    assert.strictEqual(effectiveTrust(node, 6, 10), 'LOW');
  });

  it('直近HIGHノードも減衰なし', () => {
    const node = { trust: 'HIGH', source: 'Read' };
    assert.strictEqual(effectiveTrust(node, 9, 10), 'HIGH');
  });

  it('古いLOWノードはMEDIUMに減衰する', () => {
    const node = { trust: 'LOW', source: 'WebFetch' };
    // totalNodes=30, index=0 → age=29 → 完全減衰
    assert.strictEqual(effectiveTrust(node, 0, 30), 'MEDIUM');
  });

  it('古いHIGHノードもMEDIUMに減衰する', () => {
    const node = { trust: 'HIGH', source: 'Read' };
    // age=29 → 完全減衰
    assert.strictEqual(effectiveTrust(node, 0, 30), 'MEDIUM');
  });

  it('境界値: NO_DECAY_WINDOW直後は元の値を維持', () => {
    const node = { trust: 'LOW', source: 'WebFetch' };
    // totalNodes=20, index=14 → age=5（ちょうどNO_DECAY_WINDOW）
    // decayFactor = 1 - (5-5)/20 = 1.0 > 0.5 → 元の値
    assert.strictEqual(effectiveTrust(node, 14, 20), 'LOW');
  });

  it('境界値: DECAY_WINDOW半ばで切替が起きる', () => {
    const node = { trust: 'LOW', source: 'curl' };
    // totalNodes=30, index=14 → age=15
    // decayFactor = 1 - (15-5)/20 = 1 - 0.5 = 0.5
    // 0.5 > 0.5 は false → MEDIUM
    assert.strictEqual(effectiveTrust(node, 14, 30), 'MEDIUM');
    // index=16 → age=13
    // decayFactor = 1 - (13-5)/20 = 1 - 0.4 = 0.6
    // 0.6 > 0.5 → LOW維持
    assert.strictEqual(effectiveTrust(node, 16, 30), 'LOW');
  });

  it('MEDIUMノードは減衰してもMEDIUMのまま', () => {
    const node = { trust: 'MEDIUM', source: 'Bash' };
    // 古くてもMEDIUMに収束するのでMEDIUM
    assert.strictEqual(effectiveTrust(node, 0, 30), 'MEDIUM');
    // 直近でもMEDIUM
    assert.strictEqual(effectiveTrust(node, 29, 30), 'MEDIUM');
  });
});
