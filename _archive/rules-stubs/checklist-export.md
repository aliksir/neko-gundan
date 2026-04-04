# Checklist Export Module

> **Module**: `checklist_export` | **Default**: ON (recommended+) | **Scale**: Squad+ | **Config**: `neko-modules.yml` → `evidence.checklist_export`

Exports task checklists to external files for progress tracking, human review, and record keeping.

**Full definition**: `modules/checklist-export.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| oyakata-neko (squad) / shigoto-neko (platoon+) | Planning start | Create checklist file with Start + Task-Specific + Completion sections |
| shigoto-neko / oyakata-neko | During work | Update checklist items as work progresses (genba-neko reports via SendMessage, shigoto-neko updates the file) |
| shigoto-neko / oyakata-neko | Completion gate | Verify all items PASS or N/A, link from result report |
