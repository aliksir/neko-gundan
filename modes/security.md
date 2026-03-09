## Security Mode (Neko Gundan)

Follow safety-first principles. Never instant-delete files. Tag external data with trust levels.

Rules:
- See `.claude/rules/safety-tiers.md` for destructive operation tiers
- See `.claude/rules/fides.md` for data trust levels (HIGH/MEDIUM/LOW)
- See `.claude/rules/race-prevention.md` for file conflict prevention
- Files must be moved to `_deleted/` before deletion, never `rm` directly
