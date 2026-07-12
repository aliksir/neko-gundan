#!/usr/bin/env node
// deliverable-check.mjs — 納品物品質の機械的検証ガード
// sppkg（SharePoint Framework パッケージ）/ pptx（PowerPoint）/ 画像（png,jpg,jpeg,bmp,gif）ファイルの品質を機械的に検証する。
// external-action-guard.mjs から execSync 経由で呼び出される想定だが、単体CLIとしても使用可能。
// 依存ゼロ（Node.js標準ライブラリのみ: fs / path / child_process / zlib）。
//
// Usage: node deliverable-check.mjs <file-path>
// exit 0: 全チェックPASS
// exit 1: 1件以上のチェックFAIL
// exit 2: ファイル不在 or 未対応形式
// stdout: JSON { file, type, pass, checks: [{ name, pass, detail }] }

import { existsSync, statSync, readFileSync, appendFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';

// ============================================================
// WCAG 相対輝度・コントラスト比計算（設計書の計算式をそのまま実装）
// ============================================================

// sRGB値(0-255)を線形化する（WCAG 2.x 相対輝度計算の前段処理）
function linearize(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

// 6桁HEXカラーコード（例: "FFFFFF"）から相対輝度を算出する
function luminance(hex) {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

// 2色間のWCAGコントラスト比を算出する（1:1〜21:1の範囲）
function contrastRatio(hex1, hex2) {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ============================================================
// ZIP解析（zlibフォールバック用: unzipコマンド不在・失敗時に使用）
// ============================================================

// ZIPファイル末尾からEnd of Central Directory Record(EOCD)を探索する。
// コメント欄が可変長(最大65535バイト)のため、シグネチャ(0x06054b50)をファイル末尾から逆順に探す。
function findEOCD(buf) {
  const SIG = 0x06054b50;
  const minPos = Math.max(0, buf.length - 65557); // コメント最大長65535 + EOCD固定22バイト
  for (let i = buf.length - 22; i >= minPos; i--) {
    if (buf.readUInt32LE(i) === SIG) return i;
  }
  return -1;
}

// ZIPファイルを読み込み、Central Directoryから全エントリのメタ情報（名前・サイズ・圧縮方式等）を抽出する
function parseZip(zipPath) {
  const buf = readFileSync(zipPath);
  const eocdOffset = findEOCD(buf);
  if (eocdOffset < 0) throw new Error('EOCDが見つかりません（不正なZIPファイル）');

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);

  const entries = [];
  let pos = cdOffset;
  const CD_SIG = 0x02014b50;
  for (let i = 0; i < totalEntries; i++) {
    if (pos + 46 > buf.length || buf.readUInt32LE(pos) !== CD_SIG) break; // シグネチャ不一致で打ち切り（安全側）
    const compressionMethod = buf.readUInt16LE(pos + 10);
    const compressedSize = buf.readUInt32LE(pos + 20);
    const uncompressedSize = buf.readUInt32LE(pos + 24);
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localHeaderOffset = buf.readUInt32LE(pos + 42);
    const name = buf.toString('utf8', pos + 46, pos + 46 + nameLen);
    entries.push({ name, compressionMethod, compressedSize, uncompressedSize, localHeaderOffset });
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return { buf, entries };
}

// 指定エントリの中身をバッファとして取り出す（deflate圧縮なら展開する）
function extractZipEntryData(zip, entryName) {
  const entry = zip.entries.find((e) => e.name === entryName);
  if (!entry) return null;

  const { buf } = zip;
  const lh = entry.localHeaderOffset;
  const LH_SIG = 0x04034b50;
  if (buf.readUInt32LE(lh) !== LH_SIG) throw new Error(`ローカルヘッダ不正: ${entryName}`);

  const nameLen = buf.readUInt16LE(lh + 26);
  const extraLen = buf.readUInt16LE(lh + 28);
  const dataStart = lh + 30 + nameLen + extraLen;
  const compressedData = buf.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compressionMethod === 0) return compressedData; // 無圧縮(stored)
  if (entry.compressionMethod === 8) return inflateRawSync(compressedData); // deflate展開
  throw new Error(`未対応の圧縮方式(method=${entry.compressionMethod}): ${entryName}`);
}

// ============================================================
// ZIP内アクセス統合関数（unzipコマンド優先、不在・失敗時はzlibフォールバック）
// ============================================================

// ZIP内エントリ一覧（ファイル名の配列）を取得する。
// execFileSync（execSyncではない）を使用: ファイルパスをシェル解釈させず引数配列で渡すことで
// コマンドインジェクションを避ける（filePathは外部コマンド文字列から抽出された値のため信頼度が低い）。
function listZipEntryNames(zipPath) {
  try {
    // unzip -l: エントリ一覧をテキストで取得（Length/Date/Time/Name形式）
    const out = execFileSync('unzip', ['-l', zipPath], { encoding: 'utf8', timeout: 10000 });
    const names = [];
    for (const rawLine of out.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      if (/^Archive:/.test(line)) continue; // アーカイブ名行
      if (/^-+(\s+-+)?$/.test(line)) continue; // 区切り線（---------  -------）
      if (/^Length\s+Date\s+Time\s+Name$/i.test(line)) continue; // ヘッダ行
      // データ行: "<size> <date> <time> <name...>" 形式。先頭3トークンを除いた残りがName列
      // （合計行 "48708   3 files" は3トークンしかなく本パターンにマッチしないため自然に除外される）
      const m = line.match(/^\d+\s+\S+\s+\S+\s+(.+)$/);
      if (m) names.push(m[1].trim());
    }
    return names;
  } catch {
    // unzip不在 or 実行失敗 → zlibでCentral Directoryを解析
    const zip = parseZip(zipPath);
    return zip.entries.map((e) => e.name);
  }
}

// ZIP内エントリの中身をテキスト(utf8)として取得する。見つからない場合はnullを返す。
function readZipEntryText(zipPath, entryName) {
  try {
    // unzip -p: 指定エントリの中身を標準出力にそのまま展開
    return execFileSync('unzip', ['-p', zipPath, entryName], {
      encoding: 'utf8',
      timeout: 10000,
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch {
    // unzip不在 or 実行失敗（エントリ不在含む）→ zlibフォールバックで手動展開
    try {
      const zip = parseZip(zipPath);
      const data = extractZipEntryData(zip, entryName);
      return data ? data.toString('utf8') : null;
    } catch {
      return null;
    }
  }
}

// ============================================================
// sppkg チェック
// ============================================================

const SPPKG_MIN_SIZE = 40 * 1024; // 40KB。正常ビルド(47474 bytes実測)と壊れたビルド(--ship無し、4KB前後)の境界値

// sppkgファイルの品質チェック（(1)サイズ (2)JSバンドル存在）
function checkSppkg(filePath) {
  const checks = [];

  // (1) ファイルサイズチェック: --ship無しビルドは中身が空でサイズが小さくなる
  try {
    const size = statSync(filePath).size;
    const sizeOk = size >= SPPKG_MIN_SIZE;
    checks.push({
      name: 'file_size',
      pass: sizeOk,
      detail: `${size} bytes (${sizeOk ? '>=' : '<'} 40KB)`,
    });
  } catch (e) {
    checks.push({ name: 'file_size', pass: false, detail: `サイズ取得失敗: ${e.message}` });
  }

  // (2) JSバンドル存在チェック: ZIP内に.jsファイルが1つも無ければビルド異常
  try {
    const names = listZipEntryNames(filePath);
    const hasJs = names.some((n) => n.toLowerCase().endsWith('.js'));
    checks.push({
      name: 'js_bundle',
      pass: hasJs,
      detail: hasJs ? `JSファイル検出（全${names.length}エントリ中）` : 'JSファイル未検出',
    });
  } catch (e) {
    // ZIP解析不能 → 検査不能としてFAIL扱い（安全側）
    checks.push({ name: 'js_bundle', pass: false, detail: `ZIP解析失敗: ${e.message}` });
  }

  return { file: filePath, type: 'sppkg', pass: checks.every((c) => c.pass), checks };
}

// ============================================================
// pptx チェック（WCAGコントラスト）
// ============================================================

const WCAG_AA_RATIO = 4.5; // WCAG AA基準（通常テキストサイズ）

// テーマXMLから色名→色値のマッピングを抽出する（srgbClr / sysClr 両対応）。
// 色名(lt1/dk1等)は親要素名、色値は子要素の属性値として出現するため、
// 親子関係を同時に捕捉するパターンを使用する。
const COLOR_PATTERN =
  /<a:(lt1|lt2|dk1|dk2|accent[1-6]|hlink|folHlink)>\s*<a:(?:srgbClr\s+val|sysClr[^>]*lastClr)="([0-9A-Fa-f]{6})"/g;

// テーマ色マッピング + 背景色候補 + 前景色候補を抽出する
function extractThemeColors(xml) {
  const colorMap = {};
  for (const m of xml.matchAll(COLOR_PATTERN)) {
    colorMap[m[1]] = m[2].toUpperCase();
  }
  // 背景色候補: lt1(通常白系), lt2
  const bgColors = [colorMap.lt1, colorMap.lt2].filter(Boolean);
  // 前景色候補: dk1/dk2(通常黒系) + accent1-6 + ハイパーリンク色
  const fgColors = [
    colorMap.dk1,
    colorMap.dk2,
    ...Object.entries(colorMap)
      .filter(([k]) => /^accent|^hlink|^folHlink/.test(k))
      .map(([, v]) => v),
  ].filter(Boolean);
  return { colorMap, bgColors, fgColors };
}

// テーマ配色（背景 x 前景の全組合せ）のWCAGコントラスト比をチェックする
function checkThemeContrast(xml) {
  const { bgColors, fgColors } = extractThemeColors(xml);
  if (bgColors.length === 0 || fgColors.length === 0) {
    return { name: 'theme_contrast', pass: false, detail: 'テーマ色（lt1/dk1等）を抽出できませんでした' };
  }
  const lowPairs = [];
  for (const fg of fgColors) {
    for (const bg of bgColors) {
      const ratio = contrastRatio(fg, bg);
      if (ratio < WCAG_AA_RATIO) lowPairs.push(`#${fg} on #${bg} = ${ratio.toFixed(2)}:1`);
    }
  }
  return {
    name: 'theme_contrast',
    pass: lowPairs.length === 0,
    detail:
      lowPairs.length === 0
        ? `テーマ配色OK（前景${fgColors.length}色 x 背景${bgColors.length}色、WCAG AA 4.5:1以上）`
        : `低コントラスト検出(${lowPairs.length}件): ${lowPairs.slice(0, 5).join(', ')}${
            lowPairs.length > 5 ? ` 他${lowPairs.length - 5}件` : ''
          }`,
  };
}

// スライド個別の直接指定色（srgbClr）とテーマ背景色のコントラスト比をチェックする
function checkSlideContrast(filePath, bgColors) {
  if (bgColors.length === 0) {
    return { name: 'slide_contrast', pass: true, detail: 'テーマ背景色が取得できないためスキップ' };
  }

  // ppt/slides/slideN.xml のみを対象にする（slideLayouts・slideMasters等は対象外）
  let slideNames;
  try {
    slideNames = listZipEntryNames(filePath).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  } catch (e) {
    return { name: 'slide_contrast', pass: false, detail: `スライド一覧取得失敗: ${e.message}` };
  }
  if (slideNames.length === 0) {
    return { name: 'slide_contrast', pass: true, detail: 'スライドファイルが見つかりません' };
  }

  const SLIDE_COLOR_PATTERN = /<a:srgbClr\s+val="([0-9A-Fa-f]{6})"/g;
  const lowPairs = new Set();
  let checkedCount = 0;

  for (const slideName of slideNames) {
    let xml;
    try {
      xml = readZipEntryText(filePath, slideName);
    } catch {
      continue; // 個別スライド読み取り失敗はスキップ（他スライドは継続検査）
    }
    if (!xml) continue;
    for (const m of xml.matchAll(SLIDE_COLOR_PATTERN)) {
      const color = m[1].toUpperCase();
      checkedCount++;
      for (const bg of bgColors) {
        const ratio = contrastRatio(color, bg);
        if (ratio < WCAG_AA_RATIO) lowPairs.add(`${slideName}:#${color} on #${bg} = ${ratio.toFixed(2)}:1`);
      }
    }
  }

  const pairArr = [...lowPairs];
  return {
    name: 'slide_contrast',
    pass: pairArr.length === 0,
    detail:
      pairArr.length === 0
        ? `スライド個別色OK（${slideNames.length}枚, ${checkedCount}色検査）`
        : `低コントラスト検出(${pairArr.length}件): ${pairArr.slice(0, 5).join(', ')}${
            pairArr.length > 5 ? ` 他${pairArr.length - 5}件` : ''
          }`,
  };
}

// pptxファイルの品質チェック（テーマ配色 + スライド個別色のWCAGコントラスト）
function checkPptx(filePath) {
  const checks = [];

  let themeXml;
  try {
    themeXml = readZipEntryText(filePath, 'ppt/theme/theme1.xml');
  } catch (e) {
    checks.push({ name: 'theme_contrast', pass: false, detail: `theme1.xml読取失敗: ${e.message}` });
    checks.push({ name: 'slide_contrast', pass: false, detail: 'テーマ色未取得のためスキップ' });
    return { file: filePath, type: 'pptx', pass: false, checks };
  }

  if (!themeXml) {
    checks.push({ name: 'theme_contrast', pass: false, detail: 'ppt/theme/theme1.xmlが見つかりません' });
    checks.push({ name: 'slide_contrast', pass: false, detail: 'テーマ色未取得のためスキップ' });
    return { file: filePath, type: 'pptx', pass: false, checks };
  }

  let bgColors = [];
  try {
    checks.push(checkThemeContrast(themeXml));
    bgColors = extractThemeColors(themeXml).bgColors;
  } catch (e) {
    checks.push({ name: 'theme_contrast', pass: false, detail: `テーマ色解析失敗: ${e.message}` });
  }

  try {
    checks.push(checkSlideContrast(filePath, bgColors));
  } catch (e) {
    checks.push({ name: 'slide_contrast', pass: false, detail: `スライド色解析失敗: ${e.message}` });
  }

  return { file: filePath, type: 'pptx', pass: checks.every((c) => c.pass), checks };
}

// ============================================================
// 画像 チェック（ログイン画面誤格納検知、v1: ファイル名ヒューリスティック）
// ============================================================
// 2026-07-04 品質事故対応: ログイン画面のスクショを顧客共有ドライブに誤格納した事案を受けて追加。
// v1はファイル名からの推定のみ（画像内容のOCR/解析は行わない）。将来的な精度向上はv2以降で検討。

// ログイン画面を示唆するキーワードのパターン（ファイル名判定用。英語/日本語両対応）
const LOGIN_PATTERN = /login|signin|sign.in|ログイン|auth|認証|password|パスワード/i;

// 画像サイズがこれ未満の場合、プレースホルダや壊れた画像の疑いとして警告する
const IMAGE_MIN_SIZE = 5000; // 5KB

// 対応する画像拡張子（小文字統一。extname()側で小文字化済みの値と比較する）
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.bmp', '.gif'];

// 画像ファイルの品質チェック（(1)ファイル名のログイン関連キーワード (2)極端に小さいファイルサイズ）
function checkImage(filePath) {
  const checks = [];

  // (1) ファイル名にログイン関連キーワードが含まれるか
  //     顧客共有ドライブへの誤格納防止のため、ファイル名からログイン画面らしさを推定する
  const name = basename(filePath).toLowerCase();
  const suspicious = LOGIN_PATTERN.test(name);
  checks.push({
    name: 'login_filename',
    pass: !suspicious,
    detail: suspicious
      ? `ファイル名にログイン関連キーワードを検出: "${name}" — ログイン画面のスクショではないか確認してください`
      : 'ファイル名にログイン関連キーワードなし',
  });

  // (2) ファイルサイズチェック: 極端に小さい画像はプレースホルダや壊れた画像の可能性がある
  try {
    const size = statSync(filePath).size;
    const sizeOk = size >= IMAGE_MIN_SIZE;
    checks.push({
      name: 'image_size',
      pass: sizeOk,
      detail: sizeOk
        ? `画像サイズ: ${(size / 1024).toFixed(1)}KB`
        : `画像サイズが極端に小さい (${(size / 1024).toFixed(1)}KB) — プレースホルダや壊れた画像の可能性`,
    });
  } catch (e) {
    // サイズ取得不能 → 検査不能としてFAIL扱い（安全側、sppkgのfile_sizeチェックと同じ方針）
    checks.push({ name: 'image_size', pass: false, detail: `サイズ取得失敗: ${e.message}` });
  }

  return { file: filePath, type: 'image', pass: checks.every((c) => c.pass), checks };
}

// ============================================================
// メイン処理
// ============================================================

function main() {
  const filePath = process.argv[2];

  // 引数未指定 → 使用方法を表示して終了（JSON出力なし）
  if (!filePath) {
    console.error('Usage: node deliverable-check.mjs <file-path>');
    process.exit(2);
  }

  // ファイル不在チェック（最優先。拡張子判定より先に行う）
  if (!existsSync(filePath)) {
    console.log(
      JSON.stringify({
        file: filePath,
        type: 'unknown',
        pass: false,
        checks: [{ name: 'file_exists', pass: false, detail: 'ファイルが存在しません' }],
      })
    );
    process.exit(2);
  }

  const ext = extname(filePath).toLowerCase();
  let result;

  try {
    if (ext === '.sppkg') {
      result = checkSppkg(filePath);
    } else if (ext === '.pptx') {
      result = checkPptx(filePath);
    } else if (IMAGE_EXTS.includes(ext)) {
      // 画像ファイル(png/jpg/jpeg/bmp/gif) → ログイン画面誤格納検知チェック
      result = checkImage(filePath);
    } else {
      // 未対応形式 → チェック対象外としてブロックしない（exit 2で「判定対象外」を明示）
      console.log(JSON.stringify({ file: filePath, type: 'unsupported', pass: true, checks: [] }));
      process.exit(2);
    }
  } catch (e) {
    // 想定外の例外 → 安全側（FAIL扱い）で出力してexit 1
    console.log(
      JSON.stringify({
        file: filePath,
        type: ext === '.sppkg' ? 'sppkg' : ext === '.pptx' ? 'pptx' : IMAGE_EXTS.includes(ext) ? 'image' : 'unknown',
        pass: false,
        checks: [{ name: 'unexpected_error', pass: false, detail: `予期しないエラー: ${e.message}` }],
      })
    );
    process.exit(1);
  }

  console.log(JSON.stringify(result));

  // 検証監査ログ: 全検証結果をJSONLに記録（スキップには使わない、監査証跡のみ）
  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const auditPath = `${homeDir}/.claude/deliverable-audit.jsonl`;
    const hash = createHash('sha256').update(readFileSync(filePath)).digest('hex');
    appendFileSync(auditPath, JSON.stringify({
      ts: new Date().toISOString(),
      sha256: hash,
      file: filePath,
      type: result.type,
      pass: result.pass,
      checks: result.checks.map(c => c.name + ':' + (c.pass ? 'PASS' : 'FAIL'))
    }) + '\n');
  } catch { /* 監査ログ記録失敗でも検証結果は変わらない */ }

  process.exit(result.pass ? 0 : 1);
}

main();
