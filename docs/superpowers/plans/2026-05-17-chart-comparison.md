# Chart Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "compare mode" that lets the user select 2+ existing charts with identical trait sets and view them as an overlay chart plus delta table, pinned at the top of the View Panel and included in every export format.

**Architecture:** Selection state lives in `ChartContext`; a pure `compareCompatibility.js` utility decides which charts are compatible and builds the view model; a new `ChartComparison` component renders the overlay (radar or scatter) and table inside the existing `canvasRef` so PNG/SVG capture it automatically; the existing `ControlPanel` gains a toggle button and per-chart checkbox UI; `exportFormats.js` carries selection through JSON/Markdown export and import.

**Tech Stack:** React 19 + hooks, Recharts (RadarChart/ScatterChart with multiple series), TailwindCSS, lucide-react icons, html-to-image. No test framework exists — verification uses `npm run lint`, `npm run build`, and explicit manual UI checks in `npm run dev`.

**Spec:** `docs/superpowers/specs/2026-05-17-chart-comparison-design.md`

---

## Task 1: Pure compatibility utility

**Files:**
- Create: `src/utils/compareCompatibility.js`

- [ ] **Step 1: Create the file with all four exports**

```js
// src/utils/compareCompatibility.js

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

// Drops IDs no longer present, then drops any not compatible with the
// first remaining entry (which becomes/stays the baseline).
export function pruneSelection(charts, selection) {
  const present = selection.filter(id => charts.some(c => c.id === id));
  if (present.length < 2) return present;
  const baseline = charts.find(c => c.id === present[0]);
  return present.filter((id, i) => {
    if (i === 0) return true;
    const chart = charts.find(c => c.id === id);
    return chart && areCompatible(baseline, chart);
  });
}

// Returns null if selection has fewer than 2 valid entries. Otherwise:
// { chartType: 'radar' | 'scatter',
//   traitOrder: string[],
//   series: [{ chartId, title, color, valuesByTrait: { [trait]: number } }],
//   deltaPair: { a, b } | null   // present only when exactly 2 selected
// }
export function buildComparisonView(charts, selection) {
  const cleanSel = pruneSelection(charts, selection);
  if (cleanSel.length < 2) return null;

  const baseline = charts.find(c => c.id === cleanSel[0]);
  const chartType = baseline.data.length === 2 ? 'scatter' : 'radar';
  const traitOrder = baseline.data.map(t => t.subject);

  const series = cleanSel.map(id => {
    const c = charts.find(x => x.id === id);
    const valuesByTrait = {};
    for (const t of c.data) valuesByTrait[t.subject] = t.value;
    return { chartId: c.id, title: c.title, color: c.color, valuesByTrait };
  });

  const deltaPair = cleanSel.length === 2
    ? { a: cleanSel[0], b: cleanSel[1] }
    : null;

  return { chartType, traitOrder, series, deltaPair };
}
```

- [ ] **Step 2: Lint passes**

Run: `npm run lint`
Expected: no errors involving the new file.

- [ ] **Step 3: Commit**

```bash
git add src/utils/compareCompatibility.js
git commit -m "Add compareCompatibility utility for chart-comparison feature"
```

---

## Task 2: Compare state in ChartContext

**Files:**
- Modify: `src/context/ChartContext.jsx`

- [ ] **Step 1: Add state and import**

At the top of `ChartContext.jsx`, alongside the existing React import:

```jsx
import { createContext, useContext, useState } from 'react';
import { pruneSelection } from '../utils/compareCompatibility';
```

Inside `ChartProvider`, immediately after `const [charts, setCharts] = useState(initialCharts);`:

```jsx
const [compareMode, setCompareMode] = useState(false);
const [compareSelection, setCompareSelection] = useState([]); // ordered chart IDs
```

- [ ] **Step 2: Add the three new action functions**

Add anywhere before the `return` statement in `ChartProvider`:

```jsx
const toggleCompareMode = () => {
  setCompareMode(prev => !prev);
  setCompareSelection([]); // clear on every transition (on→off and off→on)
};

const toggleChartInComparison = (chartId) => {
  setCompareSelection(prev => {
    if (prev.includes(chartId)) {
      return prev.filter(id => id !== chartId);
    }
    // appending: pruneSelection will reject if not compatible with baseline
    const next = [...prev, chartId];
    return pruneSelection(charts, next);
  });
};

const clearComparison = () => setCompareSelection([]);
```

- [ ] **Step 3: Export the new values through the provider**

Add `compareMode`, `compareSelection`, `toggleCompareMode`, `toggleChartInComparison`, `clearComparison` to the `value={{ ... }}` object passed to `<ChartContext.Provider>`.

- [ ] **Step 4: Lint and build pass**

Run: `npm run lint && npm run build`
Expected: builds cleanly, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/context/ChartContext.jsx
git commit -m "Add compare-mode state and actions to ChartContext"
```

---

## Task 3: Prune selection on chart mutations

**Files:**
- Modify: `src/context/ChartContext.jsx`

This task wraps the existing reducers that change chart structure so that `compareSelection` stays a valid set.

- [ ] **Step 1: Wrap `removeChart`**

Replace the existing `removeChart`:

```jsx
const removeChart = (chartId) => {
  setCharts(prevCharts => {
    const nextCharts = prevCharts.filter(chart => chart.id !== chartId);
    setCompareSelection(prevSel => pruneSelection(nextCharts, prevSel));
    return nextCharts;
  });
};
```

- [ ] **Step 2: Wrap `addTrait`, `removeTrait`, `updateTraitName`**

For each of these three functions, change the `setCharts(prevCharts => prevCharts.map(...))` body so the resulting `nextCharts` is computed first and then `setCompareSelection(prev => pruneSelection(nextCharts, prev))` is called before returning `nextCharts`. Example for `addTrait`:

```jsx
const addTrait = (chartId, traitName) => {
  if (!traitName.trim()) return;
  setCharts(prevCharts => {
    const nextCharts = prevCharts.map(chart =>
      chart.id === chartId
        ? {
            ...chart,
            data: [
              ...chart.data,
              { subject: traitName.trim(), value: 50, fullMark: 100 }
            ]
          }
        : chart
    );
    setCompareSelection(prev => pruneSelection(nextCharts, prev));
    return nextCharts;
  });
};
```

Apply the same pattern to `removeTrait` and `updateTraitName`.

- [ ] **Step 3: Wrap `transferTrait`**

`transferTrait` already returns early when source has ≤2 traits; preserve that, then wrap the map similarly:

```jsx
const transferTrait = (fromChartId, fromIndex, toChartId, toIndex = -1) => {
  setCharts(prevCharts => {
    const fromChart = prevCharts.find(c => c.id === fromChartId);
    if (!fromChart || fromChart.data.length <= 2) return prevCharts;

    const trait = fromChart.data[fromIndex];

    const nextCharts = prevCharts.map(chart => {
      if (chart.id === fromChartId) {
        return { ...chart, data: chart.data.filter((_, idx) => idx !== fromIndex) };
      }
      if (chart.id === toChartId) {
        const newData = [...chart.data];
        if (toIndex === -1 || toIndex >= newData.length) newData.push(trait);
        else newData.splice(toIndex, 0, trait);
        return { ...chart, data: newData };
      }
      return chart;
    });

    setCompareSelection(prev => pruneSelection(nextCharts, prev));
    return nextCharts;
  });
};
```

- [ ] **Step 4: Extend `importCharts` signature**

Replace `importCharts` with this version (accepts optional `comparisons` and clears or restores selection accordingly):

```jsx
const importCharts = (newCharts, mode = 'replace', comparisons = []) => {
  if (mode === 'replace') {
    setCharts(newCharts);
    const restored = comparisons[0]?.chartIds ?? [];
    setCompareSelection(pruneSelection(newCharts, restored));
  } else {
    setCharts(prev => {
      const appended = [...prev, ...newCharts.map((c, i) => ({
        ...c,
        id: Math.max(...prev.map(p => p.id), 0) + i + 1
      }))];
      // append mode: leave current selection alone; imported `comparisons` is
      // ignored because the imported IDs were remapped and would not match.
      return appended;
    });
  }
};
```

- [ ] **Step 5: Lint + build**

Run: `npm run lint && npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/context/ChartContext.jsx
git commit -m "Prune compareSelection on chart mutations and extend importCharts"
```

---

## Task 4: Compare toggle button in Control Panel header

**Files:**
- Modify: `src/components/ControlPanel.jsx`

- [ ] **Step 1: Import the icon and context fields**

At the top of `ControlPanel.jsx`, in the existing `lucide-react` import line, add `GitCompare`:

```jsx
import { Plus, Trash2, X, ChevronDown, ChevronUp, GripVertical, Lock, Unlock, Download, Upload, Image, FileJson, FileText, FileCode, GitCompare } from 'lucide-react';
```

Inside `ControlPanel` (around line 598), extend the destructure:

```jsx
const { charts, addNewChart, reorderCharts, importCharts, compareMode, compareSelection, toggleCompareMode } = useCharts();
```

- [ ] **Step 2: Add the toggle button to the action row**

In the header action row (the `<div className="flex items-center gap-2">` that contains the lock/import/export buttons, around line 755), insert a new button **before** the scroll-sync toggle:

```jsx
<button
  onClick={toggleCompareMode}
  className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
  style={{
    backgroundColor: compareMode ? '#c73a3a' : '#3d3d3d',
    color: compareMode ? '#ffffff' : '#888888'
  }}
  title={compareMode ? 'Compare mode ON (click to exit)' : 'Compare mode OFF (click to enter)'}
>
  <GitCompare size={13} />
</button>
```

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`

- [ ] **Step 4: Manual verify**

Run: `npm run dev` and open the app. Confirm the new icon appears in the Control Panel header next to Import/Export. Click it — the background should turn red (`#c73a3a`). Click again — back to neutral grey. No other UI changes yet.

- [ ] **Step 5: Commit**

```bash
git add src/components/ControlPanel.jsx
git commit -m "Add Compare toggle button to Control Panel header"
```

---

## Task 5: Checkbox in each ChartControls when compare mode is on

**Files:**
- Modify: `src/components/ControlPanel.jsx`

- [ ] **Step 1: Pull context fields into ChartControls**

Find `function ChartControls(...)` near line 239 and extend its `useCharts()` destructure:

```jsx
const { updateChartColor, addTrait, removeChart, updateChartTitle, reorderTraits, transferTrait, compareMode, compareSelection, toggleChartInComparison } = useCharts();
```

Add the `areCompatible` import at the top of the file:

```jsx
import { areCompatible } from '../utils/compareCompatibility';
```

- [ ] **Step 2: Compute checkbox state inside ChartControls**

Just after the `useEffect` for the mouseup listener (around line 257), add:

```jsx
const isSelected = compareSelection.includes(chart.id);
const baselineId = compareSelection[0];
const baseline = baselineId != null ? null : null; // placeholder — recomputed below
const baselineChart = baselineId != null ? null : null;
```

Replace those placeholders with the real lookup — use the `charts` array from context (also destructure it):

```jsx
const { charts: allCharts, updateChartColor, addTrait, removeChart, updateChartTitle, reorderTraits, transferTrait, compareMode, compareSelection, toggleChartInComparison } = useCharts();
```

Then compute:

```jsx
const isSelected = compareSelection.includes(chart.id);
const baselineId = compareSelection[0];
const baselineChart = baselineId != null ? allCharts.find(c => c.id === baselineId) : null;
const isEligible = !baselineChart
  || baselineChart.id === chart.id
  || areCompatible(baselineChart, chart);
```

- [ ] **Step 3: Render the checkbox in the header**

In the header row (the `<div className="flex items-center gap-2 flex-1">` around line 449), insert this **before** the color input:

```jsx
{compareMode && (
  <input
    type="checkbox"
    checked={isSelected}
    disabled={!isEligible}
    onChange={() => toggleChartInComparison(chart.id)}
    onMouseDown={(e) => e.stopPropagation()}
    className="w-4 h-4 cursor-pointer flex-shrink-0 transition-opacity"
    style={{
      accentColor: chart.color,
      opacity: isEligible ? 1 : 0.4,
      cursor: isEligible ? 'pointer' : 'not-allowed'
    }}
    title={isEligible
      ? (isSelected ? 'Remove from comparison' : 'Add to comparison')
      : "Different trait set — can't compare with selected charts"}
  />
)}
```

- [ ] **Step 4: Lint + build**

Run: `npm run lint && npm run build`

- [ ] **Step 5: Manual verify**

`npm run dev`. Click Compare toggle ON. Each chart now shows a checkbox. Check the Big Five chart — Ayran's checkbox stays enabled (matching trait names should make them eligible; if they don't match, modify one chart so traits match exactly to confirm the eligibility logic). Add or rename a trait on Ayran so its trait set differs from Big Five — its checkbox should grey out with a tooltip. Click Compare toggle OFF — checkboxes disappear and the previous selection clears.

- [ ] **Step 6: Commit**

```bash
git add src/components/ControlPanel.jsx
git commit -m "Show per-chart checkboxes with compatibility gating in compare mode"
```

---

## Task 6: ChartComparison component (radar + table)

**Files:**
- Create: `src/components/ChartComparison.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/ChartComparison.jsx
import { useMemo } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { X } from 'lucide-react';
import { useCharts } from '../context/ChartContext';
import { buildComparisonView } from '../utils/compareCompatibility';

export default function ChartComparison() {
  const { charts, compareMode, compareSelection, toggleChartInComparison, clearComparison } = useCharts();

  const view = useMemo(
    () => buildComparisonView(charts, compareSelection),
    [charts, compareSelection]
  );

  if (!compareMode) return null;

  // Hint state — compare mode is on but fewer than 2 selected.
  if (!view) {
    return (
      <div
        className="rounded-2xl p-4 mb-3"
        style={{ backgroundColor: '#2d2d2d', border: '1px dashed #c73a3a', color: '#888888' }}
      >
        <p className="text-sm text-center">Select 2+ charts with matching trait names to compare.</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-4 mb-3"
      style={{ backgroundColor: '#2d2d2d', border: '1px solid #c73a3a', contain: 'layout style' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#c73a3a' }}>
          Comparison
        </h3>
        <button
          onClick={clearComparison}
          data-html2canvas-ignore="true"
          className="p-1 rounded hover:bg-white/5 transition-colors"
          title="Clear comparison"
          style={{ color: '#888888' }}
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3" data-html2canvas-ignore="true">
        {view.series.map(s => (
          <span
            key={s.chartId}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
            style={{ backgroundColor: s.color + '30', color: '#d0d0d0' }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.title}
            <button
              onClick={() => toggleChartInComparison(s.chartId)}
              className="ml-1 opacity-60 hover:opacity-100"
              title="Remove from comparison"
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>

      {view.chartType === 'radar' && <RadarOverlay view={view} />}

      <DeltaTable view={view} />
    </div>
  );
}

function RadarOverlay({ view }) {
  // Recharts wants data shaped as [{ subject, [chartId]: value }, ...]
  const data = view.traitOrder.map(trait => {
    const row = { subject: trait };
    for (const s of view.series) row[`v${s.chartId}`] = s.valuesByTrait[trait] ?? 0;
    return row;
  });

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="#3d3d3d" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#d0d0d0', fontSize: 11 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#666', fontSize: 9 }} stroke="#3d3d3d" />
          {view.series.map(s => (
            <Radar
              key={s.chartId}
              name={s.title}
              dataKey={`v${s.chartId}`}
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.25}
              strokeWidth={2}
            />
          ))}
          <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #3d3d3d', color: '#d0d0d0' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DeltaTable({ view }) {
  const showDelta = view.deltaPair != null;
  const aId = view.deltaPair?.a;
  const bId = view.deltaPair?.b;

  const getValue = (chartId, trait) => {
    const s = view.series.find(x => x.chartId === chartId);
    return s?.valuesByTrait[trait] ?? 0;
  };

  return (
    <table className="w-full mt-4 text-xs" style={{ color: '#d0d0d0', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #3d3d3d' }}>
          <th className="text-left py-2 px-2" style={{ color: '#888888', fontWeight: 600 }}>Trait</th>
          {view.series.map(s => (
            <th key={s.chartId} className="text-right py-2 px-2" style={{ color: s.color, fontWeight: 600 }}>
              {s.title}
            </th>
          ))}
          {showDelta && (
            <th className="text-right py-2 px-2" style={{ color: '#888888', fontWeight: 600 }}>Δ</th>
          )}
        </tr>
      </thead>
      <tbody>
        {view.traitOrder.map(trait => {
          const delta = showDelta ? getValue(bId, trait) - getValue(aId, trait) : null;
          return (
            <tr key={trait} style={{ borderBottom: '1px solid #2a2a2a' }}>
              <td className="py-1.5 px-2">{trait}</td>
              {view.series.map(s => (
                <td key={s.chartId} className="text-right py-1.5 px-2 tabular-nums">
                  {getValue(s.chartId, trait)}
                </td>
              ))}
              {showDelta && (
                <td className="text-right py-1.5 px-2 tabular-nums" style={{ color: delta > 0 ? '#6bbf6b' : delta < 0 ? '#c73a3a' : '#888888' }}>
                  {delta > 0 ? `+${delta}` : delta}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Lint + build**

Run: `npm run lint && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/ChartComparison.jsx
git commit -m "Add ChartComparison component (radar overlay + delta table)"
```

---

## Task 7: Scatter overlay for 2-trait comparisons

**Files:**
- Modify: `src/components/ChartComparison.jsx`

- [ ] **Step 1: Add the ScatterOverlay component**

In `ChartComparison.jsx`, add this component (anywhere alongside `RadarOverlay`):

```jsx
function ScatterOverlay({ view }) {
  const [xTrait, yTrait] = view.traitOrder;

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 40 }}>
          <CartesianGrid stroke="#3d3d3d" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 100]}
            name={xTrait}
            label={{ value: xTrait, position: 'bottom', fill: '#d0d0d0', fontSize: 11 }}
            tick={{ fill: '#888', fontSize: 10 }}
            stroke="#3d3d3d"
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 100]}
            name={yTrait}
            label={{ value: yTrait, angle: -90, position: 'left', fill: '#d0d0d0', fontSize: 11 }}
            tick={{ fill: '#888', fontSize: 10 }}
            stroke="#3d3d3d"
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #3d3d3d', color: '#d0d0d0' }}
          />
          {view.series.map(s => (
            <Scatter
              key={s.chartId}
              name={s.title}
              data={[{ x: s.valuesByTrait[xTrait] ?? 0, y: s.valuesByTrait[yTrait] ?? 0 }]}
              fill={s.color}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Switch on chart type in the main render**

Replace the line:

```jsx
{view.chartType === 'radar' && <RadarOverlay view={view} />}
```

with:

```jsx
{view.chartType === 'radar' ? <RadarOverlay view={view} /> : <ScatterOverlay view={view} />}
```

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/components/ChartComparison.jsx
git commit -m "Add scatter overlay for 2-trait chart comparisons"
```

---

## Task 8: Mount ChartComparison in the View Panel

**Files:**
- Modify: `src/components/VisualizationCanvas.jsx`

- [ ] **Step 1: Import the component**

At the top of `VisualizationCanvas.jsx`:

```jsx
import ChartComparison from './ChartComparison';
```

- [ ] **Step 2: Render it above the chart grid**

Inside the outer `<div ref={ref} ...>` (around line 131), after the header `</div>` that closes the title/logo section (around line 200), and **before** `<div className="relative">`, insert:

```jsx
<ChartComparison />
```

So the layout becomes: title header → comparison card → chart grid.

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`

- [ ] **Step 4: Manual verify — end-to-end radar**

`npm run dev`. Toggle Compare ON. Check Big Five and Ayran (assuming you've made their trait names match — if not, edit one to match the other). The comparison card appears above the chart grid with overlay radar + delta table. The Δ column shows the value differences. Toggle a third chart — Δ column disappears, third value column appears. Uncheck one — Δ returns. Click the × in a color chip to remove that chart from the comparison.

- [ ] **Step 5: Manual verify — end-to-end scatter**

Create two new charts, each with exactly 2 traits with matching names (e.g. "Risk" and "Reward"). Toggle them both in compare mode. The overlay should be a scatter chart with two colored dots, and the delta table should have two rows.

- [ ] **Step 6: Manual verify — pruning**

With two charts selected in comparison, rename a trait in one so the trait sets diverge. The card should immediately drop the affected chart and fall back to the hint state if fewer than 2 remain.

- [ ] **Step 7: Commit**

```bash
git add src/components/VisualizationCanvas.jsx
git commit -m "Mount ChartComparison above the chart grid in the View Panel"
```

---

## Task 9: Wire comparisons through export and import

**Files:**
- Modify: `src/utils/exportFormats.js`
- Modify: `src/components/ControlPanel.jsx`

- [ ] **Step 1: Extend `exportAsJson`**

Replace the existing `exportAsJson` in `src/utils/exportFormats.js`:

```js
export function exportAsJson(title, description, charts, comparisons = []) {
  const payload = {
    doxa_version: '1.0',
    title,
    description,
    charts: charts.map(c => ({
      title: c.title,
      color: c.color,
      traits: c.data.map(t => ({ name: t.subject, value: t.value })),
    })),
    comparisons: comparisons.map(c => ({ chartIds: c.chartIds })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `${safeName(title)}.json`);
}
```

- [ ] **Step 2: Extend `exportAsMarkdown` with a comparison section**

Replace `exportAsMarkdown` in `src/utils/exportFormats.js`:

```js
export function exportAsMarkdown(title, description, charts, comparisons = []) {
  let md = `# ${title}\n`;
  if (description) md += `> ${description}\n`;
  md += '\n';

  for (const chart of charts) {
    md += `## ${chart.title}\n`;
    md += '| Trait | Value |\n';
    md += '|-------|-------|\n';
    for (const trait of chart.data) {
      md += `| ${trait.subject} | ${trait.value} |\n`;
    }
    md += '\n';
  }

  for (const cmp of comparisons) {
    const sel = cmp.chartIds
      .map(id => charts.find(c => c.id === id))
      .filter(Boolean);
    if (sel.length < 2) continue;

    const traitOrder = sel[0].data.map(t => t.subject);
    md += `## Comparison\n`;
    md += `| Trait | ${sel.map(c => c.title).join(' | ')}${sel.length === 2 ? ' | Δ' : ''} |\n`;
    md += `|-------|${sel.map(() => '------').join('|')}${sel.length === 2 ? '|------' : ''}|\n`;
    for (const trait of traitOrder) {
      const values = sel.map(c => {
        const t = c.data.find(x => x.subject === trait);
        return t ? t.value : '';
      });
      let row = `| ${trait} | ${values.join(' | ')}`;
      if (sel.length === 2) {
        const d = (values[1] ?? 0) - (values[0] ?? 0);
        row += ` | ${d > 0 ? `+${d}` : d}`;
      }
      md += row + ' |\n';
    }
    md += '\n';
  }

  const blob = new Blob([md], { type: 'text/markdown' });
  triggerDownload(blob, `${safeName(title)}.md`);
}
```

- [ ] **Step 3: Extend `parseImportJson`**

Replace the `return` at the bottom of `parseImportJson`:

```js
  return {
    title: data.title || 'Imported Analysis',
    description: data.description || '',
    charts,
    comparisons: Array.isArray(data.comparisons) ? data.comparisons : [],
  };
```

- [ ] **Step 4: Wire ControlPanel export handlers**

In `ControlPanel.jsx`, extend the `useCharts()` destructure inside the main `ControlPanel` function (around line 598) to also pull `compareSelection`:

```jsx
const { charts, addNewChart, reorderCharts, importCharts, compareMode, compareSelection, toggleCompareMode } = useCharts();
```

Replace `handleExportJson`:

```jsx
const handleExportJson = () => {
  const comparisons = compareSelection.length >= 2 ? [{ chartIds: compareSelection }] : [];
  exportAsJson(analysisTitle, analysisDescription, charts, comparisons);
  setExportOpen(false);
};
```

Replace `handleExportMarkdown`:

```jsx
const handleExportMarkdown = () => {
  const comparisons = compareSelection.length >= 2 ? [{ chartIds: compareSelection }] : [];
  exportAsMarkdown(analysisTitle, analysisDescription, charts, comparisons);
  setExportOpen(false);
};
```

- [ ] **Step 5: Wire the import-confirm handler**

Find `handleImportConfirm` in `ControlPanel.jsx` (it calls `importCharts(importPrompt.charts, mode)`). Change the call to pass the parsed comparisons through:

```jsx
importCharts(importPrompt.charts, mode, importPrompt.comparisons);
```

And in the import file handler where `parseImportJson` is called and `importPrompt` is set, include `comparisons` from the parse result:

```jsx
const result = parseImportJson(evt.target.result);
setImportPrompt({
  title: result.title,
  description: result.description,
  charts: result.charts,
  comparisons: result.comparisons,
});
```

(Adjust to match the existing call shape — read the surrounding code first; if the current handler sets only `{ title, charts }`, add `comparisons` alongside.)

- [ ] **Step 6: Lint + build**

Run: `npm run lint && npm run build`

- [ ] **Step 7: Auto-enable compareMode on import with restored selection**

Update `importCharts`'s replace branch in `src/context/ChartContext.jsx` so an imported file with a saved comparison automatically activates compare mode (otherwise the restored selection would be invisible until the user toggles):

```jsx
if (mode === 'replace') {
  setCharts(newCharts);
  const restored = comparisons[0]?.chartIds ?? [];
  const pruned = pruneSelection(newCharts, restored);
  setCompareSelection(pruned);
  if (pruned.length >= 2) setCompareMode(true);
}
```

- [ ] **Step 8: Manual verify — JSON round-trip**

Run `npm run dev`. Enter compare mode, select 2 compatible charts. Click Export → JSON Data. Open the downloaded file in a text editor: confirm `comparisons: [{ chartIds: [...] }]` is present and the IDs match. Reload the app, click Import, pick the file, choose Replace. The comparison card should appear immediately (compare mode auto-enabled) with the saved selection restored.

- [ ] **Step 9: Manual verify — Markdown export**

Export Markdown with a comparison active. Open the file. Confirm a `## Comparison` section exists with rows for each trait, a column per selected chart, and a Δ column when exactly 2 are selected.

- [ ] **Step 10: Commit**

```bash
git add src/utils/exportFormats.js src/components/ControlPanel.jsx src/context/ChartContext.jsx
git commit -m "Carry comparison selection through JSON/Markdown export and import"
```

---

## Task 10: Full manual verification pass

**Files:** none modified directly; bug fixes may surface and require returning to earlier tasks.

- [ ] **Step 1: Run the spec testing checklist**

Run `npm run dev` and walk through all 12 cases from the spec's "Testing checklist" section (`docs/superpowers/specs/2026-05-17-chart-comparison-design.md`). Fix any failures by editing the relevant source file; commit fixes with messages like `Fix N: <thing>` referencing the checklist item.

- [ ] **Step 2: PNG/SVG export check**

With a comparison active, click Export → PNG Image. Open the downloaded PNG. The comparison card (title + overlay + table) must appear; the × close button and chip × removers must NOT appear (because of `data-html2canvas-ignore`). Repeat for SVG.

- [ ] **Step 3: Mobile layout check**

Resize browser below the `lg` breakpoint (< 1024px). Switch to the Control tab — Compare button and per-chart checkboxes should work. Switch to the View tab — comparison card should render at the top of the canvas above the charts.

- [ ] **Step 4: Final lint + build**

```bash
npm run lint && npm run build
```

Expected: both succeed.

- [ ] **Step 5: Commit any final fixes; no commit if nothing changed**
