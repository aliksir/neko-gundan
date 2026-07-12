// idd-core.mjs — Intent Drift Detector コアロジック
// ISVベクトルの正規化・余弦類似度計算・閾値判定・auto-anchor判定を提供する。
// 依存ゼロ（Node.js標準ライブラリのみ）。

// ISV Phase 4 分析から導出されたデフォルト重み
const DEFAULT_WEIGHTS = {
  urgency: 0.13,
  risk: 0.03,
  complexity: 0.08,
  novelty: 0.03,
  purpose_alignment: 0.34,
};

// ISV 5次元の順序
const DIMENSIONS = ['urgency', 'risk', 'complexity', 'novelty', 'purpose_alignment'];

// 閾値設定（保守的に設定、運用で調整）
const THRESHOLDS = {
  warning: 0.7,  // cos sim がこれ未満で WARNING
  alert: 0.5,    // cos sim がこれ未満で ALERT（auto-anchor 発動）
};

// ウォームアップ期間（最初のN回はドリフト計算をスキップ）
const WARMUP_COUNT = 5;

// ISVベクトルを重み付き正規化する
export function normalizeVector(isv, weights = DEFAULT_WEIGHTS) {
  const vec = DIMENSIONS.map(dim => {
    const val = isv[dim] ?? 0.5;
    const w = weights[dim] ?? 0.1;
    return val * w;
  });

  // L2ノルムで正規化
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vec.map(() => 0);
  return vec.map(v => v / norm);
}

// 2ベクトル間の余弦類似度を計算
export function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

// ツール呼び出しから行動ベクトル（action vector）を推定する
export function estimateActionVector(toolName, toolInput) {
  // ツール種別から行動の意図的特性を推定
  const action = {
    urgency: 0.5,
    risk: 0.3,
    complexity: 0.3,
    novelty: 0.2,
    purpose_alignment: 0.8,
  };

  // ツール種別に応じた調整
  if (toolName === 'Read' || toolName === 'Grep' || toolName === 'Glob') {
    // 偵察行動: リスク低、複雑性低、目的整合性は中
    action.urgency = 0.3;
    action.risk = 0.1;
    action.complexity = 0.2;
    action.novelty = 0.2;
    action.purpose_alignment = 0.7;
  } else if (toolName === 'Edit' || toolName === 'Write') {
    // 実装行動: 目的整合性が高い
    action.urgency = 0.5;
    action.risk = 0.3;
    action.complexity = 0.5;
    action.novelty = 0.3;
    action.purpose_alignment = 0.9;
  } else if (toolName === 'Bash') {
    const cmd = toolInput?.command || '';
    if (/git\s+(commit|push)/.test(cmd)) {
      // コミット/プッシュ: 完了に向かう行動
      action.urgency = 0.6;
      action.risk = 0.4;
      action.purpose_alignment = 0.9;
    } else if (/git\s+(status|log|diff)/.test(cmd)) {
      // 確認行動
      action.urgency = 0.3;
      action.risk = 0.1;
      action.purpose_alignment = 0.7;
    } else if (/npm\s+test|cargo\s+test|pytest/.test(cmd)) {
      // テスト実行: 品質確認
      action.urgency = 0.4;
      action.risk = 0.2;
      action.complexity = 0.4;
      action.purpose_alignment = 0.9;
    }
  } else if (toolName === 'WebFetch' || toolName === 'WebSearch') {
    // 外部調査: 目的との直接整合性が低い場合あり
    action.urgency = 0.3;
    action.risk = 0.2;
    action.complexity = 0.3;
    action.novelty = 0.6;
    action.purpose_alignment = 0.5;
  } else if (toolName === 'Agent') {
    // サブエージェント起動: 複雑性高め
    action.urgency = 0.5;
    action.risk = 0.3;
    action.complexity = 0.6;
    action.novelty = 0.4;
    action.purpose_alignment = 0.8;
  }

  return action;
}

// ドリフト角度を計算して判定を返す
export function detectDrift(intentVector, actionVector, weights = DEFAULT_WEIGHTS) {
  const intentNorm = normalizeVector(intentVector, weights);
  const actionNorm = normalizeVector(actionVector, weights);
  const similarity = cosineSimilarity(intentNorm, actionNorm);

  // 角度（度数法）に変換
  const angleRad = Math.acos(Math.min(1, Math.max(-1, similarity)));
  const angleDeg = angleRad * (180 / Math.PI);

  let level = 'OK';
  if (similarity < THRESHOLDS.alert) level = 'ALERT';
  else if (similarity < THRESHOLDS.warning) level = 'WARNING';

  return {
    similarity: Math.round(similarity * 1000) / 1000,
    angle_deg: Math.round(angleDeg * 10) / 10,
    level,
    thresholds: THRESHOLDS,
  };
}

// ドリフトイベントをISV連携用JSONL形式にフォーマットする（v3）
// WARNING/ALERT時のみ値を返す。OKはnull（記録不要）
export function formatDriftEvent(session, driftResult) {
  if (!driftResult || driftResult.level === 'OK') return null;
  return JSON.stringify({
    type: 'drift_event',
    ts: new Date().toISOString(),
    drift_level: driftResult.level,
    drift_angle: driftResult.angle_deg,
    similarity: driftResult.similarity,
    tool_count: session.tool_count || 0,
    anchor_count: session.anchor_count || 0,
    intent_vector: session.intent_vector,
  });
}

// 行動履歴から累積行動ベクトルを計算（移動平均）
export function computeActionTrend(actionHistory, windowSize = 5) {
  if (actionHistory.length === 0) {
    return { urgency: 0.5, risk: 0.3, complexity: 0.3, novelty: 0.2, purpose_alignment: 0.7 };
  }

  const window = actionHistory.slice(-windowSize);
  const trend = {};
  for (const dim of DIMENSIONS) {
    const vals = window.map(a => a[dim] || 0.5);
    trend[dim] = vals.reduce((s, v) => s + v, 0) / vals.length;
  }
  return trend;
}

// エクスポート（テスト用）
export { DEFAULT_WEIGHTS, DIMENSIONS, THRESHOLDS, WARMUP_COUNT };
