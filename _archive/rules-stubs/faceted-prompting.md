# Faceted Prompting Module

> **Module**: `faceted_prompting` | **Default**: ON | **Scale**: All

Design guideline for structuring agent prompts using Separation of Concerns (SoC). Based on TAKT's Faceted Prompting approach.

**Full definition**: `modules/faceted-prompting.md` — Read this file when you need the module's procedures, templates, or detailed rules.

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| oyakata-neko | Agent definition authoring | Structure new agent definitions using the 5-facet order (Persona → Knowledge → Instruction → Output Contract → Policy) |
| shigoto-neko | Agent definition authoring | Follow facet order; place Policy (constraints, prohibitions) at the end of the definition |
| genba-neko | Agent definition authoring | Follow facet order; place Policy (constraints, prohibitions) at the end of the definition |
| kurouto-neko | Review (agent definition changes) | Verify that new/modified agent content is placed in the correct facet zone |
