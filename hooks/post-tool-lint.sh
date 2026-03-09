#!/bin/bash
# ===========================================
# PostToolUse Auto-Lint Hook
# ===========================================
#
# Write/Edit 操作後に自動でlinterを実行し、
# ミリ秒レベルのフィードバックを提供する。
#
# Harness Engineering原則:
#   "フィードバックは分単位ではなくミリ秒単位で"
#   モデルが書いたコードを即座にlinterで検証し、
#   壊れたコードが蓄積する前に修正させる。
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
#   - TypeScript/JavaScript: tsc --noEmit, eslint
#   - Python: ruff check, mypy
#   - Rust: cargo check
#   - Go: go vet
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

EXT="${FILE_PATH##*.}"
RESULT=""
EXIT_CODE=0

case "$EXT" in
    ts|tsx)
        # TypeScript: tsc で型チェック（プロジェクトルートで実行）
        PROJECT_DIR="$FILE_PATH"
        while [ "$PROJECT_DIR" != "/" ]; do
            PROJECT_DIR="$(dirname "$PROJECT_DIR")"
            if [ -f "$PROJECT_DIR/tsconfig.json" ]; then
                break
            fi
        done
        if [ -f "$PROJECT_DIR/tsconfig.json" ] && command -v npx &>/dev/null; then
            RESULT=$(cd "$PROJECT_DIR" && npx tsc --noEmit --pretty 2>&1 | head -20) || EXIT_CODE=$?
        fi
        ;;
    js|jsx|mjs|cjs)
        # JavaScript: eslint（存在する場合）
        if command -v npx &>/dev/null; then
            PROJECT_DIR="$FILE_PATH"
            while [ "$PROJECT_DIR" != "/" ]; do
                PROJECT_DIR="$(dirname "$PROJECT_DIR")"
                if [ -f "$PROJECT_DIR/.eslintrc.json" ] || [ -f "$PROJECT_DIR/.eslintrc.js" ] || [ -f "$PROJECT_DIR/eslint.config.js" ] || [ -f "$PROJECT_DIR/eslint.config.mjs" ]; then
                    RESULT=$(cd "$PROJECT_DIR" && npx eslint "$FILE_PATH" --no-error-on-unmatched-pattern 2>&1 | head -20) || EXIT_CODE=$?
                    break
                fi
            done
        fi
        ;;
    py)
        # Python: ruff check（高速）
        if command -v ruff &>/dev/null; then
            RESULT=$(ruff check "$FILE_PATH" 2>&1 | head -20) || EXIT_CODE=$?
        elif command -v python &>/dev/null && python -c "import mypy" 2>/dev/null; then
            RESULT=$(python -m mypy "$FILE_PATH" --no-error-summary 2>&1 | head -20) || EXIT_CODE=$?
        fi
        ;;
    rs)
        # Rust: cargo check
        PROJECT_DIR="$FILE_PATH"
        while [ "$PROJECT_DIR" != "/" ]; do
            PROJECT_DIR="$(dirname "$PROJECT_DIR")"
            if [ -f "$PROJECT_DIR/Cargo.toml" ]; then
                RESULT=$(cd "$PROJECT_DIR" && cargo check --message-format=short 2>&1 | head -20) || EXIT_CODE=$?
                break
            fi
        done
        ;;
    go)
        # Go: go vet
        if command -v go &>/dev/null; then
            DIR="$(dirname "$FILE_PATH")"
            RESULT=$(cd "$DIR" && go vet ./... 2>&1 | head -20) || EXIT_CODE=$?
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
