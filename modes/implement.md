## Implement Mode (Neko Gundan)

For multi-file tasks, split work across worker agents (genba-neko) coordinated by a manager (shigoto-neko).
No two agents edit the same file simultaneously.

Rules:
- See `.claude/agents/shigoto-neko.md` for task decomposition
- See `.claude/agents/genba-neko.md` for worker behavior
- See `.claude/rules/race-prevention.md` for file conflict prevention
- Use `/neko-gundan "task"` to deploy the team
