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
WORK_DIR="${2:-${NEKO_WORK_DIR:-C:/work}}"

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
        # 直近7日以内のファイルに絞ってプロジェクト名マッチ
        matches=$(find "${WORK_DIR}/${dir}" -maxdepth 1 -name "*${PROJECT}*.md" -mtime -7 2>/dev/null || true)
        if [ -n "$matches" ]; then
            found=true
        fi
    fi

    if [ "$found" = true ]; then
        echo -e "  ${GREEN}✓${NC} ${dir}/ — ${label}"
        # 報告書の intervention_count 有効性チェック
        if [ "$dir" = "result" ]; then
            while IFS= read -r result_file; do
                [ -z "$result_file" ] && continue
                # intervention_count メトリクス行を抽出（「- intervention_count:」形式に限定）
                ic_line=$(grep -E '^-?\s*intervention_count\s*:' "$result_file" 2>/dev/null | tail -1 || true)
                if [ -z "$ic_line" ]; then
                    echo -e "    ${RED}✗ intervention_count が未記入です${NC}"
                    missing=$((missing + 1))
                elif ! echo "$ic_line" | grep -qE '（|理由'; then
                    echo -e "    ${YELLOW}⚠ intervention_count に理由が未記載です（例: 0（理由: review_cycles:1, 修正指摘なし））${NC}"
                elif echo "$ic_line" | grep -qE ':\s*0\s*$'; then
                    # 0 だが修飾子なし — review_cycles + レビュー証跡を確認
                    rc_line=$(grep -E '^-?\s*review_cycles\s*:' "$result_file" 2>/dev/null | tail -1 || true)
                    rc_val=$(echo "$rc_line" | grep -oE '[0-9]+' | head -1 || echo "0")
                    rc_val=${rc_val:-0}
                    # レビュー証跡: reviews/ に対応ファイルが存在し、中身があるか確認
                    review_evidence=0
                    if [ -d "${WORK_DIR}/reviews" ]; then
                        while IFS= read -r rv_file; do
                            [ -z "$rv_file" ] && continue
                            rv_lines=$(wc -l < "$rv_file" 2>/dev/null || echo "0")
                            rv_lines=$(echo "$rv_lines" | tr -d ' ')
                            if [ "$rv_lines" -ge 5 ] 2>/dev/null; then
                                review_evidence=$((review_evidence + 1))
                            fi
                        done < <(find "${WORK_DIR}/reviews" -maxdepth 1 -name "*${PROJECT}*.md" -mtime -7 2>/dev/null || true)
                    fi
                    if [ "$rc_val" -eq 0 ] 2>/dev/null; then
                        echo -e "    ${RED}✗ intervention_count: 0 + review_cycles: 0 → [N/M] の付記が必要${NC}"
                        missing=$((missing + 1))
                    elif [ "$review_evidence" -eq 0 ] 2>/dev/null; then
                        echo -e "    ${RED}✗ intervention_count: 0 だがレビュー証跡なし（APPROVE/kurouto/RQS の記載がない）${NC}"
                        missing=$((missing + 1))
                    else
                        echo -e "    ${GREEN}  intervention_count: 0（genuine zero: review_cycles=${rc_val}, 証跡${review_evidence}件）${NC}"
                    fi
                elif echo "$ic_line" | grep -qE '\[N/M\]'; then
                    echo -e "    ${GREEN}  intervention_count: 0 [N/M]（未測定、集計除外）${NC}"
                elif echo "$ic_line" | grep -qiE 'N/A'; then
                    echo -e "    ${GREEN}  intervention_count: N/A（適用外）${NC}"
                fi
                # 必須3項目の存在チェック（review_cycles / reflexion_count）
                rc_present=$(grep -cE '^-?\s*review_cycles\s*:' "$result_file" 2>/dev/null || true)
                rc_present=${rc_present:-0}
                rf_present=$(grep -cE '^-?\s*reflexion_count\s*:' "$result_file" 2>/dev/null || true)
                rf_present=${rf_present:-0}
                if [ "$rc_present" -eq 0 ] 2>/dev/null; then
                    echo -e "    ${RED}✗ review_cycles が未記入です${NC}"
                    missing=$((missing + 1))
                fi
                if [ "$rf_present" -eq 0 ] 2>/dev/null; then
                    echo -e "    ${RED}✗ reflexion_count が未記入です${NC}"
                    missing=$((missing + 1))
                fi
            done <<< "$matches"
        fi
        # 生ログの内容チェック（テンプレート未記入検出 — 全マッチファイルを走査）
        if [ "$dir" = "logs" ]; then
            tbd_total=0
            action_total=0
            tbd_file=""
            while IFS= read -r log_file; do
                [ -z "$log_file" ] && continue
                tbd_count=$(grep -cE '（作業中に追記）|（追記予定）|TBD' "$log_file" 2>/dev/null || true)
                tbd_count=${tbd_count:-0}
                action_count=$(grep -cE '^-?\s*(Read|Edit|Write|Bash|Grep|Glob|Agent|WebFetch|WebSearch|Decision|SendMessage|Skill|MCP):' "$log_file" 2>/dev/null || true)
                action_count=${action_count:-0}
                tbd_total=$((tbd_total + tbd_count))
                action_total=$((action_total + action_count))
                if [ "$tbd_count" -gt 0 ]; then
                    tbd_file="$log_file"
                fi
            done <<< "$matches"
            if [ "$tbd_total" -gt 0 ]; then
                echo -e "    ${RED}✗ 生ログにテンプレート未記入文言が残っています（${tbd_total}箇所: ${tbd_file##*/}）${NC}"
                echo -e "    ${RED}  → 現場猫のアクションログを収集してから完了してください${NC}"
                missing=$((missing + 1))
            elif [ "$action_total" -eq 0 ]; then
                echo -e "    ${YELLOW}⚠ 生ログにアクション行（Read:/Edit:/Bash:等）が見つかりません${NC}"
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
    if [ -n "$(find "${WORK_DIR}/metrics" -maxdepth 1 -name "*${PROJECT}*_metrics.md" 2>/dev/null)" ]; then
        metrics_found=true
    else
        # タスク名からPJ名を抽出（YYYYMMDD_を除去、末尾の-xxx修飾子を順次削除して検索）
        pj_base="${PROJECT}"
        # 先頭の日付部分を除去
        pj_base="${pj_base#[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]_}"
        # 末尾のハイフン区切り修飾子を順次削除して検索
        while [ -n "$pj_base" ]; do
            if [ -n "$(find "${WORK_DIR}/metrics" -maxdepth 1 -name "*${pj_base}*_metrics.md" 2>/dev/null)" ]; then
                metrics_found=true
                break
            fi
            new_base="${pj_base%-*}"
            [ "$new_base" = "$pj_base" ] && break
            pj_base="$new_base"
        done
    fi
    # フォールバック: PJ名マッチなし → 先頭トークン（最初のハイフンまで）で再検索
    if [ "$metrics_found" = false ]; then
        first_token="${PROJECT%%-*}"
        if [ -n "$first_token" ] && [ "$first_token" != "$PROJECT" ]; then
            if [ -n "$(find "${WORK_DIR}/metrics" -maxdepth 1 -name "*${first_token}*_metrics.md" 2>/dev/null)" ]; then
                metrics_found=true
            fi
        fi
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
    cl_matches=$(find "${WORK_DIR}/checklist" -maxdepth 1 -name "*${PROJECT}*.md" -mtime -7 2>/dev/null || true)
    if [ -n "$cl_matches" ]; then
        checklist_found=true
    fi
fi

if [ "$checklist_found" = true ]; then
    echo -e "  ${GREEN}✓${NC} checklist/ — チェックリスト"

    # チェックリスト完了率チェック（直近7日の全マッチファイルの中で最新を使用）
    checklist_file=$(echo "$cl_matches" | sort | tail -1)
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

# execution-log 鮮度チェック（手順書が存在するなら実施記録も必要）
proc_count=$(find "${WORK_DIR}/procedures" -maxdepth 1 -name "*.md" -not -name "execution-log.md" -not -name "change-history.md" -not -name "approval-log.md" 2>/dev/null | wc -l)
proc_count=$(echo "$proc_count" | tr -d ' ')
if [ "$proc_count" -gt 0 ] 2>/dev/null; then
    exec_log="${WORK_DIR}/procedures/execution-log.md"
    if [ ! -f "$exec_log" ]; then
        echo -e "  ${YELLOW}⚠ procedures/ に手順書 ${proc_count} 件あるが execution-log.md が存在しません${NC}"
    else
        # テーブルヘッダー2行を除いた実エントリ数で判定
        exec_total=$(grep -cE '^\|.*\|.*\|' "$exec_log" 2>/dev/null || true)
        exec_total=${exec_total:-0}
        exec_entries=$((exec_total > 2 ? exec_total - 2 : 0))
        if [ "$exec_entries" -le 1 ] 2>/dev/null; then
            echo -e "  ${YELLOW}⚠ execution-log.md の実施記録が ${exec_entries} 件のみ（手順書 ${proc_count} 件に対して少ない）${NC}"
        fi
    fi
fi

echo ""

# hook変更後のテスト実施チェック（報告前CP経由で自動検出）
echo "🔍 hook変更テスト突合:"
hook_check_result=0
node "${WORK_DIR}/multi-agent-neko/scripts/check-hook-test.mjs" 7 || hook_check_result=$?
if [ "$hook_check_result" -ne 0 ]; then
    echo -e "  ${YELLOW}⚠ hook変更後のテストが不完全です${NC}"
fi
echo ""

# ルール結線チェック（rules/code-wiring-principle.md 準拠 — Tier 1 hook化）
echo "🔍 ルール結線チェック:"
wiring_script="${WORK_DIR}/multi-agent-neko/scripts/check-wiring.mjs"
if [ -f "$wiring_script" ]; then
    wiring_output=$(node "$wiring_script" "$WORK_DIR" || true)
    none_section=$(echo "$wiring_output" | grep -A 20 "未結線" | head -10)
    if [ -n "$none_section" ]; then
        echo -e "  ${YELLOW}⚠ 未結線ルールあり（code-wiring-principle確認推奨）${NC}"
        echo "$none_section" | while IFS= read -r line; do
            [ -n "$line" ] && echo -e "  ${YELLOW}  ${line}${NC}"
        done
    else
        echo -e "  ${GREEN}✓ 全ルール結線済み${NC}"
    fi
    rate_line=$(echo "$wiring_output" | grep "自動強制率" || true)
    [ -n "$rate_line" ] && echo -e "  ${GREEN}  ${rate_line}${NC}"
else
    echo -e "  ${YELLOW}⚠ check-wiring.mjs が見つかりません${NC}"
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
