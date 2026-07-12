#!/bin/bash
# ===========================================
# artifact-check.sh テストスクリプト
# ===========================================
# 使い方:
#   bash test/artifact-check.test.sh
#
# 終了コード:
#   0: 全テストPASS
#   1: 1件以上FAIL

set -uo pipefail

PASS=0
FAIL=0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_SCRIPT="${SCRIPT_DIR}/../scripts/artifact-check.sh"

# アサーション: 終了コードの検証
assert_exit() {
    local actual="$1"
    local expected="$2"
    local label="$3"
    if [ "$actual" = "$expected" ]; then
        PASS=$((PASS + 1))
        echo "  PASS: ${label}"
    else
        FAIL=$((FAIL + 1))
        echo "  FAIL: ${label} (expected exit ${expected}, got ${actual})"
    fi
}

# --- セットアップ: 一時ディレクトリ作成 ---
TMP_DIR="$(mktemp -d)"
PROJECT="test-project"

# 成果物ディレクトリと必須ファイルを作成するヘルパー
setup_full() {
    local work_dir="$1"
    mkdir -p \
        "${work_dir}/plans" \
        "${work_dir}/designs" \
        "${work_dir}/test-plan" \
        "${work_dir}/audit" \
        "${work_dir}/logs" \
        "${work_dir}/result" \
        "${work_dir}/metrics" \
        "${work_dir}/checklist"

    touch "${work_dir}/plans/20260614_${PROJECT}.md"
    touch "${work_dir}/designs/20260614_${PROJECT}.md"
    touch "${work_dir}/test-plan/20260614_${PROJECT}.md"
    touch "${work_dir}/audit/20260614_${PROJECT}.md"
    touch "${work_dir}/logs/20260614_${PROJECT}.md"
    touch "${work_dir}/result/20260614_${PROJECT}.md"
    touch "${work_dir}/metrics/${PROJECT}_metrics.md"
    touch "${work_dir}/checklist/20260614_${PROJECT}.md"
}

echo "=== artifact-check.sh テスト開始 ==="
echo ""

# ============================================================
# テスト1: 全成果物あり → exit 0
# ============================================================
echo "--- テスト1: 全成果物あり ---"
WORK1="${TMP_DIR}/test1"
setup_full "${WORK1}"

bash "${TARGET_SCRIPT}" "${PROJECT}" "${WORK1}" > /dev/null 2>&1
RESULT=$?
assert_exit "${RESULT}" "0" "全成果物あり → exit 0"

echo ""

# ============================================================
# テスト2: plans/ 不足 → exit 1
# ============================================================
echo "--- テスト2: plans/ 不足 ---"
WORK2="${TMP_DIR}/test2"
setup_full "${WORK2}"
rm -f "${WORK2}/plans/20260614_${PROJECT}.md"

bash "${TARGET_SCRIPT}" "${PROJECT}" "${WORK2}" > /dev/null 2>&1
RESULT=$?
assert_exit "${RESULT}" "1" "plans/ 不足 → exit 1"

echo ""

# ============================================================
# テスト3: NEKO_WORK_DIR 経由で work-dir を指定 → exit 0
# ============================================================
echo "--- テスト3: NEKO_WORK_DIR 経由 ---"
WORK3="${TMP_DIR}/test3"
setup_full "${WORK3}"

# $2 を渡さず NEKO_WORK_DIR 環境変数のみで動作確認
NEKO_WORK_DIR="${WORK3}" bash "${TARGET_SCRIPT}" "${PROJECT}" > /dev/null 2>&1
RESULT=$?
assert_exit "${RESULT}" "0" "NEKO_WORK_DIR 経由で正しくパス指定 → exit 0"

echo ""

# ============================================================
# テスト4: 古いファイル（8日前）は検出しない → exit 1
# ============================================================
echo "--- テスト4: 古いファイル（8日前）はmtimeフィルタで除外 ---"
WORK4="${TMP_DIR}/test4"
setup_full "${WORK4}"

# 全ファイルのタイムスタンプを8日前に設定
find "${WORK4}" -name "*.md" -exec touch -d "8 days ago" {} \;

bash "${TARGET_SCRIPT}" "${PROJECT}" "${WORK4}" > /dev/null 2>&1
RESULT=$?
assert_exit "${RESULT}" "1" "古いファイル（8日前）→ mtime除外で exit 1"

echo ""

# ============================================================
# テスト5: metrics先頭トークンフォールバック
# ============================================================
echo "--- テスト5: metricsの先頭トークンフォールバック ---"
WORK5="${TMP_DIR}/test5"
setup_full "${WORK5}"

# metrics名がPJ名と異なるケース: タスク名=test-project、metrics=test_metrics.md
rm -f "${WORK5}/metrics/${PROJECT}_metrics.md"
touch "${WORK5}/metrics/test_metrics.md"

bash "${TARGET_SCRIPT}" "${PROJECT}" "${WORK5}" > /dev/null 2>&1
RESULT=$?
assert_exit "${RESULT}" "0" "先頭トークンフォールバックで metrics 検出 → exit 0"

echo ""

# --- クリーンアップ ---
rm -rf "${TMP_DIR}"

# --- 結果表示 ---
echo "==================================="
echo "Results: ${PASS} passed, ${FAIL} failed"
echo "==================================="

[ "${FAIL}" -eq 0 ] || exit 1
