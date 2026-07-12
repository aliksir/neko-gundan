#!/bin/bash
# 猫軍団エージェント監視スクリプト
# tmux右ペインで常駐し、エージェントの処理状況をリアルタイム表示する

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEAMS_DIR="$HOME/.claude/teams"
TASKS_DIR="$HOME/.claude/tasks"
STATUS_JSON="$BASE_DIR/status/agent-status.json"
DASHBOARD="$BASE_DIR/status/dashboard.md"
WHITEBOARD_DIR="${WHITEBOARD_DIR:-whiteboard}"

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

render() {
    clear
    local now
    now=$(date '+%Y-%m-%d %H:%M:%S')

    echo -e "${BOLD}🐱 猫軍団モニター${NC}  ${DIM}${now}${NC}"
    echo -e "${DIM}────────────────────────────────────${NC}"

    # === アクティブチーム ===
    local has_team=false
    if [ -d "$TEAMS_DIR" ]; then
        for team_dir in "$TEAMS_DIR"/*/; do
            [ -d "$team_dir" ] || continue
            local config="$team_dir/config.json"
            [ -f "$config" ] || continue
            has_team=true

            local team_name
            team_name=$(basename "$team_dir")
            echo -e "\n${CYAN}${BOLD}■ チーム: ${team_name}${NC}"

            # メンバー表示
            if command -v jq &>/dev/null; then
                local member_count
                member_count=$(jq -r '.members | length' "$config" 2>/dev/null)
                if [ "$member_count" -gt 0 ] 2>/dev/null; then
                    echo -e "  ${BOLD}メンバー:${NC}"
                    jq -r '.members[] | "  \(.name) (\(.agentType // "unknown"))"' "$config" 2>/dev/null | while read -r line; do
                        echo -e "    ${GREEN}●${NC} $line"
                    done
                fi
            else
                echo -e "  ${DIM}(jqなし - 詳細表示不可)${NC}"
            fi

            # タスク表示
            local task_dir="$TASKS_DIR/$team_name"
            if [ -d "$task_dir" ]; then
                local pending=0 in_progress=0 completed=0
                for task_file in "$task_dir"/*.json; do
                    [ -f "$task_file" ] || continue
                    if command -v jq &>/dev/null; then
                        local status
                        status=$(jq -r '.status // "unknown"' "$task_file" 2>/dev/null)
                        case "$status" in
                            pending) pending=$((pending + 1)) ;;
                            in_progress) in_progress=$((in_progress + 1)) ;;
                            completed) completed=$((completed + 1)) ;;
                        esac
                    fi
                done
                echo -e "  ${BOLD}タスク:${NC} ${YELLOW}待機${NC}=${pending}  ${GREEN}実行中${NC}=${in_progress}  ${DIM}完了${NC}=${completed}"

                # 実行中タスクの詳細
                for task_file in "$task_dir"/*.json; do
                    [ -f "$task_file" ] || continue
                    if command -v jq &>/dev/null; then
                        local status subject owner active_form
                        status=$(jq -r '.status // ""' "$task_file" 2>/dev/null)
                        if [ "$status" = "in_progress" ]; then
                            subject=$(jq -r '.subject // ""' "$task_file" 2>/dev/null)
                            owner=$(jq -r '.owner // "未割当"' "$task_file" 2>/dev/null)
                            active_form=$(jq -r '.activeForm // ""' "$task_file" 2>/dev/null)
                            local display="${active_form:-$subject}"
                            echo -e "    ${GREEN}▸${NC} ${owner}: ${display}"
                        fi
                    fi
                done
            fi
        done
    fi

    if [ "$has_team" = false ]; then
        echo -e "\n${DIM}  チーム未編成 — 待機中${NC}"
    fi

    # === Stallアラート ===
    echo -e "\n${DIM}────────────────────────────────────${NC}"
    echo -e "${BOLD}⚠️  Stallアラート${NC}"
    local alerts_dir="$BASE_DIR/status/alerts"
    if [ -d "$alerts_dir" ]; then
        local alert_files
        alert_files=$(ls -t "$alerts_dir"/*.json 2>/dev/null)
        if [ -n "$alert_files" ]; then
            local stall_found=false
            for alert_file in $alert_files; do
                [ -f "$alert_file" ] || continue
                local alert_type=""
                if command -v jq &>/dev/null; then
                    alert_type=$(jq -r '.type // empty' "$alert_file" 2>/dev/null)
                else
                    alert_type=$(grep -o '"type"[[:space:]]*:[[:space:]]*"[^"]*"' "$alert_file" 2>/dev/null | sed 's/.*"\([^"]*\)"$/\1/')
                fi
                if [ "$alert_type" = "stall" ]; then
                    stall_found=true
                    local agent task_id stalled_since
                    if command -v jq &>/dev/null; then
                        agent=$(jq -r '.agent // "?"' "$alert_file" 2>/dev/null)
                        task_id=$(jq -r '.task_id // "?"' "$alert_file" 2>/dev/null)
                        stalled_since=$(jq -r '.stalled_since // "?"' "$alert_file" 2>/dev/null)
                    else
                        agent=$(grep -o '"agent"[[:space:]]*:[[:space:]]*"[^"]*"' "$alert_file" | sed 's/.*"\([^"]*\)"$/\1/')
                        task_id=$(grep -o '"task_id"[[:space:]]*:[[:space:]]*"[^"]*"' "$alert_file" | sed 's/.*"\([^"]*\)"$/\1/')
                        stalled_since=$(grep -o '"stalled_since"[[:space:]]*:[[:space:]]*"[^"]*"' "$alert_file" | sed 's/.*"\([^"]*\)"$/\1/')
                    fi
                    echo -e "  ${RED}⚠️ STALL:${NC} ${agent} - ${task_id} (${stalled_since})"
                fi
            done
            if [ "$stall_found" = false ]; then
                echo -e "  ${GREEN}✅ stallなし${NC}"
            fi
        else
            echo -e "  ${GREEN}✅ stallなし${NC}"
        fi
    else
        echo -e "  ${GREEN}✅ stallなし${NC}"
    fi

    # === Concurrency表示 ===
    local concurrency_conf="$BASE_DIR/config/concurrency.json"
    if [ -f "$concurrency_conf" ] && command -v jq &>/dev/null; then
        local max_total max_genba
        max_total=$(jq -r '.max_concurrent_agents // 5' "$concurrency_conf" 2>/dev/null)
        max_genba=$(jq -r '.per_role_limits."genba-neko" // 4' "$concurrency_conf" 2>/dev/null)
        local current_total current_genba
        current_total=$(jq -r '.concurrency.current // 1' "$STATUS_JSON" 2>/dev/null)
        current_genba=$(jq -r '[.agents[] | select(.role == "genba-neko")] | length' "$STATUS_JSON" 2>/dev/null)
        echo -e "\n${BOLD}🔢 Concurrency${NC}"
        echo -e "  エージェント: ${CYAN}${current_total:-1}/${max_total:-5}${NC}  (genba-neko: ${CYAN}${current_genba:-0}/${max_genba:-4}${NC})"
    elif [ -f "$STATUS_JSON" ]; then
        local cur max
        cur=$(grep -o '"current":[[:space:]]*[0-9]*' "$STATUS_JSON" 2>/dev/null | grep -o '[0-9]*$')
        max=$(grep -o '"max":[[:space:]]*[0-9]*' "$STATUS_JSON" 2>/dev/null | grep -o '[0-9]*$')
        echo -e "\n${BOLD}🔢 Concurrency${NC}"
        echo -e "  エージェント: ${CYAN}${cur:-?}/${max:-?}${NC}"
    fi

    # === ダッシュボード要約 ===
    echo -e "\n${DIM}────────────────────────────────────${NC}"
    echo -e "${BOLD}📋 最終作戦${NC}"
    if [ -f "$DASHBOARD" ]; then
        # 作戦名と状態を抽出
        local op_name op_status last_update
        op_name=$(grep '^## 作戦名:' "$DASHBOARD" 2>/dev/null | sed 's/^## 作戦名: //')
        op_status=$(grep '^\*\*状態\*\*:' "$DASHBOARD" 2>/dev/null | sed 's/\*\*状態\*\*: //')
        last_update=$(grep '^> 最終更新:' "$DASHBOARD" 2>/dev/null | sed 's/^> 最終更新: //')
        echo -e "  ${op_name:-不明}"
        echo -e "  ${op_status:-不明}"
        echo -e "  ${DIM}更新: ${last_update:-不明}${NC}"
    else
        echo -e "  ${DIM}ダッシュボードなし${NC}"
    fi

    # === ホワイトボード ===
    local wb_files
    wb_files=$(ls ${WHITEBOARD_DIR}/whiteboard-*.md 2>/dev/null)
    if [ -n "$wb_files" ]; then
        echo -e "\n${BOLD}📝 ホワイトボード${NC}"
        for wb in $wb_files; do
            local wb_name
            wb_name=$(basename "$wb" .md | sed 's/whiteboard-//')
            echo -e "  ${CYAN}●${NC} ${wb_name}"
        done
    fi

    # === Token使用量 ===
    local token_dir="$BASE_DIR/status/token-usage"
    if [ -d "$token_dir" ]; then
        local latest_token
        latest_token=$(ls -t "$token_dir"/*.json 2>/dev/null | head -1)
        if [ -n "$latest_token" ]; then
            echo -e "\n${BOLD}🪙 Token使用量${NC}"
            if command -v jq &>/dev/null; then
                local op_name elapsed_min
                op_name=$(jq -r '.operation // "不明"' "$latest_token" 2>/dev/null)
                elapsed_min=$(jq -r 'if .started_at then ((now - (.started_at | fromdate)) / 60 | floor | tostring) + "分" else "不明" end' "$latest_token" 2>/dev/null)
                echo -e "  作戦: ${CYAN}${op_name}${NC}"
                echo -e "  経過: ${DIM}${elapsed_min}${NC}"
            else
                local op_name
                op_name=$(grep -o '"operation":[[:space:]]*"[^"]*"' "$latest_token" 2>/dev/null | sed 's/.*: *"\(.*\)"/\1/')
                echo -e "  作戦: ${CYAN}${op_name:-不明}${NC}"
            fi
        fi
    fi

    echo -e "\n${DIM}────────────────────────────────────${NC}"
    echo -e "${DIM}  3秒ごとに自動更新 | Ctrl+C で終了${NC}"
}

# ダッシュボード自動更新（30秒間隔）
DASHBOARD_INTERVAL=30
DASHBOARD_COUNTER=0
UPDATE_DASHBOARD_SCRIPT="$SCRIPT_DIR/update-dashboard.sh"

update_dashboard_if_due() {
    DASHBOARD_COUNTER=$((DASHBOARD_COUNTER + 3))  # 3秒ごとのループ
    if [ "$DASHBOARD_COUNTER" -ge "$DASHBOARD_INTERVAL" ]; then
        DASHBOARD_COUNTER=0
        if [ -x "$UPDATE_DASHBOARD_SCRIPT" ] || [ -f "$UPDATE_DASHBOARD_SCRIPT" ]; then
            # アクティブチーム名を自動検出
            if [ -d "$TEAMS_DIR" ]; then
                for team_dir in "$TEAMS_DIR"/*/; do
                    [ -d "$team_dir" ] || continue
                    local_team=$(basename "$team_dir")
                    bash "$UPDATE_DASHBOARD_SCRIPT" "$local_team" 2>/dev/null || true
                    break  # 最初のアクティブチームのみ
                done
            fi
        fi
    fi
}

# メインループ
while true; do
    render
    update_dashboard_if_due
    sleep 3
done
