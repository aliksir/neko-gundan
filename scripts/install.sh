#!/bin/bash
# ===========================================
# 猫軍団 モード別インストーラ
# ===========================================
#
# 使い方:
#   bash neko-gundan/scripts/install.sh <mode> [target-dir]
#
# モード:
#   quality    - レビュー・品質検証（自己レビュー防止、証跡ベースのゲート）
#   implement  - 並列実装・チーム編成（ワーカー管理、競合防止）
#   plan       - 戦略立案・タスク分解（ホワイトボード、意図記録）
#   security   - 事故防止・安全管理（破壊操作Tier、信頼レベル）
#   all        - 全モード（従来のfull相当）
#
# 組み合わせ:
#   bash install.sh quality+security ./my-project
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NEKO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- 色定義 ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- ヘルプ ---
usage() {
    echo "Usage: bash install.sh <mode> [target-dir]"
    echo ""
    echo "Modes:"
    echo "  quality     Review & quality gates (reviewer agent, completion gates)"
    echo "  implement   Parallel implementation (worker agents, race prevention)"
    echo "  plan        Strategy & task decomposition (whiteboard, ISV)"
    echo "  security    Safety & accident prevention (safety tiers, FIDES)"
    echo "  all         All modes combined"
    echo ""
    echo "Combine modes with '+': quality+security"
    echo ""
    echo "Examples:"
    echo "  bash install.sh quality ./my-project"
    echo "  bash install.sh quality+security ."
    echo "  bash install.sh all ~/projects/my-app"
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

# --- モード定義 ---
# 各モードが必要とするファイルを定義

quality_agents="kurouto-neko.md"
quality_rules="review-protocol.md completion-gates.md"
quality_modules="ensemble-judge.md jit-tests.md reflexion.md"

implement_agents="shigoto-neko.md genba-neko.md"
implement_rules=""
implement_modules="race-prevention.md heartbeat.md reflexion.md tdd-separation.md"

plan_agents="oyakata-neko.md"
plan_rules=""
plan_modules="whiteboard.md isv.md spec-driven-review.md"

security_agents=""
security_rules="safety-tiers.md"
security_modules="fides.md race-prevention.md"

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

# 重複除去
AGENTS=$(echo "$AGENTS" | tr ' ' '\n' | sort -u | tr '\n' ' ')
RULES=$(echo "$RULES" | tr ' ' '\n' | sort -u | tr '\n' ' ')
MODULES=$(echo "$MODULES" | tr ' ' '\n' | sort -u | tr '\n' ' ')
SNIPPETS=$(echo "$SNIPPETS" | tr ' ' '\n' | sort -u | tr '\n' ' ')

# --- インストール開始 ---
echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  Neko Gundan Installer${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""
echo -e "Mode:   ${GREEN}${MODE_INPUT}${NC}"
echo -e "Target: ${GREEN}${TARGET_DIR}${NC}"
echo ""

# ディレクトリ作成
mkdir -p "$CLAUDE_DIR/agents" 2>/dev/null || true
mkdir -p "$CLAUDE_DIR/rules" 2>/dev/null || true
mkdir -p "$CLAUDE_DIR/commands" 2>/dev/null || true

copied=0
skipped=0

copy_file() {
    local src="$1"
    local dst="$2"
    if [ ! -f "$src" ]; then
        echo -e "  ${YELLOW}SKIP${NC} $(basename "$src") (source not found)"
        ((skipped++)) || true
        return
    fi
    if [ -f "$dst" ]; then
        echo -e "  ${YELLOW}EXISTS${NC} $(basename "$dst")"
        ((skipped++)) || true
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

# Modules (-> rules/ as they function as rules)
if [ -n "$(echo "$MODULES" | tr -d ' ')" ]; then
    echo -e "${CYAN}Modules:${NC}"
    for f in $MODULES; do
        copy_file "$NEKO_DIR/modules/$f" "$CLAUDE_DIR/rules/$f"
    done
    echo ""
fi

# Commands (implement/plan/all モードのみ)
if echo "$SNIPPETS" | grep -qE "(implement|plan)"; then
    echo -e "${CYAN}Commands:${NC}"
    copy_file "$NEKO_DIR/commands/neko-gundan.md" "$CLAUDE_DIR/commands/neko-gundan.md"
    echo ""
fi

# --- CLAUDE.md スニペット生成 ---
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

# --- 結果サマリ ---
echo -e "${CYAN}=========================================${NC}"
echo -e "  ${GREEN}$copied${NC} files copied, ${YELLOW}$skipped${NC} skipped"
echo -e "${CYAN}=========================================${NC}"
echo ""

if [ "$copied" -gt 0 ]; then
    echo -e "${GREEN}Installation complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Add the snippet above to your CLAUDE.md"
    echo "  2. Start Claude Code and try it out"
    if echo "$SNIPPETS" | grep -qE "(implement|plan)"; then
        echo "  3. Run: bash neko-gundan/scripts/setup.sh  (for runtime dirs)"
    fi
else
    echo "All files already exist. Nothing to do."
fi
echo ""
