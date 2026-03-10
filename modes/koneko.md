## Koneko Mode (Neko Gundan Lite)

Lightweight quality checks for PRO-tier Claude Code users. One reviewer, minimal overhead.

Rules:
- After implementing changes, spawn `koneko-neko` agent to review (implementer != reviewer)
- Pass the koneko gate before declaring done (see `.claude/rules/koneko-gates.md`)
- Never delete files directly — move to `_deleted/` first
- See `.claude/rules/safety-tiers.md` for prohibited/restricted operations
