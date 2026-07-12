#!/usr/bin/env node
// check-kaigi-close.mjs — kaigi会議録の「クローズ推奨」に独立検証証跡(evidence)が
// 伴っているかを検証するモジュール。pii-commit-guard.mjs から動的importされ、
// checkKaigiClose(fileSections) が呼び出される。
// 設計書: designs/20260711_phase1-auto-enforcement.md（P-A: 証跡ベースクローズ）
//
// 背景: 猫会議のクローズ判定が実装者の自己申告に依存している構造欠陥（D-003形骸化）を
// 機械強制で是正する。「クローズ推奨」報告に独立検証の証跡(evidence)がなければ
// commitをブロックする。
//
// fail-open原則: 本モジュールは純粋関数のみで構成し、例外を投げない設計とする
// （不正な入力はfindings: []として扱う）。呼び出し元(pii-commit-guard.mjs)側でも
// try/catchでラップされる。

// kaigi/*.md または memory/kaigi/*.md（さらに深い親ディレクトリ配下でも末尾が
// この形であれば対象。例: projects/C--work/memory/kaigi/xxx.md も対象とする）に
// マッチする正規表現。kaigi直下のファイルのみを対象とし、
// サブディレクトリ配下(kaigi/sub/x.md)は対象外とする。
const KAIGI_PATH_RE = /(^|\/)(memory\/)?kaigi\/[^/]+\.md$/;

// 「クローズ推奨」キーワードを含む行を検出対象とする
const CLOSE_KEYWORD = 'クローズ推奨';

// evidence行の判定: trim後、行頭が evidence: で始まる（大文字小文字は問わない）。
// 許容フォーマット例（存在チェックのみ。内容の正当性検証はPhase 1.5で段階実装）:
//   evidence: commit <hash>
//   evidence: hook-test <PASS|BLOCK> <hook名>
//   evidence: reviews/<filename>
//   evidence: result/<filename>
const EVIDENCE_LINE_RE = /^evidence:/i;

// 「クローズ推奨」行から前後何行以内をevidence近傍とみなすか
//
// 実測メモ（2026-07-11、Phase 1.5 FIX-2対応、やさぐれ猫3回指摘への回答）:
// - 実データ実測（N=20+）は不可能と判明。kaigi/*.md / memory/kaigi/*.md 形式での実運用実績は
//   本設計導入日（2026-07-11）時点でテストファイル1件のみ（_deleted/配下、evidence行なし）。
//   実運用の猫会議記録は chat-logs/ result/ reviews/*.html metrics/ 等の既存ディレクトリに
//   分散しており、kaigi/*.md 専用ディレクトリでの蓄積はこれから。
// - 合成テストケースでロジック自体の境界動作は確認済み: distance<=RANGEでPASS、distance>RANGEで
//   BLOCK（distance=5でPASS、distance=6でBLOCKを確認）。RANGE=5は「クローズ推奨」記述の前後に
//   3-5行程度の説明文を挟むMarkdown箇条書き形式を想定すれば妥当な余裕。
// - より重大な発見: 実際の猫会議記録（result/20260711_kaigi-cross-analysis.md 等）を調査した結果、
//   証跡情報は本行の EVIDENCE_LINE_RE（行頭 evidence:）とは異なり、自然文に埋め込まれる
//   （例:「hook-test PASS確認済み、クローズ推奨」で同一行）か、別ファイル・別日付の会議録に
//   存在するケースが主流。この場合 NEIGHBOR_RANGE の値に関わらず検出されない（同一行埋め込み・
//   別ファイル参照パターンは RANGE=3/5/7/10 いずれで合成テストしてもBLOCK）。
// - 結論: NEIGHBOR_RANGE=5は「仮置き（暫定、code-wiring-principle.md R4）」として維持する。
//   値の増減よりも EVIDENCE_LINE_RE のフォーマット要求（行頭 evidence:）と実運用の記述パターンの
//   乖離の方が優先度が高い可能性がある（P-A設計全体の見直しは本タスクのスコープ外、別途報告）。
//   kaigi/*.md 運用が蓄積し実データが N=20+ に達した時点で再実測し確定値化すること。
const NEIGHBOR_RANGE = 5;

/**
 * fileSections（commit-guardのparseDiffByFile出力と同形式: {filePath, content}の配列。
 * content はstaged diffの追加行のみを改行結合したもの）を検査する。
 *
 * kaigi/*.md 以外のファイルはスキップする（対象外）。kaigiファイル内で
 * 「クローズ推奨」を含む行を見つけたら、その行の前後5行以内（自分の行を含む）に
 * evidence:行があるかを確認する。なければ findings にブロック理由を積む。
 * 同一ファイル内に複数の未証跡クローズがあってもファイル単位で1件に集約する。
 *
 * @param {{filePath: string, content: string}[]} fileSections
 * @returns {{findings: string[]}}
 */
export function checkKaigiClose(fileSections) {
  const findings = [];

  // 入力が配列でなければ対象なしとして早期return（fail-open）
  if (!Array.isArray(fileSections)) return { findings };

  for (const section of fileSections) {
    // 想定外の形（filePath/contentが文字列でない）はスキップ（fail-open）
    if (!section || typeof section.filePath !== 'string' || typeof section.content !== 'string') continue;

    // kaigi/*.md 以外はスキップ（対象外ファイル）
    if (!KAIGI_PATH_RE.test(section.filePath)) continue;

    // 追加行を1行ずつ配列化して走査する
    const lines = section.content.split('\n');

    // このファイル内で「証跡なしクローズ推奨」を1件検出したら走査を打ち切る
    // （同一ファイルの複数箇所違反をfindings 1件に集約するため）
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes(CLOSE_KEYWORD)) continue;

      // 前後5行以内（自分の行を含む）にevidence:行があるか検査
      const start = Math.max(0, i - NEIGHBOR_RANGE);
      const end = Math.min(lines.length - 1, i + NEIGHBOR_RANGE);
      let hasEvidence = false;
      for (let j = start; j <= end; j++) {
        if (EVIDENCE_LINE_RE.test(lines[j].trim())) {
          hasEvidence = true;
          break;
        }
      }

      if (!hasEvidence) {
        findings.push(`kaigi close without evidence: ${section.filePath}`);
        break;
      }
    }
  }

  return { findings };
}
