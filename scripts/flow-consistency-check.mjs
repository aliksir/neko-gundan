#!/usr/bin/env node
// フロー図(workflow-flow.html)と実装(gates/agents/rules)の整合性チェッカー
// 7カテゴリで網羅的に検証する
import { readFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';

const WORK_DIR = (process.env.NEKO_WORK_DIR || process.argv[2] || process.cwd()).replace(/\\/g, '/');
const BASE = WORK_DIR + '/.claude';
const FLOW_FILE = `${BASE}/workflow-flow.html`;

// 結果蓄積
const results = { pass: [], fail: [], warn: [] };
function pass(cat, msg) { results.pass.push({ cat, msg }); }
function fail(cat, msg) { results.fail.push({ cat, msg }); }
function warn(cat, msg) { results.warn.push({ cat, msg }); }

// ファイル読み込みヘルパー
function readSafe(path) {
  try { return readFileSync(resolve(path), 'utf8'); } catch { return null; }
}

// ゲートファイルのチェック項目数カウント（テーブル行の | [ ] | パターン）
function countCheckboxRows(content) {
  return (content.match(/^\|\s*\[[\sx]\]\s*\|/gm) || []).length;
}

// タイトル行から宣言された項目数を抽出（「4項目」「19項目」）
function extractDeclaredCount(content) {
  const m = content.match(/(\d+)\s*項目/);
  return m ? parseInt(m[1]) : null;
}

// ==============================
// A. ゲート項目数チェック
// ==============================
function checkGateItemCounts() {
  const cat = 'A:ゲート項目数';
  // フロー図で宣言されている項目数
  const expected = {
    'gates-start-nano.md': { label: 'ナノ開始', count: 6 },
    'gates-start-mini.md': { label: 'ミニ開始', count: 12 },
    'gates-start-full.md': { label: 'フル開始', count: 17 },
    'gates-complete.md': { label: '報告前CP', count: 8 },
    'gates-complete-mini.md': { label: 'ミニ完了', count: 21 },
    'gates-complete-full.md': { label: 'フル完了', count: 28 },
  };

  for (const [file, spec] of Object.entries(expected)) {
    const content = readSafe(`${BASE}/gates/${file}`);
    if (!content) {
      fail(cat, `${spec.label}: ${file} が存在しない`);
      continue;
    }
    // 3層チェック: (1)タイトル宣言 (2)チェックボックス行 (3)フロー図宣言
    const declared = extractDeclaredCount(content);
    const checkboxCount = countCheckboxRows(content);
    const actual = declared || checkboxCount || 0;

    if (actual === 0) {
      warn(cat, `${spec.label}: 項目数の自動カウント不能（手動確認要）`);
    } else if (actual === spec.count) {
      pass(cat, `${spec.label}: ${spec.count}項 OK（タイトル宣言=${declared ?? '?'} / チェックボックス=${checkboxCount}）`);
    } else {
      fail(cat, `${spec.label}: フロー=${spec.count}項 / タイトル宣言=${declared ?? '?'} / チェックボックス=${checkboxCount}`);
    }

    // タイトル宣言とチェックボックスの内部不整合もチェック
    if (declared && checkboxCount && declared !== checkboxCount) {
      warn(cat, `${spec.label}: ファイル内部不整合 — タイトル「${declared}項目」 vs チェックボックス${checkboxCount}行`);
    }
  }
}

// ==============================
// B. ファイル参照チェック
// ==============================
function checkFileReferences() {
  const cat = 'B:ファイル参照';
  const flow = readSafe(FLOW_FILE);
  if (!flow) { fail(cat, 'workflow-flow.html 読み込み失敗'); return; }

  // フロー図内のファイル参照を抽出（code要素やテキストから）
  const refs = [
    { ref: '.claude/gates/gates-start.md', desc: 'プロジェクト憲章参照' },
    { ref: '.claude/gates/gates-design.md', desc: 'Sprint Contract/Pre-Mortem参照' },
    { ref: '.claude/gates/gates-complete.md', desc: '報告前CP参照' },
    { ref: '.claude/rules/review-protocol.md', desc: 'レビュープロトコル参照' },
    { ref: '.claude/rules-ondemand/review-protocol-detail.md', desc: 'Bug Sweep参照' },
    { ref: 'memory/feedback_tire_swing_test.md', desc: 'CR-7参照' },
    { ref: 'multi-agent-neko/modules/mutation-review.md', desc: 'Mutation Review参照' },
    { ref: '.claude/rules-ondemand/qa-test-meeting.md', desc: '猫テスト会議参照' },
  ];

  for (const { ref, desc } of refs) {
    // フロー図内に参照があるか
    const inFlow = flow.includes(ref) || flow.includes(basename(ref));
    // ファイルが実在するか
    const filePath = ref.startsWith('.claude') ? `${BASE}/${ref.replace('.claude/', '')}` : `${WORK_DIR}/${ref}`;
    const fileExists = existsSync(resolve(filePath));

    if (inFlow && fileExists) {
      pass(cat, `${desc}: 参照あり + ファイル実在`);
    } else if (inFlow && !fileExists) {
      fail(cat, `${desc}: フロー図に参照あるがファイル不在 (${ref})`);
    } else if (!inFlow && fileExists) {
      warn(cat, `${desc}: ファイル実在するがフロー図に参照なし (${ref})`);
    }
  }
}

// ==============================
// C. エージェントモデル割当チェック
// ==============================
function checkAgentModels() {
  const cat = 'C:モデル割当';
  // フロー図で宣言されている割当
  const expected = {
    'oyakata-neko': { label: '親方猫', model: 'opus', modelDetail: 'Opus 4.6' },
    'shigoto-neko': { label: '仕事猫', model: 'opus', modelDetail: 'Opus 4.6' },
    'genba-neko': { label: '現場猫', model: 'sonnet', modelDetail: 'sonnet' },
    'kurouto-neko': { label: '玄人猫', model: 'opus', modelDetail: 'Opus 4.8' },
    'koneko-neko': { label: '子猫', model: 'haiku', modelDetail: 'haiku' },
  };

  for (const [file, spec] of Object.entries(expected)) {
    const content = readSafe(`${BASE}/agents/${file}.md`);
    if (!content) {
      fail(cat, `${spec.label}: agents/${file}.md が存在しない`);
      continue;
    }
    // frontmatterからmodel取得
    const modelMatch = content.match(/^model:\s*(.+)$/m);
    if (!modelMatch) {
      warn(cat, `${spec.label}: model: フィールドが見つからない`);
      continue;
    }
    const actualModel = modelMatch[1].trim();
    if (actualModel === spec.model || actualModel.includes(spec.model)) {
      pass(cat, `${spec.label}: ${actualModel} OK`);
    } else {
      fail(cat, `${spec.label}: フロー=${spec.modelDetail} / agents/${file}.md=${actualModel}`);
    }
  }
}

// ==============================
// D. レビュープロトコル整合チェック
// ==============================
function checkReviewProtocol() {
  const cat = 'D:レビュー整合';
  const flow = readSafe(FLOW_FILE);
  const rp = readSafe(`${BASE}/rules/review-protocol.md`);
  if (!flow || !rp) { fail(cat, 'ファイル読み込み失敗'); return; }

  // ループ上限3回
  if (flow.includes('max 3') && rp.includes('ループ上限3回')) {
    pass(cat, 'FAILループ上限: max 3 一致');
  } else {
    fail(cat, 'FAILループ上限: フローとreview-protocol.mdで不一致');
  }

  // CR-1 実装者≠レビュアー
  if (flow.includes('実装者') && flow.includes('レビュアー') && rp.includes('実装者≠レビュアー')) {
    pass(cat, 'CR-1: 実装者≠レビュアー 両方に記載あり');
  } else {
    warn(cat, 'CR-1: 実装者≠レビュアー の記載確認要');
  }

  // RQS閾値
  const flowRQS = flow.match(/RQS[>=≥]*(\d+)%/);
  const rpRQS = rp.match(/RQS\s*>=?\s*(\d+)\s*%?\s*.*PASS/);
  if (flowRQS && rpRQS) {
    if (flowRQS[1] === rpRQS[1]) {
      pass(cat, `Mutation Review RQS閾値: ${flowRQS[1]}% 一致`);
    } else {
      fail(cat, `Mutation Review RQS閾値: フロー=${flowRQS[1]}% / protocol=${rpRQS[1]}%`);
    }
  } else {
    warn(cat, 'RQS閾値の自動抽出不能（手動確認要）');
  }

  // レビュー必須化スケール
  const reviewScaleChecks = [
    { label: '①計画レビュー', flowText: '小隊+: 必須', rpPattern: /計画書レビュー.*必須.*kurouto/s },
    { label: '④報告書レビュー小隊', flowText: '小隊: 推奨', rpPattern: /報告書レビュー.*推奨/s },
    { label: '④報告書レビュー中隊+', flowText: '中隊+: 必須', rpPattern: /報告書レビュー.*必須.*kurouto/s },
  ];
  for (const chk of reviewScaleChecks) {
    if (flow.includes(chk.flowText)) {
      pass(cat, `${chk.label}: フロー記載「${chk.flowText}」あり`);
    } else {
      fail(cat, `${chk.label}: フローに「${chk.flowText}」の記載なし`);
    }
  }
}

// ==============================
// E. スケール定義整合チェック
// ==============================
function checkScaleDefinitions() {
  const cat = 'E:スケール定義';
  const flow = readSafe(FLOW_FILE);
  const gatesMd = readSafe(`${BASE}/rules/gates.md`);
  const claudeMd = readSafe(`${WORK_DIR}/CLAUDE.md`);
  if (!flow || !gatesMd || !claudeMd) { fail(cat, 'ファイル読み込み失敗'); return; }

  // 成果物セット
  const artifactChecks = [
    { label: '小隊成果物', flow: '全8種', gates: '全8種', claude: '全8種' },
    { label: '中隊+成果物', flow: '全9種', gates: '全9種', claude: '全9種' },
  ];
  for (const chk of artifactChecks) {
    const inFlow = flow.includes(chk.flow);
    const inGates = gatesMd.includes(chk.gates);
    const inClaude = claudeMd.includes(chk.claude);
    if (inFlow && inGates && inClaude) {
      pass(cat, `${chk.label}: 3ファイルで「${chk.flow}」一致`);
    } else {
      const missing = [];
      if (!inFlow) missing.push('フロー図');
      if (!inGates) missing.push('gates.md');
      if (!inClaude) missing.push('CLAUDE.md');
      fail(cat, `${chk.label}: 「${chk.flow}」が ${missing.join(', ')} にない`);
    }
  }

  // ステップ数（HTMLカードの<h3>から抽出）
  const stepChecks = [
    { label: '偵察ステップ数', pattern: /偵察（(\d+)ステップ）/, expected: 5 },
    { label: '小隊ステップ数', pattern: /小隊（(\d+)ステップ）/, expected: 15 },
    { label: '中隊\+ステップ数', pattern: /中隊\+（(\d+)ステップ）/, expected: 16 },
  ];
  for (const chk of stepChecks) {
    const m = flow.match(chk.pattern);
    if (m && parseInt(m[1]) === chk.expected) {
      pass(cat, `${chk.label}: ${chk.expected} OK`);
    } else if (m) {
      fail(cat, `${chk.label}: フロー記載=${m[1]} / 期待=${chk.expected}`);
    } else {
      warn(cat, `${chk.label}: パターン抽出不能`);
    }
  }

  // 偵察成果物=なし
  if (flow.includes('成果物: なし') || flow.includes('成果物なし')) {
    pass(cat, '偵察成果物: 「なし」記載あり');
  } else {
    fail(cat, '偵察成果物: 「なし」の記載がない');
  }
}

// ==============================
// F. 双方向参照チェック（孤児検出）
// ==============================
function checkBidirectionalRefs() {
  const cat = 'F:双方向参照';
  const flow = readSafe(FLOW_FILE);
  if (!flow) { fail(cat, 'フロー図読み込み失敗'); return; }

  // ゲートファイルがフロー図から参照されているか
  const gateFiles = [
    'gates-start.md', 'gates-start-nano.md', 'gates-start-mini.md', 'gates-start-full.md',
    'gates-design.md', 'gates-complete.md', 'gates-complete-mini.md', 'gates-complete-full.md',
  ];
  for (const gf of gateFiles) {
    if (!existsSync(resolve(`${BASE}/gates/${gf}`))) {
      fail(cat, `${gf}: ファイル不在`);
      continue;
    }
    // フロー図にファイル名 or 対応するラベルの参照があるか
    const nameInFlow = flow.includes(gf) || flow.includes(gf.replace('.md', ''));
    // ゲート種別がフローに言及されているか
    const labelMap = {
      'gates-start.md': ['開始ゲート', '規模判定', 'プロジェクト憲章'],
      'gates-start-nano.md': ['ナノ開始', 'ナノ(6項)'],
      'gates-start-mini.md': ['mini 12', 'ミニ開始'],
      'gates-start-full.md': ['full 17', 'フル開始'],
      'gates-design.md': ['設計', 'Pre-Mortem', 'Sprint Contract'],
      'gates-complete.md': ['報告前CP', 'CP(8項)', 'CP 8項'],
      'gates-complete-mini.md': ['mini 21', 'ミニ完了'],
      'gates-complete-full.md': ['full 28', 'フル完了'],
    };
    const labels = labelMap[gf] || [];
    const labelInFlow = labels.some(l => flow.includes(l));

    if (nameInFlow || labelInFlow) {
      pass(cat, `${gf}: フロー図に参照あり`);
    } else {
      warn(cat, `${gf}: フロー図に直接参照なし（ラベル参照も不一致）`);
    }
  }
}

// ==============================
// G. カード部分とフロー本文の整合
// ==============================
function checkCardConsistency() {
  const cat = 'G:カード整合';
  const flow = readSafe(FLOW_FILE);
  if (!flow) { fail(cat, 'フロー図読み込み失敗'); return; }

  // カード記載のチェック
  const checks = [
    { label: '偵察レビュー条件', pattern: '変更なし→なし', desc: 'カードに記載あり' },
    { label: '偵察レビュー条件2', pattern: '変更あり→kurouto必須', desc: 'カードに記載あり' },
    { label: '小隊レビュー4箇所', pattern: '4箇所', desc: '小隊カードに4レビュー記載' },
    { label: '中隊+設計レビュー会議', pattern: '設計レビュー会議', desc: '中隊+カードに記載' },
    { label: '猫会議≠設計レビュー会議', pattern: '設計レビュー会議とは別', desc: '混同注意の記載' },
    { label: '品質指標3つ', pattern: 'intervention_count', desc: '品質指標にintervention記載' },
    { label: 'commit数除外', pattern: 'commit数は品質指標に含めない', desc: 'commit除外の明記' },
  ];

  for (const chk of checks) {
    if (flow.includes(chk.pattern)) {
      pass(cat, `${chk.label}: ${chk.desc}`);
    } else {
      fail(cat, `${chk.label}: 「${chk.pattern}」の記載なし`);
    }
  }

  // AI-READABLEセクションの存在確認
  if (flow.includes('AI-READABLE')) {
    pass(cat, 'AI-READABLEテキストセクション: 存在');
  } else {
    fail(cat, 'AI-READABLEテキストセクション: 不在（猫が読めない）');
  }

  // 用語集の存在確認
  if (flow.includes('用語集')) {
    pass(cat, '用語集セクション: 存在');
  } else {
    warn(cat, '用語集セクション: 不在');
  }

  // フロー変更プロセスの存在確認
  if (flow.includes('フロー変更プロセス')) {
    pass(cat, 'フロー変更プロセス: 存在');
  } else {
    fail(cat, 'フロー変更プロセス: 不在（自己参照ループがない）');
  }
}

// ==============================
// 実行
// ==============================
console.log('=== フロー整合性チェック ===\n');

checkGateItemCounts();
checkFileReferences();
checkAgentModels();
checkReviewProtocol();
checkScaleDefinitions();
checkBidirectionalRefs();
checkCardConsistency();

// 結果出力
const cats = [...new Set([...results.pass, ...results.fail, ...results.warn].map(r => r.cat))];
for (const cat of cats) {
  console.log(`\n[${cat}]`);
  const catPass = results.pass.filter(r => r.cat === cat);
  const catFail = results.fail.filter(r => r.cat === cat);
  const catWarn = results.warn.filter(r => r.cat === cat);
  for (const r of catFail) console.log(`  FAIL: ${r.msg}`);
  for (const r of catWarn) console.log(`  WARN: ${r.msg}`);
  for (const r of catPass) console.log(`  PASS: ${r.msg}`);
}

console.log('\n=== サマリ ===');
console.log(`PASS: ${results.pass.length} / FAIL: ${results.fail.length} / WARN: ${results.warn.length}`);

if (results.fail.length > 0) {
  console.log('\n不整合一覧:');
  for (const r of results.fail) {
    console.log(`  [${r.cat}] ${r.msg}`);
  }
}

process.exit(results.fail.length > 0 ? 1 : 0);
