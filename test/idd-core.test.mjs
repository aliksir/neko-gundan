// idd-core.test.mjs — IDD コアロジックのユニットテスト
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  normalizeVector,
  cosineSimilarity,
  estimateActionVector,
  detectDrift,
  computeActionTrend,
  DEFAULT_WEIGHTS,
  DIMENSIONS,
} from '../scripts/idd-core.mjs';

describe('normalizeVector', () => {
  it('ノルム1.0のベクトルを返す', () => {
    const isv = { urgency: 0.5, risk: 0.3, complexity: 0.7, novelty: 0.2, purpose_alignment: 0.9 };
    const vec = normalizeVector(isv);
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    assert.ok(Math.abs(norm - 1.0) < 0.001, `norm should be ~1.0, got ${norm}`);
  });

  it('ゼロベクトル入力でゼロベクトルを返す', () => {
    const isv = { urgency: 0, risk: 0, complexity: 0, novelty: 0, purpose_alignment: 0 };
    const vec = normalizeVector(isv);
    assert.deepStrictEqual(vec, [0, 0, 0, 0, 0]);
  });

  it('5次元ベクトルを返す', () => {
    const isv = { urgency: 0.5, risk: 0.3, complexity: 0.7, novelty: 0.2, purpose_alignment: 0.9 };
    const vec = normalizeVector(isv);
    assert.strictEqual(vec.length, 5);
  });
});

describe('cosineSimilarity', () => {
  it('同一ベクトルで1.0を返す', () => {
    const vec = [0.3, 0.4, 0.5, 0.1, 0.7];
    const sim = cosineSimilarity(vec, vec);
    assert.ok(Math.abs(sim - 1.0) < 0.001, `similarity should be ~1.0, got ${sim}`);
  });

  it('直交ベクトルで0.0を返す', () => {
    const vecA = [1, 0, 0, 0, 0];
    const vecB = [0, 1, 0, 0, 0];
    const sim = cosineSimilarity(vecA, vecB);
    assert.ok(Math.abs(sim) < 0.001, `similarity should be ~0.0, got ${sim}`);
  });

  it('反対ベクトルで-1.0を返す', () => {
    const vecA = [1, 0, 0, 0, 0];
    const vecB = [-1, 0, 0, 0, 0];
    const sim = cosineSimilarity(vecA, vecB);
    assert.ok(Math.abs(sim - (-1.0)) < 0.001, `similarity should be ~-1.0, got ${sim}`);
  });

  it('[0,1]範囲で返る（正の入力の場合）', () => {
    const vecA = [0.3, 0.4, 0.5, 0.1, 0.7];
    const vecB = [0.1, 0.8, 0.2, 0.6, 0.3];
    const sim = cosineSimilarity(vecA, vecB);
    assert.ok(sim >= 0 && sim <= 1, `similarity should be in [0,1], got ${sim}`);
  });
});

describe('estimateActionVector', () => {
  it('Readツールの行動ベクトルを返す', () => {
    const vec = estimateActionVector('Read', { file_path: '/test.md' });
    assert.ok(vec.purpose_alignment !== undefined);
    assert.ok(vec.risk < 0.3, 'Read should have low risk');
  });

  it('Bashツール(git commit)の行動ベクトルを返す', () => {
    const vec = estimateActionVector('Bash', { command: 'git commit -m "test"' });
    assert.ok(vec.purpose_alignment >= 0.8, 'commit should have high purpose_alignment');
  });

  it('WebFetchの目的整合性が低い', () => {
    const vec = estimateActionVector('WebFetch', { url: 'https://example.com' });
    assert.ok(vec.purpose_alignment <= 0.6, 'WebFetch should have lower purpose_alignment');
  });
});

describe('detectDrift', () => {
  it('同一ベクトルでOK判定', () => {
    const intent = { urgency: 0.5, risk: 0.3, complexity: 0.5, novelty: 0.3, purpose_alignment: 0.9 };
    const result = detectDrift(intent, intent);
    assert.strictEqual(result.level, 'OK');
    assert.ok(result.similarity > 0.99);
  });

  it('大きく異なるベクトルでWARNINGまたはALERT判定', () => {
    const intent = { urgency: 0.1, risk: 0.1, complexity: 0.1, novelty: 0.1, purpose_alignment: 0.9 };
    const action = { urgency: 0.9, risk: 0.9, complexity: 0.9, novelty: 0.9, purpose_alignment: 0.1 };
    const result = detectDrift(intent, action);
    assert.ok(result.level === 'WARNING' || result.level === 'ALERT', `expected WARNING or ALERT, got ${result.level}`);
  });

  it('結果にsimilarity, angle_deg, level, thresholdsを含む', () => {
    const intent = { urgency: 0.5, risk: 0.3, complexity: 0.5, novelty: 0.3, purpose_alignment: 0.9 };
    const result = detectDrift(intent, intent);
    assert.ok('similarity' in result);
    assert.ok('angle_deg' in result);
    assert.ok('level' in result);
    assert.ok('thresholds' in result);
  });
});

describe('computeActionTrend', () => {
  it('空履歴でデフォルト値を返す', () => {
    const trend = computeActionTrend([]);
    assert.ok(trend.purpose_alignment !== undefined);
  });

  it('履歴の移動平均を返す', () => {
    const history = [
      { urgency: 0.2, risk: 0.1, complexity: 0.3, novelty: 0.1, purpose_alignment: 0.8 },
      { urgency: 0.4, risk: 0.3, complexity: 0.5, novelty: 0.3, purpose_alignment: 0.6 },
    ];
    const trend = computeActionTrend(history);
    assert.ok(Math.abs(trend.urgency - 0.3) < 0.001);
    assert.ok(Math.abs(trend.purpose_alignment - 0.7) < 0.001);
  });
});
