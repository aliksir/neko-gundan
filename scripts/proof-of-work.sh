#!/bin/bash
# 猫軍団 Proof of Work 検証スクリプト
# タスク完了を「主張」ではなく「証拠」で判定する機械的検証ゲート
#
# 使い方:
#   bash proof-of-work.sh <project_dir> [--task-id <id>] [--review-complete] [--output-dir <dir>]
#
# 例:
#   bash proof-of-work.sh /path/to/your-project --task-id task-001
#   bash proof-of-work.sh /path/to/another-project --task-id task-002 --review-complete

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$BASE_DIR/config/proof-of-work.json"
DEFAULT_OUTPUT_DIR="$BASE_DIR/status/proof-of-work"

# --- 引数パース ---

PROJECT_DIR=""
TASK_ID="unknown"
REVIEW_COMPLETE=false
OUTPUT_DIR="$DEFAULT_OUTPUT_DIR"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --task-id) TASK_ID="$2"; shift 2 ;;
        --review-complete) REVIEW_COMPLETE=true; shift ;;
        --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
        -*) echo "Unknown option: $1" >&2; exit 1 ;;
        *) PROJECT_DIR="$1"; shift ;;
    esac
done

if [ -z "$PROJECT_DIR" ]; then
    echo "Usage: $0 <project_dir> [--task-id <id>] [--review-complete]" >&2
    exit 1
fi

if [ ! -d "$PROJECT_DIR" ]; then
    echo "Error: ディレクトリが存在しません: $PROJECT_DIR" >&2
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

# test_pass結果のキャッシュ変数（no_regressionsで参照）
TEST_PASS_STATUS="SKIP"
TEST_PASS_EXIT=0

# --- スタック自動検出 ---

detect_stack() {
    local dir="$1"
    local stack=""

    if [ -f "$dir/package.json" ]; then
        stack="node"
    elif [ -f "$dir/Cargo.toml" ]; then
        stack="rust"
    elif [ -f "$dir/pyproject.toml" ] || [ -f "$dir/setup.py" ] || [ -f "$dir/setup.cfg" ]; then
        stack="python"
    elif [ -f "$dir/requirements.txt" ]; then
        stack="python"
    elif [ -f "$dir/go.mod" ]; then
        stack="go"
    fi

    echo "$stack"
}

# --- テスト存在チェック ---

has_tests() {
    local dir="$1"
    local stack="$2"

    case "$stack" in
        node)
            # package.json に test スクリプトがあるか
            if command -v jq &>/dev/null; then
                local test_script
                test_script=$(jq -r '.scripts.test // ""' "$dir/package.json" 2>/dev/null)
                [ -n "$test_script" ] && [ "$test_script" != "echo \"Error: no test specified\" && exit 1" ]
            else
                grep -q '"test"' "$dir/package.json" 2>/dev/null
            fi
            ;;
        python)
            # tests/ ディレクトリ or test_*.py ファイルがあるか
            [ -d "$dir/tests" ] || [ -d "$dir/test" ] || find "$dir" -maxdepth 3 -name "test_*.py" -o -name "*_test.py" 2>/dev/null | head -1 | grep -q .
            ;;
        rust)
            # src/ 内に #[test] があるか、tests/ があるか
            [ -d "$dir/tests" ] || grep -rq '#\[test\]' "$dir/src" 2>/dev/null
            ;;
        go)
            find "$dir" -maxdepth 3 -name "*_test.go" 2>/dev/null | head -1 | grep -q .
            ;;
        *)
            return 1
            ;;
    esac
}

# --- ビルドコマンド検出 ---

has_build() {
    local dir="$1"
    local stack="$2"

    case "$stack" in
        node)
            if command -v jq &>/dev/null; then
                local build_script
                build_script=$(jq -r '.scripts.build // ""' "$dir/package.json" 2>/dev/null)
                [ -n "$build_script" ]
            else
                grep -q '"build"' "$dir/package.json" 2>/dev/null
            fi
            ;;
        rust)   return 0 ;;  # cargo build は常に可能
        python) return 0 ;;  # py_compile は常に可能
        go)     return 0 ;;  # go build は常に可能
        *)      return 1 ;;
    esac
}

# --- ゲート実行 ---

run_gate() {
    local gate_name="$1"
    local dir="$2"
    local stack="$3"
    local status="SKIP"
    local message=""
    local exit_code=0

    case "$gate_name" in
        test_pass)
            if ! has_tests "$dir" "$stack"; then
                # テストが存在しない場合
                local skip_if_no_tests
                skip_if_no_tests=$(get_config ".skip_if_no_tests" "false")
                if [ "$skip_if_no_tests" = "true" ]; then
                    status="SKIP"
                    message="テストなし（skip_if_no_tests=true）"
                else
                    status="FAIL"
                    message="テストが存在しない（skip_if_no_tests=false）"
                fi
            else
                case "$stack" in
                    node)   cd "$dir" && timeout 600 npm test >/dev/null 2>&1 && status="PASS" || { status="FAIL"; exit_code=$?; } ;;
                    python) cd "$dir" && timeout 600 python -m pytest >/dev/null 2>&1 && status="PASS" || { status="FAIL"; exit_code=$?; } ;;
                    rust)   cd "$dir" && timeout 600 cargo test >/dev/null 2>&1 && status="PASS" || { status="FAIL"; exit_code=$?; } ;;
                    go)     cd "$dir" && timeout 600 go test ./... >/dev/null 2>&1 && status="PASS" || { status="FAIL"; exit_code=$?; } ;;
                esac
                message="exit_code=${exit_code}"
            fi
            # no_regressions ゲート用にテスト結果をキャッシュする
            TEST_PASS_STATUS="$status"
            TEST_PASS_EXIT="$exit_code"
            ;;
        build_success)
            if ! has_build "$dir" "$stack"; then
                status="SKIP"
                message="ビルドコマンドなし"
            else
                case "$stack" in
                    node)   cd "$dir" && npm run build >/dev/null 2>&1 && status="PASS" || { status="FAIL"; exit_code=$?; } ;;
                    python)
                        # .py ファイルのコンパイルチェック
                        local py_errors=0
                        while IFS= read -r pyfile; do
                            python -m py_compile "$pyfile" >/dev/null 2>&1 || py_errors=$((py_errors + 1))
                        done < <(find "$dir" -name "*.py" -not -path "*/venv/*" -not -path "*/.venv/*" -not -path "*/__pycache__/*" 2>/dev/null)
                        if [ "$py_errors" -eq 0 ]; then
                            status="PASS"
                        else
                            status="FAIL"
                            message="${py_errors}ファイルでコンパイルエラー"
                        fi
                        ;;
                    rust)   cd "$dir" && cargo build >/dev/null 2>&1 && status="PASS" || { status="FAIL"; exit_code=$?; } ;;
                    go)     cd "$dir" && go build ./... >/dev/null 2>&1 && status="PASS" || { status="FAIL"; exit_code=$?; } ;;
                esac
                [ -z "$message" ] && message="exit_code=${exit_code}"
            fi
            ;;
        review_complete)
            if [ "$REVIEW_COMPLETE" = true ]; then
                status="PASS"
                message="レビュー完了フラグあり"
            else
                status="FAIL"
                message="レビュー未完了（--review-complete フラグなし）"
            fi
            ;;
        no_regressions)
            # test_pass ゲートの結果を再利用（テストの二重実行を避ける）
            if ! has_tests "$dir" "$stack"; then
                status="SKIP"
                message="テストなし（リグレッション検証不可）"
            else
                status="${TEST_PASS_STATUS:-SKIP}"
                exit_code="${TEST_PASS_EXIT:-0}"
                message="test_pass結果を参照（exit_code=${exit_code}）"
            fi
            ;;
    esac

    echo "${status}|${message}"
}

get_config() {
    local key="$1"
    local default="$2"
    if [ -f "$CONFIG_FILE" ] && command -v jq &>/dev/null; then
        jq -r "${key} // \"${default}\"" "$CONFIG_FILE" 2>/dev/null || echo "$default"
    else
        echo "$default"
    fi
}

# --- メイン処理 ---

STACK=$(detect_stack "$PROJECT_DIR")
NOW=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
DATE_STAMP=$(date '+%Y%m%d-%H%M%S')
RESULT_FILE="$OUTPUT_DIR/${TASK_ID}-${DATE_STAMP}.json"

echo "========================================"
echo " Proof of Work 検証"
echo "========================================"
echo " プロジェクト: $PROJECT_DIR"
echo " スタック: ${STACK:-未検出}"
echo " タスクID: $TASK_ID"
echo " レビュー: $REVIEW_COMPLETE"
echo "========================================"

if [ -z "$STACK" ]; then
    echo "WARNING: スタック自動検出失敗。テスト/ビルドゲートはSKIPになります。" >&2
fi

# 各ゲート実行
GATES=("test_pass" "build_success" "review_complete" "no_regressions")
declare -A RESULTS
ALL_PASS=true
FAIL_LIST=""

for gate in "${GATES[@]}"; do
    echo -n "  [${gate}] ... "
    result=$(run_gate "$gate" "$PROJECT_DIR" "$STACK")
    gate_status="${result%%|*}"
    gate_message="${result#*|}"
    RESULTS[$gate]="$gate_status"

    case "$gate_status" in
        PASS) echo "PASS ($gate_message)" ;;
        FAIL)
            echo "FAIL ($gate_message)"
            ALL_PASS=false
            FAIL_LIST="${FAIL_LIST}${gate}, "
            ;;
        SKIP) echo "SKIP ($gate_message)" ;;
    esac
done

echo "========================================"

# 結果JSON出力
cat > "$RESULT_FILE" <<EOF
{
  "task_id": "${TASK_ID}",
  "project": "${PROJECT_DIR}",
  "stack": "${STACK:-unknown}",
  "timestamp": "${NOW}",
  "review_flag": ${REVIEW_COMPLETE},
  "gates": {
    "test_pass": "${RESULTS[test_pass]}",
    "build_success": "${RESULTS[build_success]}",
    "review_complete": "${RESULTS[review_complete]}",
    "no_regressions": "${RESULTS[no_regressions]}"
  },
  "verdict": "$([ "$ALL_PASS" = true ] && echo "PROOF_VERIFIED" || echo "PROOF_FAILED")",
  "failed_gates": "$(echo "${FAIL_LIST}" | sed 's/, $//')"
}
EOF

echo " 結果: $RESULT_FILE"

# ダッシュボード即時反映
DASHBOARD_SCRIPT="$BASE_DIR/scripts/update-dashboard.sh"
if [ -f "$DASHBOARD_SCRIPT" ]; then
    # アクティブチーム名を自動検出
    TEAMS_DIR="$HOME/.claude/teams"
    if [ -d "$TEAMS_DIR" ]; then
        for team_dir in "$TEAMS_DIR"/*/; do
            [ -d "$team_dir" ] || continue
            team_name=$(basename "$team_dir")
            bash "$DASHBOARD_SCRIPT" "$team_name" >/dev/null 2>&1 || true
            break
        done
    fi
fi

if [ "$ALL_PASS" = true ]; then
    echo ""
    echo " PROOF_VERIFIED - 全ゲート通過！ヨシッ！"
    exit 0
else
    echo ""
    echo " PROOF_FAILED - 失敗ゲート: ${FAIL_LIST%, }"
    exit 1
fi
