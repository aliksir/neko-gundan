#!/bin/bash
# 猫軍団 モジュール設定読み取り
# Usage: source scripts/module-config.sh
#        if is_module_enabled "audit_trail"; then ... fi

NEKO_MODULES_FILE="${NEKO_MODULES_FILE:-$(dirname "$(dirname "${BASH_SOURCE[0]}")")/neko-modules.yml}"

# モジュールが有効かチェック
# $1: モジュール名 (audit_trail, raw_log, isv, quality_metrics, checklist_export)
# 戻り値: 0=有効, 1=無効
is_module_enabled() {
  local module_name="$1"

  # 設定ファイルが無ければデフォルト値を使用
  if [[ ! -f "$NEKO_MODULES_FILE" ]]; then
    case "$module_name" in
      audit_trail|raw_log|isv|quality_metrics) echo "false"; return 1 ;;
      checklist_export) echo "true"; return 0 ;;
      *) echo "true"; return 0 ;;
    esac
  fi

  # YAMLから値を読み取り（jq不要、grep+sedで簡易パース）
  local value
  value=$(grep -E "^\s+${module_name}:" "$NEKO_MODULES_FILE" 2>/dev/null \
    | sed 's/.*:\s*//' | sed 's/\s*#.*//' | tr -d '[:space:]')

  case "$value" in
    true|True|TRUE|yes|Yes|YES|on|On|ON|1) return 0 ;;
    false|False|FALSE|no|No|NO|off|Off|OFF|0) return 1 ;;
    *) return 0 ;;  # 値が不明な場合はデフォルトON
  esac
}

# 全モジュールの状態を表示
show_module_status() {
  local modules=("audit_trail" "raw_log" "isv" "quality_metrics" "checklist_export")
  echo "=== 証跡モジュール設定 ==="
  echo "設定ファイル: ${NEKO_MODULES_FILE}"
  for mod in "${modules[@]}"; do
    if is_module_enabled "$mod"; then
      echo "  [ON]  $mod"
    else
      echo "  [OFF] $mod"
    fi
  done
}
