#!/bin/bash
# stall-detector.sh - タスク停止検出スクリプト
# in_progress状態のタスクが一定時間更新されない場合にアラートを出力する

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_DIR="${BASE_DIR}/config"
ALERTS_DIR="${BASE_DIR}/status/alerts"
TASKS_BASE_DIR="${HOME}/.claude/tasks"

# アラートディレクトリの作成
mkdir -p "${ALERTS_DIR}"

# 設定読み込み（jqオプショナル）
load_config() {
  local config_file="${CONFIG_DIR}/thresholds.json"
  if [ ! -f "${config_file}" ]; then
    echo "WARNING: ${config_file} が見つかりません。デフォルト値を使用します。" >&2
    THRESHOLD_SEC=300
    CHECK_INTERVAL_SEC=30
    return
  fi

  if command -v jq >/dev/null 2>&1; then
    THRESHOLD_SEC=$(jq -r '.stall_detection.threshold_sec' "${config_file}" 2>/dev/null || echo "300")
    CHECK_INTERVAL_SEC=$(jq -r '.stall_detection.check_interval_sec' "${config_file}" 2>/dev/null || echo "30")
  else
    # jqなし: grep/sedでパース
    THRESHOLD_SEC=$(grep -o '"threshold_sec": *[0-9]*' "${config_file}" | sed 's/[^0-9]//g' | head -1)
    CHECK_INTERVAL_SEC=$(grep -o '"check_interval_sec": *[0-9]*' "${config_file}" | sed 's/[^0-9]//g' | head -1)
    THRESHOLD_SEC="${THRESHOLD_SEC:-300}"
    CHECK_INTERVAL_SEC="${CHECK_INTERVAL_SEC:-30}"
  fi
}

# ISO8601タイムスタンプ生成
iso8601_now() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# アラートファイル生成
generate_alert() {
  local task_id="$1"
  local agent="$2"
  local stalled_since="$3"
  local detected_at
  detected_at=$(iso8601_now)

  local alert_file="${ALERTS_DIR}/stall-${task_id}-$(date +%Y%m%d%H%M%S).json"

  cat > "${alert_file}" <<EOF
{
  "type": "stall",
  "task_id": "${task_id}",
  "agent": "${agent}",
  "stalled_since": "${stalled_since}",
  "detected_at": "${detected_at}"
}
EOF

  echo "[STALL DETECTED] task_id=${task_id} agent=${agent} stalled_since=${stalled_since}" >&2
  echo "アラートファイル出力: ${alert_file}" >&2

  # lifecycle.sh on_stall 連携
  local lifecycle_script="${BASE_DIR}/hooks/lifecycle.sh"
  if [ -f "${lifecycle_script}" ]; then
    bash "${lifecycle_script}" on_stall "${agent}" --task-id "${task_id}" 2>/dev/null || true
  fi
}

# タスクファイルのstall検出
check_task_file() {
  local task_file="$1"
  local now
  now=$(date +%s)

  # ファイルのmtime取得
  local mtime
  if stat -c %Y "${task_file}" >/dev/null 2>&1; then
    mtime=$(stat -c %Y "${task_file}")
  elif stat -f %m "${task_file}" >/dev/null 2>&1; then
    # macOS互換
    mtime=$(stat -f %m "${task_file}")
  else
    return
  fi

  local elapsed=$(( now - mtime ))

  # in_progress状態チェック（jqオプショナル）
  local status=""
  local task_id=""
  local agent=""

  if command -v jq >/dev/null 2>&1; then
    status=$(jq -r '.status // empty' "${task_file}" 2>/dev/null)
    task_id=$(jq -r '.id // .task_id // empty' "${task_file}" 2>/dev/null)
    agent=$(jq -r '.owner // .agent // empty' "${task_file}" 2>/dev/null)
  else
    status=$(grep -o '"status": *"[^"]*"' "${task_file}" | sed 's/.*": *"\([^"]*\)".*/\1/' | head -1)
    task_id=$(grep -o '"id": *"[^"]*"\|"task_id": *"[^"]*"' "${task_file}" | sed 's/.*": *"\([^"]*\)".*/\1/' | head -1)
    agent=$(grep -o '"owner": *"[^"]*"\|"agent": *"[^"]*"' "${task_file}" | sed 's/.*": *"\([^"]*\)".*/\1/' | head -1)
  fi

  if [ "${status}" = "in_progress" ] && [ "${elapsed}" -ge "${THRESHOLD_SEC}" ]; then
    local stalled_since
    stalled_since=$(date -u -d "@${mtime}" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || \
                    date -u -r "${mtime}" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || \
                    iso8601_now)

    task_id="${task_id:-$(basename "${task_file}" .json)}"
    agent="${agent:-unknown}"

    generate_alert "${task_id}" "${agent}" "${stalled_since}"
  fi
}

# チーム別タスクファイルのスキャン
scan_tasks() {
  local team="$1"
  local tasks_dir

  if [ -n "${team}" ]; then
    tasks_dir="${TASKS_BASE_DIR}/${team}"
  else
    tasks_dir="${TASKS_BASE_DIR}"
  fi

  if [ ! -d "${tasks_dir}" ]; then
    return
  fi

  while IFS= read -r -d '' task_file; do
    check_task_file "${task_file}"
  done < <(find "${tasks_dir}" -name "*.json" -type f -print0 2>/dev/null)
}

# メインループ
main() {
  local team="${1:-}"  # 引数でチーム名を指定可能

  load_config

  echo "[stall-detector] 起動しました。threshold=${THRESHOLD_SEC}秒, interval=${CHECK_INTERVAL_SEC}秒" >&2

  while true; do
    scan_tasks "${team}"
    sleep "${CHECK_INTERVAL_SEC}"
  done
}

# 単発実行モード（--once オプション）
if [ "${1}" = "--once" ]; then
  load_config
  scan_tasks "${2:-}"
  exit 0
fi

main "$@"
