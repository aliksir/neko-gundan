#!/bin/bash
# Claude Code + 猫軍団モニター ランチャー
# tmuxセッションを作成し、右ペインにエージェントモニターを常駐させる
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SESSION="claude"
MONITOR="$BASE_DIR/scripts/agent-monitor.sh"

cd "$BASE_DIR/.."

if tmux has-session -t "$SESSION" 2>/dev/null; then
    # 既存セッションにアタッチ
    tmux attach -t "$SESSION"
else
    # 新規セッション作成
    tmux new-session -d -s "$SESSION"

    # 右ペインにモニターを配置
    tmux split-window -h -t "$SESSION"
    tmux send-keys -t "$SESSION:.1" "bash $MONITOR" Enter
    tmux resize-pane -t "$SESSION:.1" -x 40

    # 左ペインでclaude起動
    tmux select-pane -t "$SESSION:.0"
    tmux send-keys -t "$SESSION:.0" "claude" Enter

    # アタッチ
    tmux attach -t "$SESSION"
fi
