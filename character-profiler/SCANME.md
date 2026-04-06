# AI Assistant Instructions

This document provides context and guidelines for AI assistants working on this codebase.

## Project Context

**Doxa Character Profiler** is a React application for visualizing personality profiles using radar and scatter charts. It was built through iterative "vibe coding" - collaborative development between a human and AI assistant.

## Architecture Overview

### State Management
- **ChartContext** (`src/context/ChartContext.jsx`) - Central state for all charts
  - `charts` array with `id`, `title`, `color`, `data` (traits)
  - Functions: `addNewChart`, `removeChart`, `updateChartTitle`, `updateChartColor`, `addTrait`, `removeTrait`, `updateTraitValue`, `updateTraitName`, `reorderCharts`, `reorderTraits`

### Component Hierarchy
```
App.jsx
├── MemoizedControlPanel (left panel)
│   └── ChartControls (per chart)
│       └── TraitField (per trait)
└── MemoizedVisualizationCanvas (right panel)
    └── ChartDisplay (per chart)
        ├── RadarChartDisplay (3+ traits)
        └── TwoFieldChart (2 traits)
```

### Key Patterns
- **Memoization** - Components wrapped with `memo()` to prevent re-renders
- **Refs for scroll sync** - `leftPanelRef`, `rightPanelRef` for asymmetric scrolling
- **Lerp animation** - Smooth scroll interpolation via `requestAnimationFrame`
- **Inline editing** - Click-to-edit pattern with local state toggle
- **Custom drag previews** - DOM elements created on drag start

## Code Style

- Functional components with hooks
- TailwindCSS for styling (inline `style` for dynamic values like colors)
- No TypeScript (plain JSX)
- Comments only where non-obvious

## When Making Changes

1. **Preserve animations** - Don't remove existing transitions/animations
2. **Maintain memoization** - Keep performance optimizations intact
3. **Test scroll sync** - Changes to layout may affect parallax scrolling
4. **Check both chart types** - Radar (3+) and Scatter (2) render differently

---

# Git Commit Message Format

Commits in this project follow a conversational format that documents the human-AI collaboration:

## Format

```
[ACTION] Brief description

Context: What the user requested
Changes: What the AI implemented
Notes: Any important details or trade-offs
```

## Action Types

- `[FEAT]` - New feature added
- `[FIX]` - Bug fix
- `[REFACTOR]` - Code restructuring without behavior change
- `[STYLE]` - UI/CSS changes
- `[PERF]` - Performance optimization
- `[DOCS]` - Documentation updates

## Examples

```
[FEAT] Add drag-and-drop for chart reordering

Context: User wanted charts to be reorderable by dragging
Changes: Added drag handlers to ChartControls, reorderCharts in context
Notes: Uses native HTML5 drag API with custom preview elements
```

```
[FIX] Right panel scroll getting stuck

Context: User reported scroll sync only worked from left panel
Changes: Added timeout reset for scrollSourceRef, clamped target values
Notes: Increased LERP_FACTOR to 0.15 for snappier response
```

```
[PERF] Optimize rendering with memoization

Context: User requested optimization without changing features
Changes: Wrapped ControlPanel and VisualizationCanvas in memo()
Notes: Added CSS containment and will-change for GPU acceleration
```

## Why This Format?

This project documents the "vibe coding" process - iterative development through human-AI conversation. Commit messages serve as:

1. **History** - Record of what was requested and delivered
2. **Context** - Why changes were made, not just what changed
3. **Learning** - Future AI assistants can understand the evolution

When committing, think: "What would help another developer (human or AI) understand this change?"
