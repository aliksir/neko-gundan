#!/usr/bin/env node
// テスト用納品物サンプルデータ生成スクリプト
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { dirname } from 'node:path';

// 最小ZIP構造を生成する
function createMinimalZip(entries) {
  const bufs = [];
  const cdEntries = [];
  let offset = 0;
  for (const { name, content } of entries) {
    const nameB = Buffer.from(name);
    const compressed = content.length > 0 ? deflateRawSync(content) : Buffer.alloc(0);
    const method = content.length > 0 ? 8 : 0;
    // ローカルファイルヘッダ
    const lh = Buffer.alloc(30 + nameB.length);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(method, 8);
    lh.writeUInt32LE(compressed.length, 18);
    lh.writeUInt32LE(content.length, 22);
    lh.writeUInt16LE(nameB.length, 26);
    nameB.copy(lh, 30);
    bufs.push(lh, compressed);
    cdEntries.push({ name: nameB, offset, compSize: compressed.length, uncSize: content.length, method });
    offset += lh.length + compressed.length;
  }
  // セントラルディレクトリ
  const cdStart = offset;
  for (const e of cdEntries) {
    const cd = Buffer.alloc(46 + e.name.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(e.method, 10);
    cd.writeUInt32LE(e.compSize, 20);
    cd.writeUInt32LE(e.uncSize, 24);
    cd.writeUInt16LE(e.name.length, 28);
    cd.writeUInt32LE(e.offset, 42);
    e.name.copy(cd, 46);
    bufs.push(cd);
    offset += cd.length;
  }
  // EOCD
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(cdEntries.length, 8);
  eocd.writeUInt16LE(cdEntries.length, 10);
  eocd.writeUInt32LE(offset - cdStart, 12);
  eocd.writeUInt32LE(cdStart, 16);
  bufs.push(eocd);
  return Buffer.concat(bufs);
}

const dir = dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
mkdirSync(dir, { recursive: true });

// 空sppkg（サイズFAIL想定、1KB以下）
const empty = createMinimalZip([{ name: 'empty.txt', content: Buffer.from('') }]);
writeFileSync(`${dir}/test-empty.sppkg`, empty);

// 正常sppkg（PASS想定、50KB+JSバンドル。ランダムデータで圧縮率を下げる）
import { randomBytes } from 'node:crypto';
const js = randomBytes(60000);
const normal = createMinimalZip([
  { name: 'solution/bundle.js', content: js },
  { name: 'manifest.json', content: Buffer.from('{"version":"1.0"}') }
]);
writeFileSync(`${dir}/test-normal.sppkg`, normal);

// ログイン画面スクショ（ファイル名検出テスト用）
writeFileSync(`${dir}/login-screen.png`, Buffer.alloc(10000, 0xFF));

// 正常画像（非ログイン）
writeFileSync(`${dir}/report-chart.png`, Buffer.alloc(20000, 0xAA));

console.log(`test-empty.sppkg: ${empty.length} bytes`);
console.log(`test-normal.sppkg: ${normal.length} bytes`);
console.log(`login-screen.png: 10000 bytes`);
console.log(`report-chart.png: 20000 bytes`);
console.log('テストデータ生成完了');
