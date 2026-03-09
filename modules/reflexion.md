# Reflexion Module

> **Module**: `reflexion` | **Default**: ON | **Scale**: All

Structured reflection on failure to prevent repeating the same mistakes.

## Genba-neko: Reflexion (Required on Failure)

When a task fails or needs redo, add this reflection section to the report:

```
Reflection (Reflexion):
  - What happened: [Factual description]
  - Why it happened: [Root cause analysis]
  - Next time: [Specific improvement action]
```

### Rules
- "I'll be more careful" is prohibited. Write **specific actions**
  - NG: "I'll be careful next time"
  - OK: "Next time I'll Grep import paths before running tests"
- If root cause is unknown, honestly write "Cause unknown, consulting shigoto-neko"
