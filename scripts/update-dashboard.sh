#!/bin/bash
# 猫軍団 ダッシュボード自動生成スクリプト
# agent-status.json、タスクファイル、アラート、concurrency、token、PoW、lifecycle-logを一括表示
#
# 使い方:
#   bash update-dashboard.sh <team_name> [operation_name]
#
# 例:
#   bash update-dashboard.sh symphony-p1 "Symphony Phase 1"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STATUS_JSON="$BASE_DIR/status/agent-status.json"
DASHBOARD="$BASE_DIR/status/dashboard.md"
ALERTS_DIR="$BASE_DIR/status/alerts"
CONCURRENCY_FILE="$BASE_DIR/config/concurrency.json"
TOKEN_DIR="$BASE_DIR/status/token-usage"
POW_DIR="$BASE_DIR/status/proof-of-work"
LIFECYCLE_LOG="$BASE_DIR/status/lifecycle-log.jsonl"
TEAMS_DIR="$HOME/.claude/teams"
TASKS_DIR="$HOME/.claude/tasks"

TEAM_NAME="${1:-}"
OPERATION_NAME="${2:-}"

if [ -z "$TEAM_NAME" ]; then
    echo "Usage: $0 <team_name> [operation_name]" >&2
    exit 1
fi

NOW=$(date '+%Y-%m-%d %H:%M:%S')

# --- ヘッダー ---

cat > "$DASHBOARD" <<EOF
# 猫軍団ダッシュボード

> 最終更新: ${NOW}
> 自動生成: update-dashboard.sh

## 作戦名: ${OPERATION_NAME:-${TEAM_NAME}}

EOF

# --- エージェント一覧セクション ---

echo "## エージェント一覧" >> "$DASHBOARD"
echo "" >> "$DASHBOARD"

if [ -f "$STATUS_JSON" ] && command -v jq &>/dev/null; then
    local_count=$(jq -r '.agents | length' "$STATUS_JSON" 2>/dev/null || echo "0")
    if [ "$local_count" -gt 0 ] 2>/dev/null; then
        echo "| 名前 | 役割 | チーム | 状態 | 登録時刻 |" >> "$DASHBOARD"
        echo "|------|------|--------|------|---------|" >> "$DASHBOARD"
        jq -r '.agents[] | "| \(.name) | \(.role // "-") | \(.team // "-") | \(.status // "-") | \(.created_at // "-") |"' "$STATUS_JSON" 2>/dev/null >> "$DASHBOARD"
    else
        echo "_アクティブエージェントなし_" >> "$DASHBOARD"
    fi
else
    # チーム設定ファイルから読み取り
    CONFIG="$TEAMS_DIR/$TEAM_NAME/config.json"
    if [ -f "$CONFIG" ] && command -v jq &>/dev/null; then
        echo "| 名前 | タイプ |" >> "$DASHBOARD"
        echo "|------|--------|" >> "$DASHBOARD"
        jq -r '.members[] | "| \(.name) | \(.agentType // "-") |"' "$CONFIG" 2>/dev/null >> "$DASHBOARD"
    else
        echo "_エージェント情報なし_" >> "$DASHBOARD"
    fi
fi
echo "" >> "$DASHBOARD"

# --- タスク進捗セクション ---

echo "## タスク進捗" >> "$DASHBOARD"
echo "" >> "$DASHBOARD"

TASK_DIR="$TASKS_DIR/$TEAM_NAME"
if [ -d "$TASK_DIR" ] && command -v jq &>/dev/null; then
    pending=0; in_progress=0; completed=0; total=0

    for task_file in "$TASK_DIR"/*.json; do
        [ -f "$task_file" ] || continue
        total=$((total + 1))
        status=$(jq -r '.status // "unknown"' "$task_file" 2>/dev/null)
        case "$status" in
            pending) pending=$((pending + 1)) ;;
            in_progress) in_progress=$((in_progress + 1)) ;;
            completed) completed=$((completed + 1)) ;;
        esac
    done

    echo "**合計**: ${total} | **待機**: ${pending} | **実行中**: ${in_progress} | **完了**: ${completed}" >> "$DASHBOARD"
    echo "" >> "$DASHBOARD"

    # 実行中タスクの詳細
    if [ "$in_progress" -gt 0 ]; then
        echo "### 実行中タスク" >> "$DASHBOARD"
        echo "" >> "$DASHBOARD"
        echo "| ID | タスク | 担当 |" >> "$DASHBOARD"
        echo "|----|--------|------|" >> "$DASHBOARD"
        for task_file in "$TASK_DIR"/*.json; do
            [ -f "$task_file" ] || continue
            status=$(jq -r '.status // ""' "$task_file" 2>/dev/null)
            if [ "$status" = "in_progress" ]; then
                tid=$(basename "$task_file" .json)
                subject=$(jq -r '.subject // "-"' "$task_file" 2>/dev/null)
                owner=$(jq -r '.owner // "未割当"' "$task_file" 2>/dev/null)
                echo "| ${tid} | ${subject} | ${owner} |" >> "$DASHBOARD"
            fi
        done
        echo "" >> "$DASHBOARD"
    fi

    # 待機中タスクの一覧
    if [ "$pending" -gt 0 ]; then
        echo "### 待機中タスク" >> "$DASHBOARD"
        echo "" >> "$DASHBOARD"
        echo "| ID | タスク | ブロック |" >> "$DASHBOARD"
        echo "|----|--------|---------|" >> "$DASHBOARD"
        for task_file in "$TASK_DIR"/*.json; do
            [ -f "$task_file" ] || continue
            status=$(jq -r '.status // ""' "$task_file" 2>/dev/null)
            if [ "$status" = "pending" ]; then
                tid=$(basename "$task_file" .json)
                subject=$(jq -r '.subject // "-"' "$task_file" 2>/dev/null)
                blocked=$(jq -r '.blockedBy // [] | join(", ")' "$task_file" 2>/dev/null)
                echo "| ${tid} | ${subject} | ${blocked:-なし} |" >> "$DASHBOARD"
            fi
        done
        echo "" >> "$DASHBOARD"
    fi
else
    echo "_タスク情報なし_" >> "$DASHBOARD"
    echo "" >> "$DASHBOARD"
fi

# --- Stallセクション ---

echo "## Stallアラート" >> "$DASHBOARD"
echo "" >> "$DASHBOARD"

if [ -d "$ALERTS_DIR" ]; then
    stall_count=0
    stall_output=""
    for alert_file in "$ALERTS_DIR"/*.json; do
        [ -f "$alert_file" ] || continue
        if command -v jq &>/dev/null; then
            alert_type=$(jq -r '.type // ""' "$alert_file" 2>/dev/null)
            if [ "$alert_type" = "stall" ]; then
                stall_count=$((stall_count + 1))
                agent=$(jq -r '.agent // "?"' "$alert_file" 2>/dev/null)
                task_id=$(jq -r '.task_id // "?"' "$alert_file" 2>/dev/null)
                detected=$(jq -r '.detected_at // "?"' "$alert_file" 2>/dev/null)
                stall_output="${stall_output}| ${agent} | ${task_id} | ${detected} |\n"
            fi
        fi
    done

    if [ "$stall_count" -gt 0 ]; then
        echo "| エージェント | タスクID | 検出時刻 |" >> "$DASHBOARD"
        echo "|------------|---------|---------|" >> "$DASHBOARD"
        echo -e "$stall_output" >> "$DASHBOARD"
    else
        echo "_stallなし_" >> "$DASHBOARD"
    fi
else
    echo "_stallなし_" >> "$DASHBOARD"
fi
echo "" >> "$DASHBOARD"

# --- Concurrencyセクション ---

echo "## Concurrency" >> "$DASHBOARD"
echo "" >> "$DASHBOARD"

if [ -f "$CONCURRENCY_FILE" ] && command -v jq &>/dev/null; then
    max_total=$(jq -r '.max_concurrent_agents // 5' "$CONCURRENCY_FILE" 2>/dev/null)
    current=0
    if [ -f "$STATUS_JSON" ]; then
        current=$(jq -r '.agents | length' "$STATUS_JSON" 2>/dev/null || echo "0")
    fi
    echo "**現在/上限**: ${current}/${max_total}" >> "$DASHBOARD"
    echo "" >> "$DASHBOARD"

    # 役割別
    echo "| 役割 | 上限 |" >> "$DASHBOARD"
    echo "|------|------|" >> "$DASHBOARD"
    jq -r '.per_role_limits | to_entries[] | "| \(.key) | \(.value) |"' "$CONCURRENCY_FILE" 2>/dev/null >> "$DASHBOARD"
else
    echo "_concurrency設定なし_" >> "$DASHBOARD"
fi
echo "" >> "$DASHBOARD"

# --- Token使用量セクション ---

echo "## Token使用量" >> "$DASHBOARD"
echo "" >> "$DASHBOARD"

if [ -d "$TOKEN_DIR" ]; then
    latest_token=$(ls -t "$TOKEN_DIR"/*.json 2>/dev/null | head -1 || true)
    if [ -n "$latest_token" ] && [ -f "$latest_token" ] && command -v jq &>/dev/null; then
        op=$(jq -r '.operation // "不明"' "$latest_token" 2>/dev/null)
        started=$(jq -r '.started_at // "不明"' "$latest_token" 2>/dev/null)
        stopped=$(jq -r '.ended_at // "進行中"' "$latest_token" 2>/dev/null)
        echo "| 作戦 | 開始 | 終了 |" >> "$DASHBOARD"
        echo "|------|------|------|" >> "$DASHBOARD"
        echo "| ${op} | ${started} | ${stopped} |" >> "$DASHBOARD"
    else
        echo "_token記録なし_" >> "$DASHBOARD"
    fi
else
    echo "_token記録なし_" >> "$DASHBOARD"
fi
echo "" >> "$DASHBOARD"

# --- Proof of Work セクション ---

echo "## Proof of Work" >> "$DASHBOARD"
echo "" >> "$DASHBOARD"

if [ -d "$POW_DIR" ]; then
    pow_files=$(ls -t "$POW_DIR"/*.json 2>/dev/null | head -5 || true)
    if [ -n "$pow_files" ]; then
        echo "| タスクID | 判定 | テスト | ビルド | レビュー | リグレッション | 時刻 |" >> "$DASHBOARD"
        echo "|---------|------|--------|--------|---------|--------------|------|" >> "$DASHBOARD"
        for pow_file in $pow_files; do
            if command -v jq &>/dev/null; then
                tid=$(jq -r '.task_id // "?"' "$pow_file" 2>/dev/null)
                verdict=$(jq -r '.verdict // "?"' "$pow_file" 2>/dev/null)
                test_r=$(jq -r '.gates.test_pass // "?"' "$pow_file" 2>/dev/null)
                build_r=$(jq -r '.gates.build_success // "?"' "$pow_file" 2>/dev/null)
                review_r=$(jq -r '.gates.review_complete // "?"' "$pow_file" 2>/dev/null)
                regress_r=$(jq -r '.gates.no_regressions // "?"' "$pow_file" 2>/dev/null)
                ts=$(jq -r '.timestamp // "?"' "$pow_file" 2>/dev/null)
                echo "| ${tid} | ${verdict} | ${test_r} | ${build_r} | ${review_r} | ${regress_r} | ${ts} |" >> "$DASHBOARD"
            fi
        done
    else
        echo "_PoW記録なし_" >> "$DASHBOARD"
    fi
else
    echo "_PoW記録なし_" >> "$DASHBOARD"
fi
echo "" >> "$DASHBOARD"

# --- Lifecycle最新イベント ---

echo "## 最新ライフサイクルイベント" >> "$DASHBOARD"
echo "" >> "$DASHBOARD"

if [ -f "$LIFECYCLE_LOG" ]; then
    event_count=$(wc -l < "$LIFECYCLE_LOG" 2>/dev/null || echo "0")
    if [ "$event_count" -gt 0 ] && command -v jq &>/dev/null; then
        echo "| 時刻 | イベント | エージェント |" >> "$DASHBOARD"
        echo "|------|---------|------------|" >> "$DASHBOARD"
        tail -10 "$LIFECYCLE_LOG" | while IFS= read -r line; do
            ts=$(echo "$line" | jq -r '.timestamp // "?"' 2>/dev/null)
            ev=$(echo "$line" | jq -r '.event // "?"' 2>/dev/null)
            ag=$(echo "$line" | jq -r '.agent // "?"' 2>/dev/null)
            echo "| ${ts} | ${ev} | ${ag} |" >> "$DASHBOARD"
        done
    else
        echo "_イベントなし_" >> "$DASHBOARD"
    fi
else
    echo "_ライフサイクルログなし_" >> "$DASHBOARD"
fi
echo "" >> "$DASHBOARD"

# --- フッター ---

echo "---" >> "$DASHBOARD"
echo "_自動生成 by update-dashboard.sh | ${NOW}_" >> "$DASHBOARD"

echo "[dashboard] 更新完了: $DASHBOARD"
