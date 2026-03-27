#!/bin/bash
# token-tracker.sh - 作戦のトークン予算追跡スクリプト
# 作業時間プロキシでトークン使用量を推定する
#
# 使い方:
#   bash token-tracker.sh start "作戦名"
#   bash token-tracker.sh stop "作戦名"
#   bash token-tracker.sh status "作戦名"
#   bash token-tracker.sh add-agent "作戦名" "エージェント名"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TOKEN_USAGE_DIR="${BASE_DIR}/status/token-usage"

# ディレクトリ自動作成
mkdir -p "${TOKEN_USAGE_DIR}"

# ISO8601タイムスタンプ生成
iso8601_now() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# Unix秒タイムスタンプ生成
unix_now() {
  date +%s
}

# 作戦ファイルパス取得
get_operation_file() {
  local operation="$1"
  local date_str
  date_str=$(date +%Y%m%d)
  echo "${TOKEN_USAGE_DIR}/${operation}-${date_str}.json"
}

# start: 作戦開始時刻を記録
cmd_start() {
  local operation="$1"
  if [ -z "${operation}" ]; then
    echo "ERROR: 作戦名を指定してください。" >&2
    echo "使い方: $0 start <作戦名>" >&2
    exit 1
  fi

  local file
  file=$(get_operation_file "${operation}")

  if [ -f "${file}" ]; then
    local existing_status
    if command -v jq >/dev/null 2>&1; then
      existing_status=$(jq -r '.status // empty' "${file}" 2>/dev/null)
    else
      existing_status=$(grep -o '"status": *"[^"]*"' "${file}" | sed 's/.*": *"\([^"]*\)".*/\1/' | head -1)
    fi

    if [ "${existing_status}" = "running" ]; then
      echo "WARNING: 作戦 '${operation}' はすでに実行中です。" >&2
      echo "ファイル: ${file}" >&2
      exit 1
    fi
  fi

  local started_at
  started_at=$(iso8601_now)
  local started_unix
  started_unix=$(unix_now)

  cat > "${file}" <<EOF
{
  "operation": "${operation}",
  "status": "running",
  "started_at": "${started_at}",
  "started_unix": ${started_unix},
  "ended_at": null,
  "duration_sec": null,
  "agents": []
}
EOF

  echo "[token-tracker] 作戦 '${operation}' 開始: ${started_at}"
  echo "ファイル: ${file}"
}

# stop: 作戦終了時刻を記録し経過時間を計算
cmd_stop() {
  local operation="$1"
  if [ -z "${operation}" ]; then
    echo "ERROR: 作戦名を指定してください。" >&2
    echo "使い方: $0 stop <作戦名>" >&2
    exit 1
  fi

  local file
  file=$(get_operation_file "${operation}")

  if [ ! -f "${file}" ]; then
    echo "ERROR: 作戦 '${operation}' のファイルが見つかりません。" >&2
    echo "先に 'start' コマンドを実行してください。" >&2
    exit 1
  fi

  local ended_at
  ended_at=$(iso8601_now)
  local ended_unix
  ended_unix=$(unix_now)

  # ファイルを上書きする前に全フィールドを読み取る
  local started_unix started_at_val agents_json
  if command -v jq >/dev/null 2>&1; then
    started_unix=$(jq -r '.started_unix // empty' "${file}" 2>/dev/null)
    started_at_val=$(jq -r '.started_at // empty' "${file}" 2>/dev/null)
    agents_json=$(jq -c '.agents // []' "${file}" 2>/dev/null)
  else
    started_unix=$(grep -o '"started_unix": *[0-9]*' "${file}" | sed 's/[^0-9]//g' | head -1)
    started_at_val=$(grep -o '"started_at": *"[^"]*"' "${file}" | sed 's/.*": *"\([^"]*\)".*/\1/' | head -1)
    agents_json="[]"
  fi

  local duration_sec=$(( ended_unix - ${started_unix:-ended_unix} ))

  # 更新されたJSONを書き出し（ファイル上書きはここで初めて行う）
  cat > "${file}" <<EOF
{
  "operation": "${operation}",
  "status": "completed",
  "started_at": "${started_at_val}",
  "started_unix": ${started_unix:-0},
  "ended_at": "${ended_at}",
  "ended_unix": ${ended_unix},
  "duration_sec": ${duration_sec},
  "agents": ${agents_json}
}
EOF

  echo "[token-tracker] 作戦 '${operation}' 終了: ${ended_at}"
  echo "経過時間: ${duration_sec}秒"
  echo "ファイル: ${file}"
}

# status: 現在の状態を表示
cmd_status() {
  local operation="$1"
  if [ -z "${operation}" ]; then
    echo "=== 全作戦一覧 ==="
    ls "${TOKEN_USAGE_DIR}"/*.json 2>/dev/null || echo "(記録なし)"
    return
  fi

  local file
  file=$(get_operation_file "${operation}")

  if [ ! -f "${file}" ]; then
    echo "ERROR: 作戦 '${operation}' のファイルが見つかりません。" >&2
    exit 1
  fi

  echo "=== 作戦: ${operation} ==="
  cat "${file}"
}

# add-agent: エージェントを作戦に追加
cmd_add_agent() {
  local operation="$1"
  local agent_name="$2"

  if [ -z "${operation}" ] || [ -z "${agent_name}" ]; then
    echo "ERROR: 作戦名とエージェント名を指定してください。" >&2
    echo "使い方: $0 add-agent <作戦名> <エージェント名>" >&2
    exit 1
  fi

  local file
  file=$(get_operation_file "${operation}")

  if [ ! -f "${file}" ]; then
    echo "ERROR: 作戦 '${operation}' のファイルが見つかりません。" >&2
    exit 1
  fi

  local joined_at
  joined_at=$(iso8601_now)

  if command -v jq >/dev/null 2>&1; then
    local tmp_file="${file}.tmp"
    jq --arg name "${agent_name}" --arg joined "${joined_at}" \
      '.agents += [{"name": $name, "joined_at": $joined}]' \
      "${file}" > "${tmp_file}" && mv "${tmp_file}" "${file}"
  else
    # jqなし: 簡易追記
    local agent_entry="{\"name\": \"${agent_name}\", \"joined_at\": \"${joined_at}\"}"
    if grep -q '"agents": \[\]' "${file}" 2>/dev/null; then
      # 空配列 → 最初のエントリ
      sed -i "s/\"agents\": \[\]/\"agents\": [${agent_entry}]/" "${file}" 2>/dev/null || true
    else
      # 既存エントリあり → 末尾の"]"の直前にカンマ付きで追記
      sed -i "s/\(\"agents\": \[.*\)\]\([ \t]*\)$/\1, ${agent_entry}]\2/" "${file}" 2>/dev/null || true
    fi
  fi

  echo "[token-tracker] エージェント '${agent_name}' を作戦 '${operation}' に追加: ${joined_at}"
}

# メインコマンドルーター
COMMAND="${1:-}"
OPERATION="${2:-}"

case "${COMMAND}" in
  start)
    cmd_start "${OPERATION}"
    ;;
  stop)
    cmd_stop "${OPERATION}"
    ;;
  status)
    cmd_status "${OPERATION}"
    ;;
  add-agent)
    cmd_add_agent "${OPERATION}" "${3:-}"
    ;;
  *)
    echo "使い方: $0 {start|stop|status|add-agent} <作戦名> [オプション]"
    echo ""
    echo "コマンド:"
    echo "  start <作戦名>                  作戦開始時刻を記録"
    echo "  stop <作戦名>                   作戦終了時刻を記録し経過時間を計算"
    echo "  status [作戦名]                 状態を表示（省略時: 全作戦）"
    echo "  add-agent <作戦名> <エージェント名>  エージェントを追加"
    echo ""
    echo "出力先: ${TOKEN_USAGE_DIR}/{作戦名}-{日付}.json"
    exit 1
    ;;
esac
