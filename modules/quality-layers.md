# Quality Layers Module (QUALITY-LAYERS-001)

> **Module**: `quality_layers` | **Default**: OFF | **Scale**: Squad+ (UI/design tasks only)
>
> Source: Masato Suzuki / CASCA — "品質3層定義で40画面のデザインが破綻しなくなった"

Defines three quality tiers for UI/frontend work. Prevents over-engineering low-value screens and under-investing in high-value ones.

## When to Activate

Activate this module when a task involves **3+ screens/pages** of UI work. For 1-2 screen changes, apply L1 baseline by default without formal layer classification.

## The Three Layers

### L1: Functional Quality (ALL screens — mandatory baseline)

The screen works correctly. This is the foundation. **If L1 fails, do not release.**

```
L1 Baseline Checklist:
- [ ] Required information is displayed; user can operate without confusion
- [ ] Design system components are used correctly (no one-off custom components)
- [ ] Colors reference semantic tokens, not hardcoded hex values
- [ ] Layout uses Auto Layout / Flexbox / Grid (no fixed heights except scroll containers)
- [ ] Layer/component names follow naming convention: [Category]/[Component]/[Variant]/[State]
- [ ] All 5 interaction states are defined: Default / Hover / Focus / Error / Disabled
- [ ] Responsive breakpoints function correctly (if applicable)
```

**Genba-neko rule**: When implementing ANY screen, check every L1 item before reporting. No exceptions.

### L2: Experience Quality (major screens — invest in UX)

Feels good to use. Built on top of L1.

```
L2 Experience Checklist:
- [ ] State transitions have feedback (Loading skeleton → data / Success toast / Error message)
- [ ] Information hierarchy has rhythm (progressive disclosure, logical grouping)
- [ ] Whitespace is intentionally balanced
- [ ] Text tone is consistent across the screen
- [ ] Error handling is user-friendly (what happened, what to do next)
```

**Target screens**: Where users spend the most time — home, search results, detail views, primary workflows.

### L3: Delight Quality (selected screens — human-driven)

Users want to tell someone about it. A memorable experience.

```
L3 Delight Criteria:
- [ ] Experience exceeds expectations ("they went this far?")
- [ ] Visual impact that defines the brand impression
- [ ] Microinteractions are designed (not default browser behavior)
- [ ] Emotional design is intentionally incorporated
```

**Target screens**: Onboarding, first-time experience, hero pages, error recovery, pricing.

**Critical rule**: L3 design direction is decided by the commander (human), not by AI. AI implements the human's vision. AI-only L3 produces "predictable surprises" — which is an oxymoron.

## Layer Classification Procedure

### Step 1: Oyakata-neko / Shigoto-neko classifies screens

At planning or design phase, classify every screen into L1/L2/L3:

```
Screen Quality Layer Assignment:
- L3 (≈12%): [screen names — max 5-8 screens]
- L2 (≈36%): [screen names — major workflow screens]
- L1 (≈52%): [screen names — everything else]
```

**Rule of thumb**:
- L3: ~12% of screens (the "hero" screens)
- L2: ~36% of screens (the daily-use screens)
- L1: ~52% of screens (the support screens)

### Step 2: Record in task assignment

When shigoto-neko assigns UI tasks to genba-neko, include the layer:

```yaml
task_id: "genba_001"
quality_layer: L2  # genba-neko applies L1 + L2 checklists
target: "src/pages/SearchResults.tsx"
```

### Step 3: Genba-neko applies checklists

- **L1 task**: Apply L1 checklist only. Fast execution. Don't over-invest.
- **L2 task**: Apply L1 + L2 checklists. Spend time on UX details.
- **L3 task**: Apply L1 + L2 + L3 checklists. Wait for human direction on the "delight" element before implementing.

## Wave Method (Build Order)

Don't build one screen to completion before starting the next. Build in waves across all screens:

```
Wave 1 (L1): Build structure for ALL screens
  - Wireframe-level, establish overall navigation and screen transitions
  - Verify information architecture consistency across screens
  - Determine component types and quantities
  - Time budget: 30% of total

Wave 2 (L2): Polish major screens
  - Start from home, search results, detail views
  - Add state transitions, feedback, whitespace tuning
  - Patterns established here propagate to other screens
  - Time budget: 40% of total

Wave 3 (L3): Add delight to hero screens
  - Onboarding, data visualization highlights, error recovery
  - Microinteractions, emotional design
  - Invest in limited screens only
  - Time budget: 30% of total
```

**Ordering principle**: Broad and shallow → medium depth → focused and deep. Never one screen at a time.

## AI Division of Labor

| Layer | Who leads | AI role | Human role |
|-------|-----------|---------|------------|
| **L1** | **AI (genba-neko)** | Full implementation from checklist | Review only |
| **L2** | **Collaboration** | Implements direction | Sets direction (UX decisions) |
| **L3** | **Human (commander)** | Implements the vision | Designs the experience |

### Why this split works

- **L1 is rule-based** → AI excels at consistent rule application across 40+ screens
- **L2 is taste-based** → Human provides the "this feels right" signal, AI iterates quickly
- **L3 is emotion-based** → Requires human sensitivity. "What will surprise users" is not predictable by pattern matching

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| oyakata-neko | Planning (UI tasks) | Classify screens into L1/L2/L3 |
| shigoto-neko | Task assignment | Include `quality_layer` in task spec |
| genba-neko | Implementation | Apply layer-appropriate checklist |
| genba-neko | Report | Include layer compliance in completion report |
| kurouto-neko | Review | Verify correct checklist was applied for the assigned layer |

## L1 Baseline for SKILL.md / CLAUDE.md

When setting up a new UI project, add this to the project's CLAUDE.md or SKILL.md:

```markdown
## UI Quality Baseline (L1 — all screens)
- Components: use design system library (no custom one-offs)
- Colors: semantic tokens only (no hardcoded hex)
- Layout: Auto Layout / Flexbox / Grid (no fixed heights except scroll containers)
- Naming: [Category]/[Component]/[Variant]/[State]
- States: Default/Hover/Focus/Error/Disabled for all interactive elements
```

This ensures AI references the baseline on every screen, every time.
