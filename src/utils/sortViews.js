// Pure display-mode sorting. Never mutates input — returns new arrays.

const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

export function sortedChartData(chart) {
  const mode = chart.sortMode || 'custom';
  if (mode === 'custom') return chart.data;

  const copy = [...chart.data];
  switch (mode) {
    case 'value-asc':  return copy.sort((a, b) => a.value - b.value);
    case 'value-desc': return copy.sort((a, b) => b.value - a.value);
    case 'name-asc':   return copy.sort((a, b) => collator.compare(a.subject, b.subject));
    case 'name-desc':  return copy.sort((a, b) => collator.compare(b.subject, a.subject));
    default:           return chart.data;
  }
}

export function sortedComparisonView(view, slotSortMode = 'custom', rowSortMode = 'custom') {
  if (!view) return null;

  let series = view.series;
  if (slotSortMode !== 'custom') {
    series = [...series];
    if (slotSortMode === 'title-asc') series.sort((a, b) => collator.compare(a.title, b.title));
    else if (slotSortMode === 'title-desc') series.sort((a, b) => collator.compare(b.title, a.title));
  }

  let traitOrder = view.traitOrder;
  const deltaActive = !!view.deltaPair;
  const effectiveRowMode = (!deltaActive && (rowSortMode === 'delta-asc' || rowSortMode === 'delta-desc'))
    ? 'custom'
    : rowSortMode;

  if (effectiveRowMode !== 'custom') {
    const baselineSeries = view.series[0];
    const aId = view.deltaPair?.a;
    const bId = view.deltaPair?.b;
    const aSeries = view.series.find(s => s.chartId === aId);
    const bSeries = view.series.find(s => s.chartId === bId);

    const baselineValue = (trait) => baselineSeries.valuesByTrait[trait] ?? 0;
    const deltaValue = (trait) => (bSeries.valuesByTrait[trait] ?? 0) - (aSeries.valuesByTrait[trait] ?? 0);

    traitOrder = [...traitOrder];
    switch (effectiveRowMode) {
      case 'name-asc':   traitOrder.sort((a, b) => collator.compare(a, b)); break;
      case 'name-desc':  traitOrder.sort((a, b) => collator.compare(b, a)); break;
      case 'value-asc':  traitOrder.sort((a, b) => baselineValue(a) - baselineValue(b)); break;
      case 'value-desc': traitOrder.sort((a, b) => baselineValue(b) - baselineValue(a)); break;
      case 'delta-asc':  traitOrder.sort((a, b) => deltaValue(a) - deltaValue(b)); break;
      case 'delta-desc': traitOrder.sort((a, b) => deltaValue(b) - deltaValue(a)); break;
    }
  }

  return { ...view, series, traitOrder };
}
