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
# 安全性:
#   - 既存のモジュールファイルを全てクリアしてから再配置
#   - コアファイル（agents/, rules/）は変更しない
#   - 冪等（何度実行しても同じ結果）

NEKO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_DIR="$(cd "$NEKO_DIR/.." && pwd)"
RULES_DIR="$PROJECT_DIR/.claude/rules"
MODULES_DIR="$NEKO_DIR/modules"

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
)

# 全モジュールファイル名の配列（クリーンアップ用）
ALL_MODULE_FILES=(
    "whiteboard.md" "heartbeat.md" "race-prevention.md" "reflexion.md"
    "isv.md" "fides.md" "capacity-escalation.md" "arbitrator.md"
    "handoff-schema.md" "ensemble-judge.md" "jit-tests.md"
    "tdd-separation.md" "spec-driven-review.md" "checklist-export.md"
    "quality-metrics.md"
)

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
            cp "$MODULES_DIR/$file" "$RULES_DIR/$file"
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
