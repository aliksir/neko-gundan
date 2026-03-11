#!/bin/bash
# ===========================================
# 猫軍団 — アップデート確認スクリプト
# ===========================================
#
# 使い方:
#   bash scripts/check-update.sh [--force]
#
# オプション:
#   --force  キャッシュを無視して即時チェック
#
# SessionStartフックで自動実行する場合:
#   bash ~/.claude/neko-gundan/scripts/check-update.sh &
#
# デフォルトはOFF。このスクリプトを明示的に呼び出した場合のみ動作する。
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NEKO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- 設定 ---
CACHE_FILE="${HOME}/.claude/.neko-gundan-update-cache"
CACHE_TTL=86400  # 24時間（秒）
GITHUB_RAW="https://raw.githubusercontent.com/aliksir/neko-gundan/master/CHANGELOG.md"

# --- フラグ解析 ---
FORCE=false
if [ "${1:-}" = "--force" ]; then
    FORCE=true
fi

# --- ユーティリティ: エラーはサイレント終了 ---
die_silent() {
    exit 0
}

# --- 通知メッセージ出力関数 ---
_print_notification() {
    local local_ver="$1"
    local remote_ver="$2"
    local modes="$3"
    local mode_display="${modes:-不明}"

    echo "" >&2
    echo "🔔 猫軍団: 新バージョン v${remote_ver} が利用可能です（現在: v${local_ver}）" >&2
    echo "   インストール済みモード: ${mode_display}" >&2
    echo "   → bash neko-gundan/scripts/install.sh --update ${mode_display} ./your-project" >&2
    echo "" >&2
}

# --- curlの存在チェック ---
if ! command -v curl > /dev/null 2>&1; then
    die_silent
fi

# Windows (schannel) では証明書失効チェックが失敗するため --ssl-no-revoke を付与
CURL_OPTS="--max-time 10"
if [ "$(uname -s | cut -c1-5)" = "MINGW" ] || [ "$(uname -s | cut -c1-4)" = "MSYS" ] || [ -n "${MSYSTEM:-}" ]; then
    CURL_OPTS="${CURL_OPTS} --ssl-no-revoke"
fi

# --- キャッシュチェック（--forceでスキップ） ---
if [ "$FORCE" = false ] && [ -f "$CACHE_FILE" ]; then
    now=$(date +%s 2>/dev/null || echo "0")
    if [ "$now" != "0" ]; then
        # キャッシュファイルを1回のreadループで全フィールド取得
        cached_time="0" cached_result="" cached_remote="" cached_local="" cached_modes=""
        while IFS='=' read -r key value; do
            case "$key" in
                timestamp) cached_time="$value" ;;
                result) cached_result="$value" ;;
                remote_version) cached_remote="$value" ;;
                local_version) cached_local="$value" ;;
                installed_modes) cached_modes="$value" ;;
            esac
        done < "$CACHE_FILE" 2>/dev/null

        elapsed=$(( now - cached_time ))
        if [ "$elapsed" -lt "$CACHE_TTL" ]; then
            if [ "$cached_result" = "up-to-date" ]; then
                exit 0
            elif [ "$cached_result" = "update-available" ]; then
                if [ -n "$cached_remote" ] && [ -n "$cached_local" ]; then
                    _print_notification "$cached_local" "$cached_remote" "$cached_modes"
                fi
                exit 0
            fi
        fi
    fi
fi

# --- ローカルバージョン取得 ---
LOCAL_CHANGELOG="$NEKO_DIR/CHANGELOG.md"
if [ ! -f "$LOCAL_CHANGELOG" ]; then
    die_silent
fi

local_version=$(grep -m1 '^## \[' "$LOCAL_CHANGELOG" 2>/dev/null | sed 's/.*\[\([^]]*\)\].*/\1/' || echo "")
if [ -z "$local_version" ]; then
    die_silent
fi

# --- リモートバージョン取得 ---
remote_version=$(curl -sL ${CURL_OPTS} "$GITHUB_RAW" 2>/dev/null | grep -m1 '^## \[' | sed 's/.*\[\([^]]*\)\].*/\1/' || echo "")
if [ -z "$remote_version" ]; then
    die_silent
fi

# --- インストール済みモード読み取り ---
installed_modes=""
MANIFEST_FILE="${HOME}/.claude/.neko-gundan-manifest.json"

if [ -f "$MANIFEST_FILE" ]; then
    if command -v jq > /dev/null 2>&1; then
        installed_modes=$(jq -r '.mode // empty' "$MANIFEST_FILE" 2>/dev/null || echo "")
    else
        installed_modes=$(grep '"mode"' "$MANIFEST_FILE" 2>/dev/null | sed 's/.*"mode"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
    fi
fi

# マニフェストがなければ "all" を仮定（後方互換）
if [ -z "$installed_modes" ]; then
    installed_modes="all"
fi

# --- バージョン比較（semver: x.y.z） ---
_version_gt() {
    local v1="$1"
    local v2="$2"
    if [ "$v1" = "$v2" ]; then
        return 1
    fi
    local higher
    higher=$(printf '%s\n%s\n' "$v1" "$v2" | sort -t. -k1,1n -k2,2n -k3,3n | tail -1)
    [ "$higher" = "$v1" ]
}

# --- キャッシュ更新 ---
_update_cache() {
    local result="$1"
    local local_ver="$2"
    local remote_ver="$3"
    local modes="$4"
    local now
    now=$(date +%s 2>/dev/null || echo "0")

    mkdir -p "$(dirname "$CACHE_FILE")" 2>/dev/null || true
    {
        echo "timestamp=${now}"
        echo "result=${result}"
        echo "local_version=${local_ver}"
        echo "remote_version=${remote_ver}"
        echo "installed_modes=${modes}"
    } > "$CACHE_FILE" 2>/dev/null || true
}

# --- モード別ファイル差分サマリ ---
_show_file_diff_summary() {
    local modes="$1"

    # モードに対応するファイル定義（install.shと同期）
    local agents="" rules="" modules=""

    IFS='+' read -ra MODE_LIST <<< "$modes"
    for mode in "${MODE_LIST[@]}"; do
        case "$mode" in
            quality)
                agents="$agents kurouto-neko.md"
                rules="$rules review-protocol.md completion-gates.md"
                modules="$modules ensemble-judge.md jit-tests.md reflexion.md linter-protection.md"
                ;;
            implement)
                agents="$agents shigoto-neko.md genba-neko.md"
                modules="$modules race-prevention.md heartbeat.md reflexion.md tdd-separation.md"
                ;;
            plan)
                agents="$agents oyakata-neko.md"
                modules="$modules whiteboard.md isv.md spec-driven-review.md"
                ;;
            koneko)
                agents="$agents koneko-neko.md"
                rules="$rules koneko-gates.md safety-tiers.md"
                ;;
            security)
                rules="$rules safety-tiers.md"
                modules="$modules fides.md race-prevention.md"
                ;;
            all)
                # install.shのallモードと同期（konekoは含まない）
                agents="kurouto-neko.md shigoto-neko.md genba-neko.md oyakata-neko.md"
                rules="review-protocol.md completion-gates.md safety-tiers.md"
                modules="ensemble-judge.md jit-tests.md reflexion.md linter-protection.md race-prevention.md heartbeat.md tdd-separation.md whiteboard.md isv.md spec-driven-review.md fides.md"
                ;;
        esac
    done

    # 全モード共通モジュール
    modules="$modules process-weight.md"

    # 重複除去
    agents=$(echo "$agents" | tr ' ' '\n' | sort -u | grep -v '^$' | tr '\n' ' ')
    rules=$(echo "$rules" | tr ' ' '\n' | sort -u | grep -v '^$' | tr '\n' ' ')
    modules=$(echo "$modules" | tr ' ' '\n' | sort -u | grep -v '^$' | tr '\n' ' ')

    local agent_count=0 rule_count=0 module_count=0
    for f in $agents; do [ -n "$f" ] && agent_count=$((agent_count + 1)); done
    for f in $rules;  do [ -n "$f" ] && rule_count=$((rule_count + 1)); done
    for f in $modules; do [ -n "$f" ] && module_count=$((module_count + 1)); done

    echo "   対象ファイル: agents/ ${agent_count}件, rules/ ${rule_count}件, modules/ ${module_count}件" >&2
    echo "   差分確認: bash neko-gundan/scripts/install.sh --update ${modes} ./your-project" >&2
}

# --- メイン比較ロジック ---
if _version_gt "$remote_version" "$local_version"; then
    _update_cache "update-available" "$local_version" "$remote_version" "$installed_modes"
    _print_notification "$local_version" "$remote_version" "$installed_modes"
    _show_file_diff_summary "$installed_modes"
else
    _update_cache "up-to-date" "$local_version" "$remote_version" "$installed_modes"
    if [ "$FORCE" = true ]; then
        echo "猫軍団: 最新バージョンです（v${local_version}）" >&2
    fi
fi

exit 0
