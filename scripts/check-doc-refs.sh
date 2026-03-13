#!/usr/bin/env bash
# check-doc-refs.sh — ドキュメント参照整合性チェック
# リポジトリ内のマークダウンファイルから参照されているファイルパスが実在するか検証する。
# 使い方: bash scripts/check-doc-refs.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

errors=0
checked=0

echo "=== ドキュメント参照整合性チェック ==="
echo "リポジトリ: $REPO_ROOT"
echo ""

# 1. マークダウン内のバッククォート付きファイルパス参照を検出
echo "--- ファイル参照チェック ---"
while IFS= read -r line; do
    file="${line%%:*}"
    # バッククォート内のパス参照を抽出 (modules/, agents/, rules/, docs/, scripts/ で始まるもの)
    # ディレクトリ名のみ（末尾/）や拡張子なしの参照はスキップ
    refs=$(echo "$line" | sed 's/[^`]*`\(\(modules\|agents\|rules\|docs\|scripts\)\/[^`]*\)`/\n\1\n/g' | grep -E '^(modules|agents|rules|docs|scripts)/.+\.' | grep -v '/$' || true)
    for ref in $refs; do
        checked=$((checked + 1))
        if [ ! -f "$REPO_ROOT/$ref" ]; then
            echo "  MISSING: $ref (referenced in $file)"
            errors=$((errors + 1))
        fi
    done
done < <(grep -rn '`\(modules/\|agents/\|rules/\|docs/\|scripts/\)[^`]*`' --include='*.md' --exclude-dir='archive' --exclude-dir='_deleted' .)

# 2. SSOTの一貫性チェック: completion-gates.md内のゲートコア項目数
echo ""
echo "--- ゲート定義チェック ---"
core_count=$(grep -c '^| [0-9]' rules/completion-gates.md 2>/dev/null || echo "0")
echo "  completion-gates.md コア項目: 約${core_count}行のゲート項目"

# 3. config.yamlのモジュールがmodules/に存在するか
echo ""
echo "--- config.yaml モジュール存在チェック ---"
while IFS= read -r key; do
    # config keyのアンダースコアをハイフンに変換してファイル名を推定
    modfile="modules/$(echo "$key" | tr '_' '-').md"
    checked=$((checked + 1))
    if [ ! -f "$REPO_ROOT/$modfile" ]; then
        echo "  MISSING: $modfile (config key: $key)"
        errors=$((errors + 1))
    fi
done < <(grep -E '^\s+[a-z_]+:\s*true' neko-gundan.config.yaml | sed 's/#.*//' | sed 's/:.*//' | tr -d ' ' | grep -v '^$')

echo ""
echo "=== 結果: ${checked}件チェック、${errors}件の問題 ==="

if [ "$errors" -gt 0 ]; then
    echo "FAIL: 参照切れが${errors}件あります"
    exit 1
else
    echo "PASS: 全参照が有効です"
    exit 0
fi
