#!/usr/bin/env bash
# steer.sh - Mid-run redirect channel
# Inspired by anthropics/cwc-long-running-agents (Apache-2.0, 2026-05-06)
#
# When $AGENT_STEER_FILE (default: ~/.claude/STEER.md) has content, surface it
# to the agent once at the next PreToolUse and clear the file.
#
# Use: echo "<new instruction>" > ~/.claude/STEER.md
#      → next tool call is blocked with OPERATOR STEERING: prefix, file becomes empty
#
# Test override: AGENT_STEER_FILE=/tmp/test_steer bash steer.sh
#
# Block protocol: stdout {"decision":"block","reason":"OPERATOR STEERING: ..."} + exit 2
# python3 unavailable → exit 0 (tool passes through, never stuck)
# truncate failure → stderr warning + surface treated as completed
#
# settings.json hook setup example:
#   {
#     "matcher": "*",
#     "hooks": [{ "type": "command",
#       "command": "bash path/to/hooks/steer.sh", "timeout": 2 }]
#   }

steer_file="${AGENT_STEER_FILE:-$HOME/.claude/STEER.md}"

if [ -s "$steer_file" ]; then
  note=$(cat "$steer_file")
  reason=$(python3 -c 'import json,sys; print(json.dumps("OPERATOR STEERING: " + sys.argv[1] + "\n\nPause your current plan, incorporate this guidance, then continue toward the goal."))' "$note" 2>/dev/null) || exit 0
  printf '{"decision":"block","reason":%s}\n' "$reason"
  : > "$steer_file" 2>/dev/null || echo "steer.sh: failed to truncate $steer_file (surface completed, may re-fire next call)" >&2
  exit 2
fi

exit 0
