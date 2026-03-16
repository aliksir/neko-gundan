#!/bin/bash
# 猫軍団 ライフサイクルフック統合スクリプト
# サブコマンド: after_create, before_run, after_run, on_stall, before_remove
#
# 使い方:
#   bash lifecycle.sh <subcommand> <agent_name> [options]
#
# 例:
#   bash lifecycle.sh after_create genba-neko-1 --role genba-neko --team my-team
#   bash lifecycle.sh before_run genba-neko-1
#   bash lifecycle.sh after_run genba-neko-1 --task-id 3
#   bash lifecycle.sh on_stall genba-neko-1 --task-id 3
#   bash lifecycle.sh before_remove genba-neko-1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$BASE_DIR/config/lifecycle.json"
STATUS_JSON="$BASE_DIR/status/agent-status.json"
LOG_FILE="$BASE_DIR/status/lifecycle-log.jsonl"
STALL_LOG="$BASE_DIR/status/stall-log.md"
CONCURRENCY_FILE="$BASE_DIR/config/concurrency.json"
TOKEN_TRACKER="$BASE_DIR/scripts/token-tracker.sh"

# --- ユーティリティ ---

timestamp() {
    date -u '+%Y-%m-%dT%H:%M:%SZ'
}

log_event() {
    local event="$1"
    local agent="$2"
    shift 2
    local extra="$*"

    local entry
    entry=$(cat <<EOF
{"event":"${event}","agent":"${agent}","timestamp":"$(timestamp)"${extra:+,${extra}}}
EOF
)
    echo "$entry" >> "$LOG_FILE"
}

ensure_status_json() {
    if [ ! -f "$STATUS_JSON" ]; then
        cat > "$STATUS_JSON" <<'EOF'
{
  "agents": [],
  "concurrency": { "current": 0, "max": 5 },
  "last_updated": ""
}
EOF
    fi
}

get_config_value() {
    local key="$1"
    local default="$2"
    if [ -f "$CONFIG_FILE" ] && command -v jq &>/dev/null; then
        jq -r "${key} // \"${default}\"" "$CONFIG_FILE" 2>/dev/null || echo "$default"
    else
        echo "$default"
    fi
}

# --- サブコマンド ---

# after_create: エージェント登録
cmd_after_create() {
    local agent="$1"
    shift
    local role=""
    local team=""

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --role) role="$2"; shift 2 ;;
            --team) team="$2"; shift 2 ;;
            *) shift ;;
        esac
    done

    ensure_status_json

    if command -v jq &>/dev/null; then
        local new_agent
        new_agent=$(jq -n \
            --arg name "$agent" \
            --arg role "${role:-unknown}" \
            --arg team "${team:-}" \
            --arg created "$(timestamp)" \
            '{name: $name, role: $role, team: $team, created_at: $created, status: "active"}')

        local updated
        updated=$(jq --argjson agent "$new_agent" \
            '.agents += [$agent]
             | .concurrency.current = (.agents | length)
             | .counts = (reduce .agents[] as $a ({"oyakata-neko":0,"shigoto-neko":0,"genba-neko":0,"kurouto-neko":0}; .[$a.role] += 1))
             | .last_updated = (now | todate)' \
            "$STATUS_JSON" 2>/dev/null)

        if [ -n "$updated" ]; then
            echo "$updated" > "$STATUS_JSON"
        fi
    fi

    # token-tracker にエージェント追加（存在する場合）
    if [ -x "$TOKEN_TRACKER" ]; then
        bash "$TOKEN_TRACKER" add-agent "$agent" 2>/dev/null || true
    fi

    # ホワイトボード自動初期化（チーム名がある場合）
    if [ -n "${team}" ]; then
        local wb_file="$BASE_DIR/status/whiteboard-${team}.md"
        if [ ! -f "$wb_file" ]; then
            cat > "$wb_file" <<WBEOF
# ホワイトボード: ${team}

> 自動生成: lifecycle.sh after_create ($(timestamp))

## 共有知識

_まだ何もないっす_

## Findings

### ${agent} (${role:-unknown})

_作業開始前_

## Cross-Cutting Observations

_なし_
WBEOF
            echo "[lifecycle] ホワイトボード初期化: ${wb_file}"
        else
            # 既存ホワイトボードに新エージェントのセクションを追加
            if ! grep -q "### ${agent}" "$wb_file" 2>/dev/null; then
                cat >> "$wb_file" <<WBEOF

### ${agent} (${role:-unknown})

_作業開始前_
WBEOF
                echo "[lifecycle] ホワイトボードにセクション追加: ${agent}"
            fi
        fi
    fi

    log_event "after_create" "$agent" "\"role\":\"${role:-unknown}\",\"team\":\"${team:-}\""
    echo "[lifecycle] after_create: ${agent} 登録完了"
}

# before_run: concurrency上限チェック（合計 + role別）
cmd_before_run() {
    local agent="$1"
    shift
    local role=""

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --role) role="$2"; shift 2 ;;
            *) shift ;;
        esac
    done

    if [ -f "$CONCURRENCY_FILE" ] && command -v jq &>/dev/null; then
        local max_total current_total
        max_total=$(jq -r '.max_concurrent_agents // 5' "$CONCURRENCY_FILE" 2>/dev/null)

        ensure_status_json
        current_total=$(jq -r '.agents | length' "$STATUS_JSON" 2>/dev/null || echo "0")

        # 合計上限チェック
        if [ "$current_total" -ge "$max_total" ] 2>/dev/null; then
            log_event "before_run" "$agent" "\"blocked\":true,\"reason\":\"total_concurrency_limit\",\"current\":${current_total},\"max\":${max_total}"
            echo "[lifecycle] before_run: BLOCKED - 合計concurrency上限到達 (${current_total}/${max_total})" >&2
            exit 1
        fi

        # role別上限チェック
        if [ -n "$role" ]; then
            local max_role current_role
            max_role=$(jq -r ".per_role_limits.\"${role}\" // 99" "$CONCURRENCY_FILE" 2>/dev/null)
            current_role=$(jq -r --arg r "$role" '[.agents[] | select(.role == $r)] | length' "$STATUS_JSON" 2>/dev/null || echo "0")

            if [ "$current_role" -ge "$max_role" ] 2>/dev/null; then
                log_event "before_run" "$agent" "\"blocked\":true,\"reason\":\"role_concurrency_limit\",\"role\":\"${role}\",\"current\":${current_role},\"max\":${max_role}"
                echo "[lifecycle] before_run: BLOCKED - ${role}のconcurrency上限到達 (${current_role}/${max_role})" >&2
                exit 1
            fi
        fi
    fi

    log_event "before_run" "$agent"
    echo "[lifecycle] before_run: ${agent} 実行許可"
}

# after_run: エージェント除去 + 完了カウント更新
cmd_after_run() {
    local agent="$1"
    shift
    local task_id=""

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --task-id) task_id="$2"; shift 2 ;;
            *) shift ;;
        esac
    done

    ensure_status_json

    if command -v jq &>/dev/null; then
        local updated
        updated=$(jq --arg name "$agent" \
            'del(.agents[] | select(.name == $name))
             | .concurrency.current = (.agents | length)
             | .counts = (reduce .agents[] as $a ({"oyakata-neko":0,"shigoto-neko":0,"genba-neko":0,"kurouto-neko":0}; .[$a.role] += 1))
             | .last_updated = (now | todate)' \
            "$STATUS_JSON" 2>/dev/null)

        if [ -n "$updated" ]; then
            echo "$updated" > "$STATUS_JSON"
        fi
    fi

    log_event "after_run" "$agent" "\"task_id\":\"${task_id:-}\""
    echo "[lifecycle] after_run: ${agent} 除去完了"
}

# on_stall: stallアラート生成 + stall-log記録 + 自動復旧判断
cmd_on_stall() {
    local agent="$1"
    shift
    local task_id=""

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --task-id) task_id="$2"; shift 2 ;;
            *) shift ;;
        esac
    done

    local now
    now=$(timestamp)

    # stallアラートファイル生成
    local alert_dir="$BASE_DIR/status/alerts"
    mkdir -p "$alert_dir"
    local alert_file="$alert_dir/stall-${agent}-$(date '+%Y%m%d%H%M%S').json"
    cat > "$alert_file" <<EOF
{
  "type": "stall",
  "task_id": "${task_id:-unknown}",
  "agent": "${agent}",
  "stalled_since": "${now}",
  "detected_at": "${now}"
}
EOF

    # stall-log.md に記録
    if [ ! -f "$STALL_LOG" ]; then
        echo "# Stall Log" > "$STALL_LOG"
        echo "" >> "$STALL_LOG"
        echo "| 時刻 | エージェント | タスクID | 状態 |" >> "$STALL_LOG"
        echo "|------|------------|---------|------|" >> "$STALL_LOG"
    fi
    echo "| ${now} | ${agent} | ${task_id:-unknown} | detected |" >> "$STALL_LOG"

    # 自動復旧判断
    local auto_recovery
    auto_recovery=$(get_config_value ".stall_auto_recovery" "true")
    local max_attempts
    max_attempts=$(get_config_value ".max_recovery_attempts" "5")

    log_event "on_stall" "$agent" "\"task_id\":\"${task_id:-}\",\"auto_recovery\":${auto_recovery},\"max_attempts\":${max_attempts}"
    echo "[lifecycle] on_stall: ${agent} stallアラート生成 (auto_recovery=${auto_recovery})"

    if [ "$auto_recovery" = "true" ]; then
        echo "[lifecycle] 自動復旧推奨: shutdown_request → respawn (上限${max_attempts}回)"
    fi
}

# before_remove: worktreeクリーンアップ確認
cmd_before_remove() {
    local agent="$1"

    local auto_cleanup
    auto_cleanup=$(get_config_value ".auto_cleanup_worktree" "true")

    # worktreeの存在チェック
    local worktree_dir=""
    if [ -d "$HOME/.claude/worktrees" ]; then
        worktree_dir=$(find "$HOME/.claude/worktrees" -maxdepth 1 -name "*${agent}*" -type d 2>/dev/null | head -1 || true)
    fi

    if [ -n "$worktree_dir" ]; then
        if [ "$auto_cleanup" = "true" ]; then
            echo "[lifecycle] before_remove: worktree検出 (${worktree_dir}) - 自動クリーンアップ対象"
            # NOTE: auto_cleanup_worktree=true でもここでは削除しない（ログ記録のみ）。
            # 実際の削除は呼び出し元（orchestrator）が git worktree remove で行う。
            # この設計は意図的 — lifecycle.sh は副作用を持たない観測レイヤー。
            log_event "before_remove" "$agent" "\"worktree\":\"${worktree_dir}\",\"auto_cleanup\":true"
        else
            echo "[lifecycle] before_remove: worktree検出 (${worktree_dir}) - 手動クリーンアップ必要"
            log_event "before_remove" "$agent" "\"worktree\":\"${worktree_dir}\",\"auto_cleanup\":false"
        fi
    else
        log_event "before_remove" "$agent" "\"worktree\":null"
        echo "[lifecycle] before_remove: ${agent} worktreeなし、クリーン"
    fi
}

# gc: ゾンビエージェント回収（アクティブチームに存在しないエージェントを除去）
cmd_gc() {
    ensure_status_json

    if ! command -v jq &>/dev/null; then
        echo "[lifecycle] gc: jqが必要です" >&2
        exit 1
    fi

    local teams_dir="$HOME/.claude/teams"

    # アクティブチームのメンバーをJSON配列として収集
    local active_json="[]"
    if [ -d "$teams_dir" ]; then
        for team_dir in "$teams_dir"/*/; do
            [ -d "$team_dir" ] || continue
            local config="$team_dir/config.json"
            [ -f "$config" ] || continue
            local members
            members=$(jq -c '[.members[].name]' "$config" 2>/dev/null || echo "[]")
            active_json=$(echo "$active_json" | jq --argjson m "$members" '. + $m' 2>/dev/null)
        done
    fi

    # ゾンビ一覧を検出（agent-status にいるがアクティブチームにいない）
    local zombies
    zombies=$(jq -r --argjson active "$active_json" \
        '.agents[] | select(.name as $n | ($active | index($n)) | not) | .name' \
        "$STATUS_JSON" 2>/dev/null || true)

    if [ -z "$zombies" ]; then
        echo "[lifecycle] gc: ゾンビなし、クリーン"
        return
    fi

    # ゾンビを表示
    local removed=0
    for z in $zombies; do
        echo "[lifecycle] gc: ゾンビ検出 → ${z}"
        log_event "gc" "$z" "\"reason\":\"zombie\""
        removed=$((removed + 1))
    done

    # 一括削除（1回のjq操作）
    local updated
    updated=$(jq --argjson active "$active_json" \
        '.agents = [.agents[] | select(.name as $n | ($active | index($n)))]
         | .concurrency.current = (.agents | length)
         | .counts = (reduce .agents[] as $a ({"oyakata-neko":0,"shigoto-neko":0,"genba-neko":0,"kurouto-neko":0}; .[$a.role] += 1))
         | .last_updated = (now | todate)' \
        "$STATUS_JSON" 2>/dev/null)

    if [ -n "$updated" ]; then
        echo "$updated" > "$STATUS_JSON"
    fi

    echo "[lifecycle] gc: ${removed}体のゾンビを除去完了"
}

# --- メイン ---

SUBCOMMAND="${1:-}"

# gcは引数不要
if [ "$SUBCOMMAND" = "gc" ]; then
    cmd_gc
    exit 0
fi

if [ $# -lt 2 ]; then
    echo "Usage: $0 <subcommand> <agent_name> [options]" >&2
    echo "Subcommands: after_create, before_run, after_run, on_stall, before_remove, gc" >&2
    exit 1
fi

AGENT_NAME="$2"
shift 2

case "$SUBCOMMAND" in
    after_create)  cmd_after_create "$AGENT_NAME" "$@" ;;
    before_run)    cmd_before_run "$AGENT_NAME" "$@" ;;
    after_run)     cmd_after_run "$AGENT_NAME" "$@" ;;
    on_stall)      cmd_on_stall "$AGENT_NAME" "$@" ;;
    before_remove) cmd_before_remove "$AGENT_NAME" "$@" ;;
    *)
        echo "Unknown subcommand: $SUBCOMMAND" >&2
        echo "Valid: after_create, before_run, after_run, on_stall, before_remove, gc" >&2
        exit 1
        ;;
esac
