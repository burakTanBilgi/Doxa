# Chart Comparison — Design

## Goal

Let the user select 2 or more existing charts that share the same trait names and view them together as an overlay chart plus a delta table. The comparison lives at the top of the View Panel, follows Doxa's existing in-canvas pattern, and is included in all export formats.

## Behavior

### Entering compare mode

A new **Compare** toggle button sits in the Control Panel action row, next to Import and Export. Clicking it sets `compareMode = true`. Clicking again exits compare mode and clears any selection.

### Selecting charts

While `compareMode` is true:

- Each chart row in the Control Panel grows a checkbox.
- Before any chart is selected, every chart's checkbox is enabled.
- Once the first chart is selected, every other chart's checkbox is enabled **only if** it is compatible with the first selection (see Compatibility). Incompatible rows are dimmed (~40% opacity) and disabled, with a `title=` tooltip explaining why.
- Selections are tracked in order — the first selected chart is the "baseline" used by the delta column and trait ordering.

### Compatibility

Two charts are compatible when:

1. They have the same chart type — both 2-trait (scatter) or both 3+-trait (radar). Type is derived from `chart.data.length`.
2. Their trait name sets are identical — same count, same names, order-independent, case-sensitive, no whitespace normalization.

Formally: `a.data.length === b.data.length` AND `new Set(a.data.map(t => t.subject))` equals `new Set(b.data.map(t => t.subject))`.

### Comparison view

When `compareSelection.length >= 2`, the View Panel renders a `<ChartComparison>` card **above** the regular chart grid, inside the existing `canvasRef`.

The card contains:

- **Header**: title "Comparison" + color chips for each included chart (color from the chart, label = chart title, small × to remove).
- **Overlay chart**:
  - **Radar (3+ traits)**: a single Recharts `<RadarChart>` with one `<Radar>` element per selected chart. Each Radar uses the chart's `color` for both stroke and fill, `fillOpacity={0.25}`.
  - **Scatter (2 traits)**: a single Recharts `<ScatterChart>` with one `<Scatter>` element per selected chart, each a single point at `(trait1.value, trait2.value)` colored per chart.
  - Axis labels: trait names in the **baseline chart's order** (the first selected chart).
- **Delta table**:
  - Rows: one per trait, in baseline order.
  - Columns: trait name, then one value column per selected chart (header = chart title, color matches chart).
  - If exactly 2 charts are selected, an extra "Δ" column shows `selection[1].value − selection[0].value`, colored green for positive, red for negative. With 3+ selected, no Δ column (too busy).

When `compareMode` is on but fewer than 2 charts are selected, the card renders a slim hint: "Select 2+ charts to compare."

### Reactivity (selection pruning)

`compareSelection` is treated as an invariant: every chart in it must be compatible with the baseline (the first entry). The invariant is enforced inside the existing reducers in `ChartContext`:

- `removeChart(id)` → also removes `id` from `compareSelection`.
- `updateTraitName`, `addTrait`, `removeTrait` → if the affected chart is in the selection, recompute compatibility against the baseline; drop it if it no longer matches.
- If the **baseline** (index 0) is the one dropped, the next remaining selected chart becomes the new baseline. If selection drops below 2, the comparison card collapses to the hint state but compare mode stays on.

Trait value changes (`updateTraitValue`) don't affect compatibility — the overlay/table just re-renders with new numbers.

Turning compare mode off clears the selection.

### Exports

All four export formats include the comparison.

- **PNG / SVG**: the card is inside `canvasRef`, so `toPng`/`toSvg` capture it automatically. Decorative chrome (× close button, "Compare" header chips with × removers) carries `data-html2canvas-ignore="true"` so the exported image shows only the chart and the table.
- **JSON** (`exportAsJson`): adds a top-level `comparisons` array of `{ chartIds: number[] }`. Today the array contains 0 or 1 entry; the shape is forward-compatible for future multi-comparison support.
- **Markdown** (`exportAsMarkdown`): adds a `## Comparison` section after the existing chart sections containing the delta table in Markdown table syntax.
- **JSON import** (`parseImportJson`): restores `comparisons`. After charts are loaded, each comparison's `chartIds` is filtered to those still present and still compatible with the first remaining entry; the rest are dropped silently. If fewer than 2 remain, the entry is discarded.

## Architecture

### Context (`src/context/ChartContext.jsx`)

New state:

```js
const [compareMode, setCompareMode] = useState(false);
const [compareSelection, setCompareSelection] = useState([]); // ordered chart IDs
```

New actions exported through `ChartContext.Provider`:

- `toggleCompareMode()` — flips `compareMode`; clears `compareSelection` on every transition (both on→off and off→on).
- `toggleChartInComparison(chartId)` — if present, removes it; otherwise appends it, but only if it's compatible with the current baseline (or if the selection is empty).
- `clearComparison()` — empties `compareSelection`.

Modifications to existing reducers — each must call a shared internal helper `pruneIncompatibleFromSelection(nextCharts, currentSelection)` and apply the result alongside the chart update:

- `removeChart`
- `addTrait`, `removeTrait`, `updateTraitName`
- `transferTrait` (changes trait sets on both source and destination)
- `importCharts` (with mode `replace` clears the selection; with `append` leaves it alone — appended charts can't already be in the selection)

`updateTraitValue`, `updateChartColor`, `updateChartTitle`, `reorderCharts`, `swapCharts`, `reorderTraits` don't affect compatibility and are unchanged.

### Compatibility utility (`src/utils/compareCompatibility.js`) — new file

Pure functions, no React imports:

```js
export function traitNameSet(chart) {
  return new Set(chart.data.map(t => t.subject));
}

export function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export function areCompatible(a, b) {
  return a.data.length === b.data.length
    && setsEqual(traitNameSet(a), traitNameSet(b));
}

export function pruneSelection(charts, selection) {
  // Drop IDs not present in charts. Then drop any not compatible with the
  // first remaining entry (which becomes/stays the baseline).
  const present = selection.filter(id => charts.some(c => c.id === id));
  if (present.length < 2) return present;
  const baseline = charts.find(c => c.id === present[0]);
  return present.filter((id, i) => {
    if (i === 0) return true;
    const chart = charts.find(c => c.id === id);
    return chart && areCompatible(baseline, chart);
  });
}

export function buildComparisonView(charts, selection) {
  // Returns { chartType, traitOrder, series: [{chartId, title, color, valuesByTrait}], deltaPair }
  // or null if selection.length < 2.
}
```

### Comparison component (`src/components/ChartComparison.jsx`) — new file

Subscribes to `useCharts()` for `charts`, `compareMode`, `compareSelection`, `clearComparison`, `toggleChartInComparison`.

Render rules:

- If `!compareMode` → render nothing.
- If `compareMode && selection.length < 2` → render the hint card.
- Otherwise → call `buildComparisonView`, render header + overlay + table.

The overlay subcomponent picks `<RadarChart>` or `<ScatterChart>` based on `view.chartType` and maps `view.series` to `<Radar>` / `<Scatter>` children.

The card root uses the same panel styling as existing chart cards (`backgroundColor: '#2d2d2d'`, rounded, `contain: 'layout style'`). Chrome elements (× close button, "remove from comparison" × on each chip) carry `data-html2canvas-ignore="true"`.

### Control Panel changes (`src/components/ControlPanel.jsx`)

- Import the `Compare` icon (use `Layers` or `GitCompare` from `lucide-react`) and add the toggle button to the action row, beside Import/Export. Button shows an active/highlighted state (matching the existing pattern for the lock/unlock scroll-sync button) when `compareMode` is true.
- Inside `ChartControls` (or wherever each chart row is rendered): when `compareMode` is true, render a checkbox at the left of the header. Wire it to `toggleChartInComparison(chart.id)`. Compute `isCompatibleWithBaseline` from context selection + `areCompatible`; if the selection is non-empty and this chart isn't the baseline and isn't compatible, render the checkbox disabled with `opacity: 0.4` and a `title` tooltip "Different trait set — can't compare with selected charts."

### Visualization Canvas changes (`src/components/VisualizationCanvas.jsx`)

Render `<ChartComparison />` once at the top of the chart grid, inside the same container that `canvasRef` points to, so it's part of PNG/SVG screenshots.

### Export changes (`src/utils/exportFormats.js`)

- `exportAsJson(title, description, charts, comparisons)` — add a new parameter; serialize as `{ ..., comparisons }`.
- `exportAsMarkdown(title, description, charts, comparisons)` — same; append a `## Comparison` section per entry with a Markdown delta table.
- `parseImportJson(json)` — extend the returned object from `{ title, description, charts }` to `{ title, description, charts, comparisons }`. Default to `[]` when the field is absent.

Call-site changes happen in `ControlPanel.jsx`, which already calls `useCharts()` — read `compareSelection` from the same hook in `handleExportJson` / `handleExportMarkdown` and pass it through. No prop threading from `App.jsx`.

Import restore: `importCharts(newCharts, mode)` gains an optional third argument `comparisons`. The handler runs the new context helper `pruneSelection(updatedCharts, comparisons[0]?.chartIds ?? [])` and sets the result as the new `compareSelection`. In `append` mode the imported chart IDs are remapped, so restored selections would reference invalid IDs — append mode ignores the imported `comparisons` and leaves the current selection untouched.

## Open implementation notes

- **Lucide icon**: `GitCompare` reads as "compare/diff" and matches the visual; pick it.
- **Color collisions** in the overlay: existing chart color generation (`generateDuskyColor` in `ChartContext`) already weights against existing chart hues, so collisions are rare. No de-collision pass needed inside the overlay.
- **Memoisation**: `buildComparisonView` should be wrapped in `useMemo` inside `ChartComparison`, keyed on `charts` and `compareSelection`, to avoid recomputing on unrelated re-renders.
- **`compareSelection` as `number[]`, not `Set`**: order matters (baseline is index 0) and JSON serialisation is trivial.
- **No localStorage persistence**: the feature follows Doxa's existing model — state lives in memory, "save" means JSON export. The comparison piggy-backs on that.

## Testing checklist (manual, no test runner exists)

1. Create 2 radar charts with identical trait names in different orders; toggle compare → both selectable → overlay renders in baseline order, table shows both values + Δ.
2. Create a 3rd matching chart; select it → Δ column disappears, third value column appears.
3. Edit a trait value in one selected chart → overlay and table update live.
4. Rename a trait in a selected chart so it no longer matches baseline → that chart silently drops from the comparison.
5. Delete the baseline chart → next selected becomes baseline; if fewer than 2 remain, card collapses to hint.
6. Create two 2-trait scatter charts with matching traits → compare mode produces scatter overlay (two colored points on the same XY plane) and a 2-row table.
7. Try selecting a 2-trait chart after a 3-trait chart is baseline → checkbox disabled with tooltip.
8. PNG and SVG exports include the comparison card without the × close button or chip removers.
9. JSON export round-trip: export, then import (replace) — comparison selection restored. Import (append) — selection unchanged.
10. Markdown export contains a `## Comparison` section with a correctly formatted delta table.
11. Toggle compare off → selection clears; toggle back on → selection starts empty.
12. Mobile (< `lg`): the Compare button still appears in the Control Panel; the comparison card renders inside the View tab.
