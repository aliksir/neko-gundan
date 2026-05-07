#!/usr/bin/env bash
# kill-switch.sh - Physical kill switch for all tool calls
# Inspired by anthropics/cwc-long-running-agents (Apache-2.0, 2026-05-06)
#
# Halts every tool call while $AGENT_STOP_FILE (default: ~/.claude/AGENT_STOP) exists.
# Useful for emergency-stopping long-running / nightly autopilot jobs.
#
# Engage: touch ~/.claude/AGENT_STOP
# Resume: rm ~/.claude/AGENT_STOP
#
# Test override: AGENT_STOP_FILE=/tmp/test_stop bash kill-switch.sh
#
# Block protocol: stdout {"decision":"block","reason":"..."} + exit 2
# (matches existing commit-guard.mjs / nightly-guard.mjs convention)
#
# settings.json hook setup example:
#   {
#     "matcher": "*",
#     "hooks": [{ "type": "command",
#       "command": "bash path/to/hooks/kill-switch.sh", "timeout": 2 }]
#   }

stop_file="${AGENT_STOP_FILE:-$HOME/.claude/AGENT_STOP}"

if [ -e "$stop_file" ]; then
  cat <<EOF
{"decision":"block","reason":"Kill switch engaged: $stop_file exists. Agent halted. Remove the file to resume: rm $stop_file"}
EOF
  exit 2
fi

exit 0
