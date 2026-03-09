#!/bin/bash
# ===========================================
# PostToolUse Auto-Lint Hook
# ===========================================
#
# Write/Edit 操作後に自動でlinterを実行し、
# 高速フィードバックを提供する。
#
# Harness Engineering原則:
#   "フィードバックは分単位ではなくミリ秒単位で"
#   モデルが書いたコードを即座にlinterで検証し、
#   壊れたコードが蓄積する前に修正させる。
#
# 注意:
#   tsc --noEmit / cargo check はプロジェクト全体を検査するため
#   大規模プロジェクトでは数秒〜数十秒かかる場合がある。
#   速度が問題になる場合は該当ケースをコメントアウトすること。
#
# 使い方:
#   Claude Code の settings.json に以下を追加:
#
#   "hooks": {
#     "PostToolUse": [
#       {
#         "matcher": "Write|Edit",
#         "command": "bash /path/to/hooks/post-tool-lint.sh \"$TOOL_INPUT_FILE_PATH\""
#       }
#     ]
#   }
#
# 対応linter:
#   - TypeScript: tsc --noEmit（プロジェクト全体の型チェック）
#   - JavaScript: eslint（単一ファイル）
#   - Python: ruff check（高速）、フォールバック: mypy
#   - Rust: cargo check（プロジェクト全体）
#   - Go: go vet（カレントパッケージ）
#
# ts/tsx では eslint を実行しない（tsc で型チェック優先。
# eslint も必要な場合は ts|tsx ケースに追加すること）。
#
# 未インストールのlinterはスキップ（エラーにしない）

set -euo pipefail

FILE_PATH="${1:-}"

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# ファイルが存在しない場合（削除後のフック起動等）
if [ ! -f "$FILE_PATH" ]; then
    exit 0
fi

# --- 共通関数 ---

# 親ディレクトリを辿り、指定ファイルのいずれかが存在するディレクトリを返す
# Usage: find_project_root "$FILE_PATH" tsconfig.json
#        find_project_root "$FILE_PATH" .eslintrc.json .eslintrc.js eslint.config.js eslint.config.mjs
find_project_root() {
    local dir="$1"
    shift
    while [ "$dir" != "/" ] && [ -n "$dir" ]; do
        dir="$(dirname "$dir")"
        for marker in "$@"; do
            if [ -f "$dir/$marker" ]; then
                echo "$dir"
                return 0
            fi
        done
    done
    return 1
}

# node_modules/.bin のコマンドを優先し、なければ npx にフォールバック
resolve_node_bin() {
    local project_dir="$1" cmd="$2"
    if [ -x "$project_dir/node_modules/.bin/$cmd" ]; then
        echo "$project_dir/node_modules/.bin/$cmd"
    elif command -v npx &>/dev/null; then
        echo "npx $cmd"
    else
        return 1
    fi
}

# --- メイン処理 ---

EXT="${FILE_PATH##*.}"
RESULT=""
EXIT_CODE=0

case "$EXT" in
    ts|tsx)
        # TypeScript: tsc で型チェック（プロジェクト全体。大規模PJでは遅い場合あり）
        PROJECT_DIR=$(find_project_root "$FILE_PATH" tsconfig.json) || true
        if [ -n "$PROJECT_DIR" ]; then
            TSC=$(resolve_node_bin "$PROJECT_DIR" tsc) || true
            if [ -n "$TSC" ]; then
                RESULT=$(cd "$PROJECT_DIR" && $TSC --noEmit --pretty 2>&1 | head -20) || EXIT_CODE=$?
            fi
        fi
        ;;
    js|jsx|mjs|cjs)
        # JavaScript: eslint（単一ファイルチェック）
        PROJECT_DIR=$(find_project_root "$FILE_PATH" .eslintrc.json .eslintrc.js eslint.config.js eslint.config.mjs) || true
        if [ -n "$PROJECT_DIR" ]; then
            ESLINT=$(resolve_node_bin "$PROJECT_DIR" eslint) || true
            if [ -n "$ESLINT" ]; then
                RESULT=$(cd "$PROJECT_DIR" && $ESLINT "$FILE_PATH" --no-error-on-unmatched-pattern 2>&1 | head -20) || EXIT_CODE=$?
            fi
        fi
        ;;
    py)
        # Python: ruff check（高速）
        if command -v ruff &>/dev/null; then
            RESULT=$(ruff check "$FILE_PATH" 2>&1 | head -20) || EXIT_CODE=$?
        elif command -v mypy &>/dev/null; then
            RESULT=$(mypy "$FILE_PATH" --no-error-summary 2>&1 | head -20) || EXIT_CODE=$?
        fi
        ;;
    rs)
        # Rust: cargo check（プロジェクト全体。大規模PJでは遅い場合あり）
        PROJECT_DIR=$(find_project_root "$FILE_PATH" Cargo.toml) || true
        if [ -n "$PROJECT_DIR" ]; then
            RESULT=$(cd "$PROJECT_DIR" && cargo check --message-format=short 2>&1 | head -20) || EXIT_CODE=$?
        fi
        ;;
    go)
        # Go: go vet（カレントパッケージのみ）
        if command -v go &>/dev/null; then
            DIR="$(dirname "$FILE_PATH")"
            RESULT=$(cd "$DIR" && go vet . 2>&1 | head -20) || EXIT_CODE=$?
        fi
        ;;
esac

# 結果出力（エラーがある場合のみ）
if [ $EXIT_CODE -ne 0 ] && [ -n "$RESULT" ]; then
    echo "--- PostToolUse Lint Results ---"
    echo "$RESULT"
    echo "--- End Lint Results ---"
    # exit 0 で返す（フック自体は失敗させない）
    # エラー情報をstdoutで返すことでエージェントに伝わる
fi

exit 0
