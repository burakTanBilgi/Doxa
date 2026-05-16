# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server.
- `npm run build` — production build (Vite, output to `dist/`).
- `npm run preview` — preview built bundle.
- `npm run lint` — ESLint over the whole repo (config in `eslint.config.js`; `no-unused-vars` ignores `^[A-Z_]` so SVG icon imports and constants can stay).

No test runner is configured — there are no unit/integration tests in this project. Verify changes by running `npm run dev` and exercising the UI (desktop + mobile breakpoint, both chart types, drag, import/export).

Deploys via Netlify (`netlify.toml`): build command `npm run build`, publish dir `dist`.

## Architecture

Single-page React app. All chart state lives in one React Context; there is no router, no backend, no persistence layer — state is in-memory, and "save" means exporting JSON.

### State model

`src/context/ChartContext.jsx` owns the entire `charts` array. Each chart is:

```js
{ id, title, color, data: [{ subject, value, fullMark }, ...] }
```

Constraints encoded in the reducers (not types):

- `data.length === 2` renders a 2D scatter chart; `>= 3` renders a radar chart. `ChartDisplay` switches on length.
- `transferTrait` refuses to move a trait out of a chart with `length <= 2` (would break both chart-type invariant and minimum trait count).
- New chart colors are picked by `generateDuskyColor`, which weights HSL hue candidates by distance from existing chart colors to avoid collisions — preserve this if adding chart-creation paths.
- `importCharts(newCharts, mode)` takes `'replace'` or `'append'`; append remaps `id`s to avoid collisions with existing charts.

### Layout & scroll sync

`App.jsx` is the layout + chrome. Two scrollable panels (`leftPanelRef` Control, `rightPanelRef` View) are kept in proportional sync — when one is at X% scrolled, the other is moved to X% as well. Key details:

- `isSyncingRef` flag + double-`requestAnimationFrame` prevents recursive scroll events.
- Sync is disabled below the `lg` breakpoint (only one panel visible) and can be toggled by the user, but only when `bothAtTop` (avoids snap-jumps mid-scroll).
- `mobileTab` (`'control' | 'view'`) hides one panel below `lg`.

### Components

- `ControlPanel.jsx` — left panel; per-chart editor (title, color, traits with sliders), import/export UI, "Add Chart" button.
- `VisualizationCanvas.jsx` — right panel grid; renders one `ChartDisplay` per chart; owns chart-level drag-drop reorder.
- `ChartDisplay.jsx` — picks `RadarChartDisplay` vs `TwoFieldChart` based on `data.length`; inline-editable title and axis labels (click to edit).
- `utils/exportFormats.js` — `exportAsJson`, `exportAsMarkdown`, `parseImportJson`. PNG/SVG export lives in `App.jsx` and uses `html-to-image` against `canvasRef` (the right panel content).

### Patterns to preserve

- `MemoizedControlPanel` / `MemoizedVisualizationCanvas` are `memo()`-wrapped in `App.jsx`. New props passed in must be stable (memo/`useCallback`) or memoization breaks.
- Custom HTML5 drag previews are DOM nodes appended to body at `position: fixed; top: -1000px`, passed to `setDragImage`, then cleaned up. Two drag systems coexist: chart panel drag (header/footer grab handles, gated by `isDragHandleHeld` to ignore drags starting on interactive children) and trait drag (per-row grip icon, supports cross-chart transfer via `transferTrait`).
- `data-html2canvas-ignore="true"` excludes elements from PNG/SVG export — use on any chrome that shouldn't appear in exports.
- Styling: TailwindCSS utilities + inline `style={{}}` for dynamic values (chart colors, dynamic opacity). Plain JSX, no TypeScript.

## When making changes

From `SCANME.md` (still applicable):

- Don't strip transitions/animations or `memo()`/`will-change`/`contain` hints — performance was deliberately tuned.
- Test both chart shapes (2 traits → scatter, 3+ → radar) and the boundary when adding/removing traits crosses it.
- Test JSON export → import round-trip in both replace and append modes.
- Test the mobile (`< lg`) layout: tab switcher, scroll sync disabled, drag interactions.

## Commit style

`SCANME.md` documents a `[ACTION] description` + `Context/Changes/Notes` body convention (`[FEAT]`, `[FIX]`, `[REFACTOR]`, `[STYLE]`, `[PERF]`, `[DOCS]`). Recent commits on `main` (`git log`) do **not** follow this format — they are short imperative summaries. Match the surrounding recent history unless the user asks otherwise.
