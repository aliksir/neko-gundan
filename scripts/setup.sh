#!/bin/bash
# ===========================================
# 猫軍団マルチエージェント セットアップスクリプト
# ===========================================
#
# 猫軍団の作業環境を初期化する
# 使い方: bash multi-agent-neko/scripts/setup.sh
#

NEKO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
QUEUE_DIR="$NEKO_DIR/queue"
STATUS_DIR="$NEKO_DIR/status"

echo "🐱 猫軍団セットアップ開始…"
echo ""

# 1. ディレクトリ作成
echo "📁 作業ディレクトリを確認中…"
mkdir -p "$QUEUE_DIR/oyakata_to_shigoto"
mkdir -p "$QUEUE_DIR/shigoto_to_genba"
mkdir -p "$QUEUE_DIR/reports"
mkdir -p "$STATUS_DIR"
mkdir -p "$STATUS_DIR/alerts"
mkdir -p "$STATUS_DIR/token-usage"
mkdir -p "$STATUS_DIR/proof-of-work"
mkdir -p "$NEKO_DIR/hooks"
mkdir -p "$NEKO_DIR/config"
echo "   指差し確認…ヨシッッ！"
echo ""

# 2. キューをクリア（前回の残骸を削除）
echo "🧹 前回のキューをクリア中…"
rm -f "$QUEUE_DIR/oyakata_to_shigoto/"*.yaml 2>/dev/null
rm -f "$QUEUE_DIR/shigoto_to_genba/"*.yaml 2>/dev/null
rm -f "$QUEUE_DIR/reports/"*.yaml 2>/dev/null
echo "   清掃確認…ヨシッッ！"
echo ""

# 3. ダッシュボード初期化
echo "📊 ダッシュボードを初期化中…"
cat > "$STATUS_DIR/dashboard.md" << 'DASHBOARD'
# 🐱 猫軍団ダッシュボード

> 最終更新: (初期化直後)

## 作戦名: （未設定）

**親方猫の方針**: （待機中）
**状態**: 🟡 待機中

---

## 部隊編成

| 役職 | 名前 | 状態 | 担当タスク |
|------|------|------|-----------|
| 👑 将軍 | 親方猫 | 🟢 準備完了 | 全体指揮 |
| 🔧 家老 | 仕事猫 | 🟡 待機中 | - |
| ⛑️ 足軽 | 現場猫 | 🟡 待機中 | - |

---

## タスク一覧

（作戦開始後に更新）

---

## 進捗ログ

| 時刻 | 発信者 | 内容 |
|------|--------|------|
| - | システム | 猫軍団セットアップ完了 |

DASHBOARD
echo "   ダッシュボード確認…ヨシッッ！"
echo ""

# 4. エージェント定義の確認
echo "🐱 エージェント定義を確認中…"
AGENTS_DIR="$(cd "$NEKO_DIR/.." && pwd)/.claude/agents"

check_agent() {
    if [ -f "$AGENTS_DIR/$1.md" ]; then
        echo "   ✅ $2 ($1.md) …ヨシッッ！"
    else
        echo "   ❌ $2 ($1.md) …どうして…ファイルがない…"
        return 1
    fi
}

check_agent "oyakata-neko" "親方猫（将軍）"
check_agent "shigoto-neko" "仕事猫（家老）"
check_agent "genba-neko"   "現場猫（足軽）"
echo ""

# 5. コマンドの確認
echo "⚔️ 出陣コマンドを確認中…"
CMD_DIR="$(cd "$NEKO_DIR/.." && pwd)/.claude/commands"
if [ -f "$CMD_DIR/neko-gundan.md" ]; then
    echo "   ✅ /neko-gundan コマンド …ヨシッッ！"
else
    echo "   ❌ /neko-gundan コマンド …どうして…"
fi
echo ""

# 6. Symphony統合スクリプトの確認
echo "🎵 Symphony統合スクリプトを確認中…"
check_script() {
    if [ -f "$NEKO_DIR/$1" ]; then
        echo "   ✅ $2 ($1) …ヨシッッ！"
    else
        echo "   ❌ $2 ($1) …どうして…ファイルがない…"
    fi
}

check_script "scripts/stall-detector.sh"   "Stall検出"
check_script "scripts/token-tracker.sh"    "Token追跡"
check_script "scripts/agent-monitor.sh"    "エージェント監視"
check_script "scripts/proof-of-work.sh"    "Proof of Work"
check_script "scripts/update-dashboard.sh" "ダッシュボード自動生成"
check_script "hooks/lifecycle.sh"          "ライフサイクルフック"
echo ""

# 7. Symphony設定ファイルの確認
echo "⚙️ Symphony設定ファイルを確認中…"
check_config() {
    if [ -f "$NEKO_DIR/$1" ]; then
        echo "   ✅ $2 ($1) …ヨシッッ！"
    else
        echo "   ⚠️ $2 ($1) …見つからない（初回実行時は正常）"
    fi
}

check_config "config/concurrency.json"   "Concurrency設定"
check_config "config/thresholds.json"    "Stall閾値設定"
check_config "config/lifecycle.json"     "ライフサイクル設定"
check_config "config/proof-of-work.json" "PoW設定"
check_config "WORKFLOW.md"               "ワークフロー定義"
echo ""

# 8. ゾンビエージェント回収
echo "🧹 ゾンビエージェント回収中…"
if [ -f "$NEKO_DIR/hooks/lifecycle.sh" ]; then
    bash "$NEKO_DIR/hooks/lifecycle.sh" gc 2>&1 | sed 's/^/   /'
else
    echo "   （lifecycle.shがないためスキップ）"
fi
echo ""

# 完了
echo "==========================================="
echo "🐱👑 猫軍団、準備完了！"
echo "==========================================="
echo ""
echo "使い方:"
echo '  /neko-gundan "タスクの説明"'
echo ""
echo "例:"
echo '  /neko-gundan "READMEを日本語に翻訳して"'
echo '  /neko-gundan "テストを追加して"'
echo ""
echo "親方猫「よーし、いつでも出陣できるぞ！」"
