# Heartbeat & Polling Module (HEARTBEAT-001 / POLLING-001)

> **Module**: `heartbeat` | **Default**: ON | **Scale**: Platoon+

Active progress monitoring and stuck detection.

**Full definition**: `modules/heartbeat.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| genba-neko | During work (step 6) | Report when stuck (5min/2errors/unclear/unexpected). 3 consecutive errors -> `[ESCALATION]` |
| shigoto-neko | After assignment (Progress Monitoring) | Poll at 5min, then every 10min. Respond to `[ESCALATION]` immediately |
| oyakata-neko | After background agent launch | Apply 15-minute rule for stall detection on `run_in_background` agents |
