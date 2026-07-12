#!/bin/bash
# ===========================================
# しつけ設定適用スクリプト
# ===========================================
#
# neko-gundan.config.yaml の設定に基づいて
# modules/ から .claude/rules/ にファイルを同期する
#
# 使い方:
#   bash multi-agent-neko/scripts/shitsuke-apply.sh                    # config.yamlを適用
#   bash multi-agent-neko/scripts/shitsuke-apply.sh --preset minimal   # プリセット適用
#   bash multi-agent-neko/scripts/shitsuke-apply.sh --preset recommended
#   bash multi-agent-neko/scripts/shitsuke-apply.sh --preset full
#
# Progressive Disclosure（3層分離）:
#   - modules/ の全文をコピーせず、スタブ（要約+参照パス）を生成
#   - エージェントは必要時に Read で全文を取得
#   - 常時ロードのトークン量を約85%削減
#
# 安全性:
#   - 既存のモジュールファイルを全てクリアしてから再配置
#   - コアファイル（agents/, rules/）は変更しない
#   - 冪等（何度実行しても同じ結果）

NEKO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_DIR="$(cd "$NEKO_DIR/.." && pwd)"
RULES_DIR="$PROJECT_DIR/.claude/rules"
MODULES_DIR="$NEKO_DIR/modules"

# --- スタブ生成関数 (Progressive Disclosure) ---
# モジュール全文の代わりに、ヘッダー+概要+Integration Pointsの要約スタブを生成
# エージェントは必要時に Read で modules/*.md の全文を取得する
generate_stub() {
    local src="$1"    # modules/*.md のフルパス
    local dst="$2"    # .claude/rules/*.md のフルパス
    # $3 (neko-gundan ディレクトリ) は予約引数。現状未使用だが呼び出し元の互換性のため受領のみ。

    local filename
    filename="$(basename "$src")"

    # ヘッダー行（# Title）を取得
    local title
    title="$(head -1 "$src")"

    # > **Module**: ... 行を取得
    local module_line
    module_line="$(grep -m1 '^>' "$src")"

    # ヘッダー直後の概要行（最初の空でない非ヘッダー非引用行）を取得
    local summary
    summary="$(awk 'NR>1 && /^[^>#|]/ && !/^\s*$/ && !/^---/ && !/^\*\*/ {print; exit}' "$src")"

    # Integration Points テーブルを抽出（ヘッダー行〜次の空行 or セクションまで）
    local integration
    integration="$(awk '
        /^## Integration Points/ { found=1; next }
        found && /^\|/ { print; printed=1 }
        found && printed && !/^\|/ && !/^\s*$/ { exit }
        found && /^#/ { exit }
    ' "$src")"

    # スタブを生成
    {
        echo "$title"
        echo ""
        echo "$module_line"
        echo ""
        echo "$summary"
        echo ""
        echo "**Full definition**: \`modules/$filename\` — Read this file when you need the module's procedures, templates, or detailed rules."
        echo ""
        if [ -n "$integration" ]; then
            echo "## Integration Points"
            echo ""
            echo "$integration"
        fi
    } > "$dst"
}

# モジュール名とファイルの対応表
declare -A MODULE_FILES
MODULE_FILES=(
    [whiteboard]="whiteboard.md"
    [heartbeat]="heartbeat.md"
    [race_prevention]="race-prevention.md"
    [reflexion]="reflexion.md"
    [isv]="isv.md"
    [fides]="fides.md"
    [capacity_escalation]="capacity-escalation.md"
    [arbitrator]="arbitrator.md"
    [handoff_schema]="handoff-schema.md"
    [ensemble_judge]="ensemble-judge.md"
    [jit_tests]="jit-tests.md"
    [tdd_separation]="tdd-separation.md"
    [spec_driven_review]="spec-driven-review.md"
    [checklist_export]="checklist-export.md"
    [quality_metrics]="quality-metrics.md"
    [faceted_prompting]="faceted-prompting.md"
    [linter_protection]="linter-protection.md"
    [module_addition]="module-addition.md"
    [process_weight]="process-weight.md"
    [progress_visibility]="progress-visibility.md"
    [objection_flow]="objection-flow.md"
    [raw_log]="raw-log.md"
    [audit_trail]="audit-trail.md"
)

# 全モジュールファイル名の配列（クリーンアップ用 — MODULE_FILESから自動生成）
ALL_MODULE_FILES=("${MODULE_FILES[@]}")

# --- 引数処理 ---
CONFIG_FILE="$NEKO_DIR/neko-gundan.config.yaml"

if [ "$1" = "--preset" ] && [ -n "$2" ]; then
    PRESET_FILE="$NEKO_DIR/presets/$2.yaml"
    if [ ! -f "$PRESET_FILE" ]; then
        echo "❌ プリセット '$2' が見つからないニャ…"
        echo "   使えるプリセット: minimal, recommended, full"
        exit 1
    fi
    CONFIG_FILE="$PRESET_FILE"
    echo "🐱 プリセット '$2' を適用するニャ！"
else
    echo "🐱 neko-gundan.config.yaml を適用するニャ！"
fi

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ 設定ファイルが見つからないニャ: $CONFIG_FILE"
    exit 1
fi

# --- ディレクトリ確認 ---
mkdir -p "$RULES_DIR"

# --- Phase 1: モジュールファイルをクリーンアップ ---
echo ""
echo "🧹 既存モジュールファイルをクリーンアップ中…"
REMOVED=0
for file in "${ALL_MODULE_FILES[@]}"; do
    if [ -f "$RULES_DIR/$file" ]; then
        rm "$RULES_DIR/$file"
        REMOVED=$((REMOVED + 1))
    fi
done
echo "   ${REMOVED}個のモジュールファイルを削除…ヨシッ！"

# --- Phase 2: 設定に基づいてモジュールを配置 ---
echo ""
echo "📦 有効なモジュールを配置中…"
ENABLED=0
DISABLED=0

for module in "${!MODULE_FILES[@]}"; do
    file="${MODULE_FILES[$module]}"
    # YAMLから設定値を読み取り（簡易パーサー）
    value=$(grep -E "^\s+${module}:" "$CONFIG_FILE" | head -1 | sed 's/.*:\s*//' | sed 's/\s*#.*//' | tr -d ' ')

    if [ "$value" = "true" ]; then
        if [ -f "$MODULES_DIR/$file" ]; then
            # --- Progressive Disclosure: スタブ生成 ---
            # モジュール全文ではなく、ヘッダー+概要+Integration Pointsのスタブを生成
            generate_stub "$MODULES_DIR/$file" "$RULES_DIR/$file" "$NEKO_DIR"
            echo "   ✅ $module ($file) → ON ニャ！"
            ENABLED=$((ENABLED + 1))
        else
            echo "   ⚠️ $module: モジュールファイルが見つからないニャ… ($MODULES_DIR/$file)"
        fi
    else
        echo "   ⬜ $module → OFF"
        DISABLED=$((DISABLED + 1))
    fi
done

# --- Phase 3: 設定ファイルもコピー（参照用） ---
if [ "$CONFIG_FILE" != "$NEKO_DIR/neko-gundan.config.yaml" ]; then
    cp "$CONFIG_FILE" "$NEKO_DIR/neko-gundan.config.yaml"
    echo ""
    echo "📋 設定ファイルを更新…ヨシッ！"
fi

# --- 完了 ---
echo ""
echo "==========================================="
echo "🐱 しつけ設定の適用完了ニャ！"
echo "==========================================="
echo "   有効: ${ENABLED}モジュール"
echo "   無効: ${DISABLED}モジュール"
echo ""
echo "確認: ls $RULES_DIR/"
echo ""
