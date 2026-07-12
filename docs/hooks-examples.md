# Hooks Examples: Language-Specific PostToolUse

← Back to [Hooks Guide](hooks-guide.md)

Language-specific PostToolUse hook configurations. These hooks run automatically after file edits to enforce formatting and catch common mistakes early. Add the relevant entries to your project's `.claude/settings.json`.

---

## TypeScript / JavaScript

Runs Prettier formatting and `tsc` type check after every TypeScript file write.
Also warns on `console.log` statements left in source (common debug artifact).

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'FILE=\"$CLAUDE_TOOL_RESULT_PATH\"; if [[ \"$FILE\" == *.ts || \"$FILE\" == *.tsx ]]; then npx prettier --write \"$FILE\" && npx tsc --noEmit --skipLibCheck 2>&1 | head -20; fi'",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

### console.log detector (optional pre-commit guard)

Add as a separate PreToolUse hook on `Bash` to warn before committing:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'git diff --cached --name-only | xargs grep -l \"console\\.log\" 2>/dev/null | grep -E \"\\.(ts|tsx|js|jsx)$\" | while read f; do echo \"[WARN] console.log found in staged file: $f\"; done'",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

---

## Python

Runs `ruff` (format + lint) and `black` after every Python file write.
`ruff format` is used as the primary formatter; `black` is included for projects that require it.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'FILE=\"$CLAUDE_TOOL_RESULT_PATH\"; if [[ \"$FILE\" == *.py ]]; then ruff format \"$FILE\" && ruff check --fix \"$FILE\" 2>&1 | head -20; fi'",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

> **Note**: If your project uses `black` instead of `ruff format`, replace `ruff format` with `black`.

---

## Go

Runs `gofmt` and `go vet` after every Go file write. `goimports` is preferred over `gofmt` if installed.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'FILE=\"$CLAUDE_TOOL_RESULT_PATH\"; if [[ \"$FILE\" == *.go ]]; then gofmt -w \"$FILE\" && go vet ./... 2>&1 | head -20; fi'",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

### With goimports (preferred)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'FILE=\"$CLAUDE_TOOL_RESULT_PATH\"; if [[ \"$FILE\" == *.go ]]; then goimports -w \"$FILE\" && go vet ./... 2>&1 | head -20; fi'",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

---

## Rust

Runs `cargo fmt` and `cargo clippy` after Rust file writes. Clippy is run with `-D warnings` to treat all warnings as errors.

> **Note**: `cargo clippy` compiles the entire crate, so this hook may take 10–30 seconds on first run. Set `timeout` accordingly.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'FILE=\"$CLAUDE_TOOL_RESULT_PATH\"; if [[ \"$FILE\" == *.rs ]]; then cargo fmt && cargo clippy -- -D warnings 2>&1 | head -30; fi'",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

---

## Combined Multi-Language Config

For polyglot projects, combine all matchers into a single PostToolUse array:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c '\nFILE=\"$CLAUDE_TOOL_RESULT_PATH\"\ncase \"$FILE\" in\n  *.ts|*.tsx) npx prettier --write \"$FILE\" && npx tsc --noEmit --skipLibCheck 2>&1 | head -20 ;;\n  *.py)       ruff format \"$FILE\" && ruff check --fix \"$FILE\" 2>&1 | head -20 ;;\n  *.go)       goimports -w \"$FILE\" && go vet ./... 2>&1 | head -20 ;;\n  *.rs)       cargo fmt && cargo clippy -- -D warnings 2>&1 | head -30 ;;\nesac\n'",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

---

## Environment Variable Reference

| Variable | Contents | When available |
|----------|---------|----------------|
| `CLAUDE_TOOL_RESULT_PATH` | Absolute path of the file just written/edited | PostToolUse for Write and Edit |
| `CLAUDE_TOOL_INPUT` | JSON of the tool input | All PostToolUse hooks |

> See [hooks-guide.md](hooks-guide.md) for the full hook lifecycle and the existing `gate-guard`, `commit-guard`, and `artifact-reminder` hooks.
