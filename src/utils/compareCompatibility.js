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
