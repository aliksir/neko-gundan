#!/bin/bash
# ===========================================
# 猫軍団 モード別インストーラ
# ===========================================
#
# 使い方:
#   bash neko-gundan/scripts/install.sh <mode> [target-dir]
#   bash neko-gundan/scripts/install.sh --update <mode> [target-dir]
#
# モード:
#   koneko     - PRO向け軽量版（レビュー1回＋安全ルールのみ）
#   quality    - レビュー・品質検証（自己レビュー防止、証跡ベースのゲート）
#   implement  - 並列実装・チーム編成（ワーカー管理、競合防止）
#   plan       - 戦略立案・タスク分解（ホワイトボード、意図記録）
#   security   - 事故防止・安全管理（破壊操作Tier、信頼レベル）
#   all        - 全モード（従来のfull相当）
#
# 組み合わせ:
#   bash install.sh quality+security ./my-project
#
# 更新:
#   bash install.sh --update all ./my-project
#
# ダウングレード:
#   bash install.sh --downgrade koneko ./my-project
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NEKO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- 色定義 ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- モード判定 ---
UPDATE_MODE=false
DOWNGRADE_MODE=false
if [ "${1:-}" = "--update" ]; then
    UPDATE_MODE=true
    shift
elif [ "${1:-}" = "--downgrade" ]; then
    DOWNGRADE_MODE=true
    shift
fi

# --- ヘルプ ---
usage() {
    echo "Usage: bash install.sh [--update|--downgrade] <mode> [target-dir]"
    echo ""
    echo "Modes:"
    echo "  koneko      Lite version for PRO-tier (1 reviewer + safety rules)"
    echo "  quality     Review & quality gates (reviewer agent, completion gates)"
    echo "  implement   Parallel implementation (worker agents, race prevention)"
    echo "  plan        Strategy & task decomposition (whiteboard, ISV)"
    echo "  security    Safety & accident prevention (safety tiers, FIDES)"
    echo "  all         All modes combined"
    echo ""
    echo "Combine modes with '+': quality+security"
    echo ""
    echo "Options:"
    echo "  --update    Check for upstream changes in existing files"
    echo "              Shows diff and lets you choose per file"
    echo "  --downgrade Downgrade to target mode, retiring unneeded files to _deleted/"
    echo "              Safely moves excess files instead of deleting them"
    echo ""
    echo "Examples:"
    echo "  bash install.sh quality ./my-project"
    echo "  bash install.sh quality+security ."
    echo "  bash install.sh all ~/projects/my-app"
    echo "  bash install.sh --update all ./my-project"
    echo "  bash install.sh --downgrade koneko ./my-project"
    exit 1
}

# --- 引数チェック ---
if [ $# -lt 1 ]; then
    usage
fi

MODE_INPUT="$1"
TARGET_DIR="${2:-.}"

# 絶対パスに変換
if [[ "$TARGET_DIR" != /* ]]; then
    TARGET_DIR="$(cd "$TARGET_DIR" 2>/dev/null && pwd)" || {
        echo -e "${RED}Error: Target directory '$2' does not exist${NC}"
        exit 1
    }
fi

CLAUDE_DIR="$TARGET_DIR/.claude"

# --- マニフェスト生成関数（インストール/ダウングレード共用） ---
_to_json_array() {
    local items="$1"
    local first=true
    printf '['
    for item in $items; do
        [ -z "$item" ] && continue
        if [ "$first" = true ]; then
            printf '"%s"' "$item"
            first=false
        else
            printf ', "%s"' "$item"
        fi
    done
    printf ']'
}

_write_manifest() {
    local version=""
    local installed_at=""

    if [ -f "$NEKO_DIR/CHANGELOG.md" ]; then
        version=$(grep -m1 '^## \[' "$NEKO_DIR/CHANGELOG.md" 2>/dev/null | sed 's/.*\[\([^]]*\)\].*/\1/' || echo "unknown")
    else
        version="unknown"
    fi
    installed_at=$(date -u "+%Y-%m-%dT%H:%M:%S" 2>/dev/null || date "+%Y-%m-%dT%H:%M:%S" 2>/dev/null || echo "unknown")

    local agents_json rules_json modules_json commands_json
    agents_json="$(_to_json_array "$AGENTS")"
    rules_json="$(_to_json_array "$RULES")"
    modules_json="$(_to_json_array "$MODULES")"
    if echo "$SNIPPETS" | grep -qE "(implement|plan)"; then
        commands_json='["neko-gundan.md"]'
    else
        commands_json='[]'
    fi

    printf '{\n'
    printf '  "version": "%s",\n' "$version"
    printf '  "mode": "%s",\n' "$MODE_INPUT"
    printf '  "installed_at": "%s",\n' "$installed_at"
    printf '  "neko_dir": "%s",\n' "$NEKO_DIR"
    printf '  "files": {\n'
    printf '    "agents": %s,\n' "$agents_json"
    printf '    "rules": %s,\n' "$rules_json"
    printf '    "modules": %s,\n' "$modules_json"
    printf '    "commands": %s\n' "$commands_json"
    printf '  }\n'
    printf '}\n'
}

# --- モード定義 ---
# 各モードが必要とするファイルを定義

quality_agents="kurouto-neko.md"
quality_rules="review-protocol.md completion-gates.md"
quality_modules="ensemble-judge.md jit-tests.md reflexion.md linter-protection.md objection-flow.md process-weight.md checklist-export.md quality-metrics.md arbitrator.md"

implement_agents="shigoto-neko.md genba-neko.md"
implement_rules=""
implement_modules="race-prevention.md heartbeat.md reflexion.md tdd-separation.md objection-flow.md capacity-escalation.md handoff-schema.md progress-visibility.md"

plan_agents="oyakata-neko.md"
plan_rules=""
plan_modules="whiteboard.md isv.md spec-driven-review.md module-addition.md faceted-prompting.md"

security_agents=""
security_rules="safety-tiers.md"
security_modules="fides.md race-prevention.md"

koneko_agents="koneko-neko.md"
koneko_rules="koneko-gates.md safety-tiers.md"
koneko_modules=""

# 全猫軍団ファイルのマスターリスト（ダウングレード用）
all_agents="oyakata-neko.md shigoto-neko.md genba-neko.md kurouto-neko.md koneko-neko.md"
all_rules="review-protocol.md completion-gates.md safety-tiers.md koneko-gates.md"
all_modules="ensemble-judge.md jit-tests.md reflexion.md linter-protection.md race-prevention.md heartbeat.md tdd-separation.md whiteboard.md isv.md spec-driven-review.md fides.md process-weight.md arbitrator.md capacity-escalation.md handoff-schema.md checklist-export.md quality-metrics.md module-addition.md faceted-prompting.md progress-visibility.md objection-flow.md"
all_commands="neko-gundan.md"

# --- モード解析（+で結合可能） ---
IFS='+' read -ra MODES <<< "$MODE_INPUT"

AGENTS=""
RULES=""
MODULES=""
SNIPPETS=""

for mode in "${MODES[@]}"; do
    case "$mode" in
        quality)
            AGENTS="$AGENTS $quality_agents"
            RULES="$RULES $quality_rules"
            MODULES="$MODULES $quality_modules"
            SNIPPETS="$SNIPPETS quality"
            ;;
        implement)
            AGENTS="$AGENTS $implement_agents"
            RULES="$RULES $implement_rules"
            MODULES="$MODULES $implement_modules"
            SNIPPETS="$SNIPPETS implement"
            ;;
        plan)
            AGENTS="$AGENTS $plan_agents"
            RULES="$RULES $plan_rules"
            MODULES="$MODULES $plan_modules"
            SNIPPETS="$SNIPPETS plan"
            ;;
        koneko)
            AGENTS="$AGENTS $koneko_agents"
            RULES="$RULES $koneko_rules"
            MODULES="$MODULES $koneko_modules"
            SNIPPETS="$SNIPPETS koneko"
            ;;
        security)
            AGENTS="$AGENTS $security_agents"
            RULES="$RULES $security_rules"
            MODULES="$MODULES $security_modules"
            SNIPPETS="$SNIPPETS security"
            ;;
        all)
            AGENTS="$quality_agents $implement_agents $plan_agents"
            RULES="$quality_rules $implement_rules $security_rules"
            MODULES="$quality_modules $implement_modules $plan_modules $security_modules"
            SNIPPETS="quality implement plan security"
            ;;
        *)
            echo -e "${RED}Unknown mode: $mode${NC}"
            usage
            ;;
    esac
done

# 全モード共通モジュール
MODULES="$MODULES process-weight.md"

# 重複除去
AGENTS=$(echo "$AGENTS" | tr ' ' '\n' | sort -u | tr '\n' ' ')
RULES=$(echo "$RULES" | tr ' ' '\n' | sort -u | tr '\n' ' ')
MODULES=$(echo "$MODULES" | tr ' ' '\n' | sort -u | tr '\n' ' ')
SNIPPETS=$(echo "$SNIPPETS" | tr ' ' '\n' | sort -u | tr '\n' ' ')

# --- ダウングレードモード ---
if [ "$DOWNGRADE_MODE" = true ]; then
    echo ""
    echo -e "${CYAN}=========================================${NC}"
    echo -e "${CYAN}  Neko Gundan Downgrade${NC}"
    echo -e "${CYAN}=========================================${NC}"
    echo ""
    echo -e "Target mode: ${GREEN}${MODE_INPUT}${NC}"
    echo -e "Target dir:  ${GREEN}${TARGET_DIR}${NC}"
    echo ""

    DELETED_DIR="$TARGET_DIR/_deleted/neko-gundan-$(date +%Y%m%d)"
    retired=0
    installed=0

    # ヘルパー: ファイルがターゲットモードに必要かチェック
    is_needed() {
        local file="$1"
        local list="$2"
        echo "$list" | tr ' ' '\n' | grep -qx "$file"
    }

    # ヘルパー: 不要ファイルを _deleted/ に退避
    retire_file() {
        local filepath="$1"
        local subdir="$2"
        local filename
        filename="$(basename "$filepath")"
        if [ -f "$filepath" ]; then
            mkdir -p "$DELETED_DIR/$subdir"
            mv "$filepath" "$DELETED_DIR/$subdir/$filename"
            echo -e "  ${YELLOW}RETIRE${NC} $subdir/$filename -> _deleted/"
            ((retired++)) || true
        fi
    }

    # エージェントの退避
    echo -e "${CYAN}Checking agents:${NC}"
    for f in $all_agents; do
        if [ -f "$CLAUDE_DIR/agents/$f" ]; then
            if is_needed "$f" "$AGENTS"; then
                echo -e "  ${GREEN}KEEP${NC} $f"
            else
                retire_file "$CLAUDE_DIR/agents/$f" "agents"
            fi
        fi
    done
    echo ""

    # ルールの退避
    echo -e "${CYAN}Checking rules:${NC}"
    for f in $all_rules; do
        if [ -f "$CLAUDE_DIR/rules/$f" ]; then
            if is_needed "$f" "$RULES"; then
                echo -e "  ${GREEN}KEEP${NC} $f"
            else
                retire_file "$CLAUDE_DIR/rules/$f" "rules"
            fi
        fi
    done
    echo ""

    # モジュールの退避
    echo -e "${CYAN}Checking modules:${NC}"
    for f in $all_modules; do
        if [ -f "$CLAUDE_DIR/modules/$f" ]; then
            if is_needed "$f" "$MODULES"; then
                echo -e "  ${GREEN}KEEP${NC} $f"
            else
                retire_file "$CLAUDE_DIR/modules/$f" "modules"
            fi
        fi
    done
    echo ""

    # コマンドの退避（koneko等ではコマンド不要）
    if ! echo "$SNIPPETS" | grep -qE "(implement|plan)"; then
        echo -e "${CYAN}Checking commands:${NC}"
        for f in $all_commands; do
            if [ -f "$CLAUDE_DIR/commands/$f" ]; then
                retire_file "$CLAUDE_DIR/commands/$f" "commands"
            fi
        done
        echo ""
    fi

    # ターゲットモードに必要だが未インストールのファイルを追加
    missing=0
    echo -e "${CYAN}Installing missing files:${NC}"
    for f in $AGENTS; do
        if [ -n "$f" ] && [ ! -f "$CLAUDE_DIR/agents/$f" ] && [ -f "$NEKO_DIR/agents/$f" ]; then
            mkdir -p "$CLAUDE_DIR/agents"
            cp "$NEKO_DIR/agents/$f" "$CLAUDE_DIR/agents/$f"
            echo -e "  ${GREEN}ADD${NC} agents/$f"
            ((missing++)) || true
        fi
    done
    for f in $RULES; do
        if [ -n "$f" ] && [ ! -f "$CLAUDE_DIR/rules/$f" ] && [ -f "$NEKO_DIR/rules/$f" ]; then
            mkdir -p "$CLAUDE_DIR/rules"
            cp "$NEKO_DIR/rules/$f" "$CLAUDE_DIR/rules/$f"
            echo -e "  ${GREEN}ADD${NC} rules/$f"
            ((missing++)) || true
        fi
    done
    for f in $MODULES; do
        if [ -n "$f" ] && [ ! -f "$CLAUDE_DIR/modules/$f" ] && [ -f "$NEKO_DIR/modules/$f" ]; then
            mkdir -p "$CLAUDE_DIR/modules"
            cp "$NEKO_DIR/modules/$f" "$CLAUDE_DIR/modules/$f"
            echo -e "  ${GREEN}ADD${NC} modules/$f"
            ((missing++)) || true
        fi
    done
    if [ "$missing" -eq 0 ]; then
        echo -e "  (none needed)"
    fi
    echo ""

    # サマリ
    echo -e "${CYAN}=========================================${NC}"
    echo -e "  ${YELLOW}$retired${NC} files retired to _deleted/"
    echo -e "  ${GREEN}$missing${NC} files added"
    echo -e "${CYAN}=========================================${NC}"
    echo ""
    if [ "$retired" -gt 0 ]; then
        echo -e "Retired files are in: ${YELLOW}$DELETED_DIR${NC}"
        echo "You can restore them if needed, or delete them permanently later."
        echo ""
    fi
    echo -e "${CYAN}CLAUDE.md snippet for ${MODE_INPUT}:${NC}"
    echo ""
    echo "  Replace your current Neko Gundan snippet with:"
    echo "  ----------------------------------------"
    for snippet in $SNIPPETS; do
        if [ -f "$NEKO_DIR/modes/$snippet.md" ]; then
            sed 's/^/  /' "$NEKO_DIR/modes/$snippet.md"
            echo ""
        fi
    done
    echo "  ----------------------------------------"
    echo ""
    echo -e "${GREEN}Downgrade complete!${NC}"
    echo ""

    # マニフェスト更新（共通関数を呼び出し）
    if _write_manifest > "$CLAUDE_DIR/.neko-gundan-manifest.json" 2>/dev/null; then
        echo -e "  ${CYAN}Manifest:${NC} .claude/.neko-gundan-manifest.json (updated)"
        echo ""
    fi

    exit 0
fi

# --- インストール開始 ---
echo ""
echo -e "${CYAN}=========================================${NC}"
if [ "$UPDATE_MODE" = true ]; then
    echo -e "${CYAN}  Neko Gundan Updater${NC}"
else
    echo -e "${CYAN}  Neko Gundan Installer${NC}"
fi
echo -e "${CYAN}=========================================${NC}"
echo ""
echo -e "Mode:   ${GREEN}${MODE_INPUT}${NC}"
echo -e "Target: ${GREEN}${TARGET_DIR}${NC}"
if [ "$UPDATE_MODE" = true ]; then
    echo -e "Action: ${BLUE}Update (check upstream changes)${NC}"
fi
echo ""

# ディレクトリ作成
mkdir -p "$CLAUDE_DIR/agents" 2>/dev/null || true
mkdir -p "$CLAUDE_DIR/rules" 2>/dev/null || true
mkdir -p "$CLAUDE_DIR/modules" 2>/dev/null || true
mkdir -p "$CLAUDE_DIR/commands" 2>/dev/null || true

copied=0
skipped=0
updated=0
has_diff=0

# --- ファイルコピー/更新関数 ---
copy_file() {
    local src="$1"
    local dst="$2"
    if [ ! -f "$src" ]; then
        echo -e "  ${YELLOW}SKIP${NC} $(basename "$src") (source not found)"
        ((skipped++)) || true
        return
    fi

    if [ -f "$dst" ]; then
        if [ "$UPDATE_MODE" = true ]; then
            # 更新モード: 差分チェック
            if diff -q "$src" "$dst" > /dev/null 2>&1; then
                echo -e "  ${GREEN}OK${NC} $(basename "$dst") (up to date)"
            else
                echo -e "  ${YELLOW}CHANGED${NC} $(basename "$dst")"
                echo ""
                diff --color=auto -u "$dst" "$src" 2>/dev/null | head -30 || true
                echo ""
                echo -n "  Overwrite with upstream? [y]es / [n]o / [d]iff full: "
                read -r answer < /dev/tty
                case "$answer" in
                    y|Y|yes)
                        cp "$src" "$dst"
                        echo -e "  ${GREEN}UPDATED${NC} $(basename "$dst")"
                        ((updated++)) || true
                        ;;
                    d|D|diff)
                        diff --color=auto -u "$dst" "$src" 2>/dev/null || true
                        echo ""
                        echo -n "  Overwrite? [y/n]: "
                        read -r answer2 < /dev/tty
                        if [ "$answer2" = "y" ] || [ "$answer2" = "Y" ]; then
                            cp "$src" "$dst"
                            echo -e "  ${GREEN}UPDATED${NC} $(basename "$dst")"
                            ((updated++)) || true
                        else
                            echo -e "  ${YELLOW}KEPT${NC} $(basename "$dst") (local version)"
                            ((skipped++)) || true
                        fi
                        ;;
                    *)
                        echo -e "  ${YELLOW}KEPT${NC} $(basename "$dst") (local version)"
                        ((skipped++)) || true
                        ;;
                esac
                ((has_diff++)) || true
            fi
        else
            # 通常モード: 既存ファイルはスキップ
            echo -e "  ${YELLOW}EXISTS${NC} $(basename "$dst")"
            ((skipped++)) || true
        fi
        return
    fi
    cp "$src" "$dst"
    echo -e "  ${GREEN}COPY${NC} $(basename "$dst")"
    ((copied++)) || true
}

# Agents
if [ -n "$(echo "$AGENTS" | tr -d ' ')" ]; then
    echo -e "${CYAN}Agents:${NC}"
    for f in $AGENTS; do
        copy_file "$NEKO_DIR/agents/$f" "$CLAUDE_DIR/agents/$f"
    done
    echo ""
fi

# Rules
if [ -n "$(echo "$RULES" | tr -d ' ')" ]; then
    echo -e "${CYAN}Rules:${NC}"
    for f in $RULES; do
        copy_file "$NEKO_DIR/rules/$f" "$CLAUDE_DIR/rules/$f"
    done
    echo ""
fi

# Modules (separate directory for clarity)
if [ -n "$(echo "$MODULES" | tr -d ' ')" ]; then
    echo -e "${CYAN}Modules:${NC}"
    for f in $MODULES; do
        copy_file "$NEKO_DIR/modules/$f" "$CLAUDE_DIR/modules/$f"
    done
    echo ""
fi

# Hooks (gate-guard)
echo -e "${CYAN}Hooks:${NC}"
mkdir -p "$CLAUDE_DIR/hooks" 2>/dev/null || true
copy_file "$NEKO_DIR/hooks/gate-guard.mjs" "$CLAUDE_DIR/hooks/gate-guard.mjs"
echo ""

# Commands (implement/plan/all モードのみ)
if echo "$SNIPPETS" | grep -qE "(implement|plan)"; then
    echo -e "${CYAN}Commands:${NC}"
    copy_file "$NEKO_DIR/commands/neko-gundan.md" "$CLAUDE_DIR/commands/neko-gundan.md"
    echo ""
fi

# --- CLAUDE.md スニペット生成（通常モードのみ） ---
if [ "$UPDATE_MODE" = false ]; then
    echo -e "${CYAN}CLAUDE.md snippet:${NC}"
    echo ""
    echo "  Add the following to your CLAUDE.md:"
    echo "  ----------------------------------------"
    for snippet in $SNIPPETS; do
        if [ -f "$NEKO_DIR/modes/$snippet.md" ]; then
            sed 's/^/  /' "$NEKO_DIR/modes/$snippet.md"
            echo ""
        fi
    done
    echo "  ----------------------------------------"
    echo ""
fi

# --- 結果サマリ ---
echo -e "${CYAN}=========================================${NC}"
if [ "$UPDATE_MODE" = true ]; then
    echo -e "  ${GREEN}$copied${NC} new, ${BLUE}$updated${NC} updated, ${YELLOW}$skipped${NC} unchanged"
    if [ "$has_diff" -eq 0 ] && [ "$copied" -eq 0 ]; then
        echo -e "  Everything is up to date!"
    fi
else
    echo -e "  ${GREEN}$copied${NC} files copied, ${YELLOW}$skipped${NC} skipped"
fi
echo -e "${CYAN}=========================================${NC}"
echo ""

if [ "$UPDATE_MODE" = true ]; then
    if [ "$updated" -gt 0 ]; then
        echo -e "${GREEN}Update complete!${NC} Review changes with: git diff"
    fi
elif [ "$copied" -gt 0 ]; then
    echo -e "${GREEN}Installation complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Add the snippet above to your CLAUDE.md"
    echo "  2. Run: bash neko-gundan/scripts/shitsuke-apply.sh"
    echo "     (Syncs enabled modules to .claude/rules/)"
    if echo "$SNIPPETS" | grep -qE "(implement|plan)"; then
        echo "  3. Run: bash neko-gundan/scripts/setup.sh  (for runtime dirs)"
    fi
    echo ""
    echo -e "${CYAN}Recommended: Gate Guard Hook${NC}"
    echo "  Prevents skipping the planning phase (blocks Edit/Write until"
    echo "  plans/ and checklist/ files exist). Add to settings.json:"
    echo ""
    echo '  "hooks": {'
    echo '    "PreToolUse": ['
    echo '      { "matcher": "Edit",'
    echo "        \"hooks\": [{ \"type\": \"command\", \"command\": \"node $(echo "$CLAUDE_DIR/hooks" | sed 's|\\|/|g')/gate-guard.mjs\", \"timeout\": 3 }] },"
    echo '      { "matcher": "Write",'
    echo "        \"hooks\": [{ \"type\": \"command\", \"command\": \"node $(echo "$CLAUDE_DIR/hooks" | sed 's|\\|/|g')/gate-guard.mjs\", \"timeout\": 3 }] }"
    echo '    ]'
    echo '  }'
    echo ""
    echo "  Skip this if you prefer to rely on agent instructions alone."
else
    echo "All files already exist. Nothing to do."
    echo "To check for upstream updates: bash install.sh --update ${MODE_INPUT} ${TARGET_DIR}"
fi
echo ""

# --- マニフェスト書き込み（共通関数を呼び出し） ---
if _write_manifest > "$CLAUDE_DIR/.neko-gundan-manifest.json" 2>/dev/null; then
    echo -e "  ${CYAN}Manifest:${NC} .claude/.neko-gundan-manifest.json (created)"
    echo ""
fi
