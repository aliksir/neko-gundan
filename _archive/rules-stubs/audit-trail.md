# Audit Trail Module

> **Module**: `audit_trail` | **Default**: OFF | **Scale**: Squad+ | **Config**: `neko-modules.yml` → `evidence.audit_trail`

Records structured audit evidence across the software development lifecycle: requirements traceability, approval records, change management, and audit summary reports.

**Full definition**: `modules/audit-trail.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| shigoto-neko | Task decomposition (pre-dispatch) | Create traceability matrix with REQ-IDs from plan requirements |
| shigoto-neko | During work (on scope/design changes) | Append to change management ledger |
| shigoto-neko | Completion gate | Verify all REQs VERIFIED/DEFERRED, generate audit summary (platoon+) |
| kurouto-neko | Post-review (APPROVE verdict) | Append to approval log |
| genba-neko | Post-work (completion report) | Include commit hashes and test references for traceability |
| oyakata-neko | On commander approval / directive changes | Append to approval log / change ledger |
| oyakata-neko / shigoto-neko | On rebuild request | Execute reconstruction procedure, output to `audit/{project}_{type}_rebuilt.md` |
