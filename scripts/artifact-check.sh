#!/bin/bash
# ===========================================
# 猫軍団 — 成果物一括チェックスクリプト
# ===========================================
#
# 使い方:
#   bash scripts/artifact-check.sh <project-name> [work-dir]
#
# 全commit必須の成果物（7種）+ コード変更時のchecklist の存在を確認。
# 完了ゲート・報告前チェックポイントで使用。
#
# 終了コード:
#   0: 全成果物あり
#   1: 不足あり（不足一覧を出力）

set -euo pipefail

PROJECT="${1:-}"
WORK_DIR="${2:-$(pwd)}"

if [ -z "$PROJECT" ]; then
    echo "使い方: bash scripts/artifact-check.sh <project-name> [work-dir]" >&2
    exit 1
fi

# --- 色定義 ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

# --- 全commit必須（7種） ---
ALWAYS_REQUIRED=(
    "plans:計画書"
    "designs:設計書"
    "test-plan:テスト計画書"
    "audit:監査ログ"
    "logs:生ログ"
    "result:報告書"
)

missing=0
total=0

echo "🔍 成果物チェック: プロジェクト「${PROJECT}」"
echo "   作業ディレクトリ: ${WORK_DIR}"
echo ""

for entry in "${ALWAYS_REQUIRED[@]}"; do
    dir="${entry%%:*}"
    label="${entry##*:}"
    total=$((total + 1))

    found=false
    if [ -d "${WORK_DIR}/${dir}" ]; then
        # プロジェクト名を含む.mdファイルがあるか
        if ls "${WORK_DIR}/${dir}/"*"${PROJECT}"*.md 1>/dev/null 2>&1; then
            found=true
        fi
    fi

    if [ "$found" = true ]; then
        echo -e "  ${GREEN}✓${NC} ${dir}/ — ${label}"
        # 生ログの内容チェック（テンプレート未記入検出）
        if [ "$dir" = "logs" ]; then
            log_file=""
            for f in "${WORK_DIR}/${dir}/"*"${PROJECT}"*.md; do
                [ -f "$f" ] && log_file="$f"
            done
            if [ -n "$log_file" ]; then
                template_remains=$(grep -cE '（作業中に追記）|（追記予定）|TBD' "$log_file" 2>/dev/null || true)
                template_remains=${template_remains:-0}
                action_lines=$(grep -cE '^-?\s*(Read|Edit|Write|Bash|Grep|Glob|Agent|WebFetch|WebSearch|Decision|SendMessage|Skill|MCP):' "$log_file" 2>/dev/null || true)
                action_lines=${action_lines:-0}
                if [ "$template_remains" -gt 0 ]; then
                    echo -e "    ${RED}✗ 生ログにテンプレート未記入文言が残っています（${template_remains}箇所）${NC}"
                    echo -e "    ${RED}  → 現場猫のアクションログを収集してから完了してください${NC}"
                    missing=$((missing + 1))
                elif [ "$action_lines" -eq 0 ]; then
                    echo -e "    ${YELLOW}⚠ 生ログにアクション行（Read:/Edit:/Bash:等）が見つかりません${NC}"
                fi
            fi
        fi
    else
        echo -e "  ${RED}✗${NC} ${dir}/ — ${label} が見つかりません"
        missing=$((missing + 1))
    fi
done

# metrics/ チェック（PJ別累積ファイル — タスク名からPJ名を抽出して検索）
total=$((total + 1))
metrics_found=false
if [ -d "${WORK_DIR}/metrics" ]; then
    # まずタスク名そのままで検索
    if ls "${WORK_DIR}/metrics/"*"${PROJECT}"*_metrics.md 1>/dev/null 2>&1; then
        metrics_found=true
    else
        # タスク名からPJ名を抽出（YYYYMMDD_を除去、末尾の-xxx修飾子を順次削除して検索）
        pj_base="${PROJECT}"
        # 先頭の日付部分を除去（20260329_neko-claude-brushup → neko-claude-brushup）
        pj_base="${pj_base#[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]_}"
        # 末尾のハイフン区切り修飾子を順次削除して検索
        while [ -n "$pj_base" ]; do
            if ls "${WORK_DIR}/metrics/"*"${pj_base}"*_metrics.md 1>/dev/null 2>&1; then
                metrics_found=true
                break
            fi
            # 末尾の -xxx を1段階削除
            new_base="${pj_base%-*}"
            [ "$new_base" = "$pj_base" ] && break
            pj_base="$new_base"
        done
    fi
fi

if [ "$metrics_found" = true ]; then
    echo -e "  ${GREEN}✓${NC} metrics/ — メトリクス"
else
    echo -e "  ${RED}✗${NC} metrics/ — メトリクス が見つかりません"
    missing=$((missing + 1))
fi

# checklist/ チェック（コード変更の有無に関係なく存在確認、警告レベル）
total=$((total + 1))
checklist_found=false
if [ -d "${WORK_DIR}/checklist" ]; then
    if ls "${WORK_DIR}/checklist/"*"${PROJECT}"*.md 1>/dev/null 2>&1; then
        checklist_found=true
    fi
fi

if [ "$checklist_found" = true ]; then
    echo -e "  ${GREEN}✓${NC} checklist/ — チェックリスト"

    # チェックリスト完了率チェック（未チェック項目の検出）
    checklist_file=""
    for f in "${WORK_DIR}/checklist/"*"${PROJECT}"*.md; do
        [ -f "$f" ] && checklist_file="$f"
    done
    if [ -n "$checklist_file" ]; then
        total_items=$(grep -cE '^\s*- \[(x| )\]' "$checklist_file" 2>/dev/null || true)
        total_items=${total_items:-0}
        checked_items=$(grep -cE '^\s*- \[x\]' "$checklist_file" 2>/dev/null || true)
        checked_items=${checked_items:-0}
        unchecked_items=$(grep -cE '^\s*- \[ \]' "$checklist_file" 2>/dev/null || true)
        unchecked_items=${unchecked_items:-0}
        # [N/A] 行は未チェックから除外
        na_items=$(grep -cE '^\s*- \[ \].*\[N/A\]' "$checklist_file" 2>/dev/null || true)
        na_items=${na_items:-0}
        real_unchecked=$((unchecked_items - na_items))

        if [ "$total_items" -gt 0 ]; then
            completion_pct=$(( (checked_items * 100) / total_items ))
            if [ "$real_unchecked" -gt 0 ]; then
                echo -e "    ${YELLOW}⚠ 未チェック ${real_unchecked} 件（完了率 ${completion_pct}%）${NC}"
                # 先頭3件を表示
                grep -E '^\s*- \[ \]' "$checklist_file" | grep -v '\[N/A\]' | head -3 | while read -r line; do
                    echo -e "      ${YELLOW}→ ${line}${NC}"
                done
                echo -e "    ${YELLOW}  チェックを埋めてから報告してください${NC}"
            else
                echo -e "    ${GREEN}  完了率 ${completion_pct}% — 全項目チェック済み ヨシッ！${NC}"
            fi
        fi
    fi
else
    echo -e "  ${YELLOW}△${NC} checklist/ — チェックリスト（コード変更時は必須）"
fi

echo ""

if [ "$missing" -gt 0 ]; then
    echo -e "${RED}結果: ${missing}/${total} 個の必須成果物が不足しています${NC}"
    echo "  → 不足分を作成してからコミット・報告してください"
    exit 1
else
    echo -e "${GREEN}結果: 全 ${total} 種の必須成果物が揃っています ヨシッ！${NC}"
    exit 0
fi
