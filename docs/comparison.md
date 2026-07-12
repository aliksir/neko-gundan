# Comparison

← Back to [README](../README.md)

## Why Not Just Standard Subagents?

Claude Code's built-in subagents are powerful. Neko Gundan adds **operational guardrails** on top:

| | Standard Subagents | Neko Gundan |
|---|---|---|
| Self-review | Agent can review its own code | **Implementer ≠ Reviewer enforced** |
| Quality proof | "I checked" is accepted | **Evidence required** (test output, git diff) |
| Bad instructions | Silently executed | **Agents must object** (OBJECTION protocol) |
| File deletion | Instant, irreversible | **Moved to `_deleted/` first** |
| Parallel editing | No coordination | **Race condition prevention** |
| Quality trends | No visibility until something breaks | **Metrics track** gate pass rate, skip rate, review cycles |

If standard subagents already work for you, great. Neko Gundan is for when you need **proof that things are correct**, not just that they're done.

## Why Not LangGraph / CrewAI?

Those are code-based orchestration frameworks — you write Python to define agent workflows. Neko Gundan takes a different approach: **rules, not code**.

| | Code-based Frameworks | Neko Gundan |
|---|---|---|
| How it works | Python code defines agent graphs | Prompt rules define agent behavior |
| Integration | Separate system alongside your app | Lives inside Claude Code's config (`.claude/`) |
| Setup | Install packages, write orchestration code | Copy files, add a snippet to CLAUDE.md |
| Partial adoption | All or nothing | Pick one mode and add more later |
| Customization | Modify Python code | Edit markdown files |

Neko Gundan injects a "constitution" into Claude Code — operational rules that agents follow. No new runtime, no new dependencies. Your existing Claude Code setup gains a team structure.

## Where Neko Gundan Loses

Being honest about trade-offs:

| Dimension | Neko Gundan loses to | Why |
|-----------|---------------------|-----|
| **Role variety** | VoltAgent, wshobson/agents | We have 4 roles. They offer 100+. If you need a specialized "data analyst" or "DevOps" agent, look there |
| **Flow flexibility** | LangGraph, CrewAI | We enforce a fixed hierarchy (general → manager → worker → reviewer). If you need arbitrary DAG workflows, code-based frameworks win |
| **Lightweight speed** | Standard Claude Code subagents | Any framework adds overhead. For quick one-off tasks, raw subagents are faster and cheaper |
| **Language/runtime support** | Code-based frameworks | We're Claude Code only. They support multiple LLM providers and runtimes |

We optimize for one thing: **proof that the work is correct**. If that's not your bottleneck, simpler tools are better tools.
