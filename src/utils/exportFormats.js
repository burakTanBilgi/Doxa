import { sortedChartData, sortedComparisonView } from './sortViews';
import { buildComparisonView } from './compareCompatibility';
import { AGGREGATE_BY_KEY, formatAggregate } from './aggregates';

/**
 * Export chart data as a downloadable JSON file.
 */
export function exportAsJson(title, description, charts, comparisons = []) {
  const idToIndex = new Map(charts.map((c, i) => [c.id, i]));
  const payload = {
    doxa_version: '1.0',
    title,
    description,
    charts: charts.map(c => ({
      title: c.title,
      color: c.color,
      description: c.description || '',
      traits: c.data.map(t => ({
        name: t.subject,
        value: t.value,
        description: t.description || '',
      })),
      sortMode: c.sortMode || 'custom',
    })),
    comparisons: comparisons.map(c => ({
      title: c.title,
      description: c.description || '',
      color: c.color || '#c73a3a',
      chartIndices: c.chartIds
        .map(id => idToIndex.get(id))
        .filter(idx => idx !== undefined),
      slotSortMode: c.slotSortMode || 'custom',
      rowSortMode: c.rowSortMode || 'custom',
      showDelta: c.showDelta === true,
      aggregateColumns: c.aggregateColumns || [],
      aggregateRows: c.aggregateRows || [],
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `${safeName(title)}.json`);
}

/**
 * Export chart data as a human-readable Markdown file.
 *
 * `t` is the i18next translate function — only the structural vocabulary
 * (the "Trait" header, aggregate-row labels, the fallback comparison name) is
 * translated to the active language. User-authored text stays as-is.
 */
export function exportAsMarkdown(title, description, charts, comparisons = [], t) {
  let md = `# ${title}\n`;
  if (description) md += `> ${description}\n`;
  md += '\n';

  for (const chart of charts) {
    md += `## ${chart.title}\n`;
    if (chart.description) md += `_${chart.description}_\n\n`;
    const hasTraitDescriptions = chart.data.some(t => t.description);
    md += hasTraitDescriptions
      ? '| Trait | Value | Notes |\n|-------|-------|-------|\n'
      : '| Trait | Value |\n|-------|-------|\n';
    for (const trait of sortedChartData(chart)) {
      md += hasTraitDescriptions
        ? `| ${trait.subject} | ${trait.value} | ${trait.description || ''} |\n`
        : `| ${trait.subject} | ${trait.value} |\n`;
    }
    md += '\n';
  }

  for (const cmp of comparisons) {
    const rawView = buildComparisonView(charts, cmp.chartIds);
    if (!rawView) continue;
    const gated = cmp.showDelta === true ? rawView : { ...rawView, deltaPair: null };
    const view = sortedComparisonView(gated, cmp.slotSortMode, cmp.rowSortMode);
    if (!view) continue;

    md += `## ${cmp.title || t('comparison.defaultName')}\n`;
    if (cmp.description) md += `_${cmp.description}_\n\n`;

    const titles = view.series.map(s => s.title);
    const showDelta = view.deltaPair != null;
    const colAggs = (cmp.aggregateColumns || []).map(k => AGGREGATE_BY_KEY[k]).filter(Boolean);
    const rowAggs = (cmp.aggregateRows || []).map(k => AGGREGATE_BY_KEY[k]).filter(Boolean);
    const colCount = view.series.length + colAggs.length + (showDelta ? 1 : 0);

    const headerTail = [
      ...titles,
      ...colAggs.map(a => t(`stats.${a.key}`)),
      ...(showDelta ? ['Δ'] : []),
    ];
    md += `| ${t('comparison.traitHeader')} | ${headerTail.join(' | ')} |\n`;
    md += `|-------|${Array(colCount).fill('------').join('|')}|\n`;

    for (const trait of view.traitOrder) {
      const rowValues = view.series.map(s => s.valuesByTrait[trait] ?? 0);
      const cells = [
        ...rowValues,
        ...colAggs.map(a => formatAggregate(a.compute(rowValues))),
      ];
      if (showDelta) {
        const a = view.series.find(s => s.chartId === view.deltaPair.a).valuesByTrait[trait] ?? 0;
        const b = view.series.find(s => s.chartId === view.deltaPair.b).valuesByTrait[trait] ?? 0;
        const d = b - a;
        cells.push(d > 0 ? `+${d}` : `${d}`);
      }
      md += `| ${trait} | ${cells.join(' | ')} |\n`;
    }

    for (const agg of rowAggs) {
      const seriesValues = view.series.map(s => view.traitOrder.map(t => s.valuesByTrait[t] ?? 0));
      const perChart = seriesValues.map(vs => formatAggregate(agg.compute(vs)));
      // Aggregate-row × aggregate-col cell = row agg applied to the column's per-trait results.
      const perCol = colAggs.map(colAgg =>
        formatAggregate(agg.compute(
          view.traitOrder.map(t => colAgg.compute(view.series.map(s => s.valuesByTrait[t] ?? 0)))
        ))
      );
      let deltaCell = '';
      if (showDelta) {
        const aVals = view.traitOrder.map(t => view.series.find(s => s.chartId === view.deltaPair.a).valuesByTrait[t] ?? 0);
        const bVals = view.traitOrder.map(t => view.series.find(s => s.chartId === view.deltaPair.b).valuesByTrait[t] ?? 0);
        const deltaPerTrait = aVals.map((a, i) => bVals[i] - a);
        deltaCell = formatAggregate(agg.compute(deltaPerTrait));
      }
      const cells = [...perChart, ...perCol, ...(showDelta ? [deltaCell] : [])];
      md += `| _${t(`stats.${agg.key}`)}_ | ${cells.join(' | ')} |\n`;
    }
    md += '\n';
  }

  const blob = new Blob([md], { type: 'text/markdown' });
  triggerDownload(blob, `${safeName(title)}.md`);
}

/**
 * Parse and validate a Doxa JSON import file.
 * Returns { title, description, charts } in internal format or throws.
 */
export function parseImportJson(text) {
  const data = JSON.parse(text);

  if (!data || !Array.isArray(data.charts)) {
    throw new Error('Invalid Doxa file: missing charts array');
  }

  const charts = data.charts.map((c, i) => {
    if (!c.title || !Array.isArray(c.traits)) {
      throw new Error(`Invalid chart at index ${i}`);
    }
    return {
      id: Date.now() + i,
      title: c.title,
      color: c.color || '#888888',
      description: c.description || '',
      data: c.traits.map(t => ({
        subject: t.name,
        value: typeof t.value === 'number' ? Math.min(100, Math.max(0, t.value)) : 50,
        fullMark: 100,
        description: t.description || '',
      })),
      sortMode: c.sortMode || 'custom',
    };
  });

  const comparisons = Array.isArray(data.comparisons)
    ? data.comparisons
        .map((c, i) => ({
          title: c.title || `Comparison ${i + 1}`,
          description: c.description || '',
          color: c.color || '#c73a3a',
          chartIds: (c.chartIndices || [])
            .map(idx => charts[idx]?.id)
            .filter(id => id !== undefined),
          slotSortMode: c.slotSortMode || 'custom',
          rowSortMode: c.rowSortMode || 'custom',
          showDelta: c.showDelta === true,
          aggregateColumns: Array.isArray(c.aggregateColumns) ? c.aggregateColumns : [],
          aggregateRows: Array.isArray(c.aggregateRows) ? c.aggregateRows : [],
        }))
        .filter(c => c.chartIds.length >= 1)
    : [];

  return {
    title: data.title || 'Imported Analysis',
    description: data.description || '',
    charts,
    comparisons,
  };
}

// --- helpers ---

function safeName(title) {
  return (title || 'doxa-export').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
