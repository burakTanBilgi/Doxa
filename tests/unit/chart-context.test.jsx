import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ChartProvider, useCharts } from '../../src/context/ChartContext.jsx';

function wrap({ children }) {
  return <ChartProvider>{children}</ChartProvider>;
}

describe('ChartContext: serializeProject / loadProject round-trip', () => {
  it('seeds with defaults — non-empty title, charts, no comparisons', () => {
    const { result } = renderHook(() => useCharts(), { wrapper: wrap });
    expect(result.current.analysisTitle.length).toBeGreaterThan(0);
    expect(result.current.charts.length).toBeGreaterThan(0);
    expect(result.current.comparisons).toEqual([]);
  });

  it('serializeProject returns the full payload shape Hakoniwa needs', () => {
    const { result } = renderHook(() => useCharts(), { wrapper: wrap });
    const payload = result.current.serializeProject();

    expect(payload).toMatchObject({
      doxa_version: '1.0',
      title: expect.any(String),
      description: expect.any(String),
      charts: expect.any(Array),
      comparisons: expect.any(Array),
      compareSelection: expect.any(Array),
    });

    // Hakoniwa consumes payload.charts directly — they must keep the live
    // in-memory shape, NOT the export-time {traits, name} renames.
    const firstChart = payload.charts[0];
    expect(firstChart).toHaveProperty('data');
    expect(firstChart.data[0]).toHaveProperty('subject');
    expect(firstChart.data[0]).toHaveProperty('value');
    expect(firstChart.data[0]).toHaveProperty('fullMark');
    expect(firstChart).not.toHaveProperty('traits');
  });

  it('compareSelection is the union of every chart id referenced by any comparison', () => {
    const { result } = renderHook(() => useCharts(), { wrapper: wrap });

    // setComparisonChartIds calls pruneSelection which drops trait-incompatible
    // charts, so we need three siblings with identical trait sets. Duplicating
    // the first default chart twice is the cheapest way to get them.
    const original = result.current.charts[0];
    act(() => { result.current.duplicateChart(original.id); });
    act(() => { result.current.duplicateChart(original.id); });

    const compatible = result.current.charts.filter(c =>
      c.data.length === original.data.length &&
      c.data.every((t, i) => t.subject === original.data[i].subject)
    );
    expect(compatible.length).toBeGreaterThanOrEqual(3);
    const [chartA, chartB, chartC] = compatible;

    act(() => { result.current.addComparison(); });
    act(() => { result.current.addComparison(); });
    act(() => {
      result.current.setComparisonChartIds(result.current.comparisons[0].id, [chartA.id, chartB.id]);
    });
    act(() => {
      result.current.setComparisonChartIds(result.current.comparisons[1].id, [chartB.id, chartC.id]);
    });

    const payload = result.current.serializeProject();
    expect([...payload.compareSelection].sort((a, b) => a - b))
      .toEqual([chartA.id, chartB.id, chartC.id].sort((a, b) => a - b));
  });

  it('loadProject replaces title, description, charts, and comparisons atomically', () => {
    const { result } = renderHook(() => useCharts(), { wrapper: wrap });

    const newPayload = {
      doxa_version: '1.0',
      title: 'Loaded Title',
      description: 'Loaded Description',
      charts: [
        {
          id: 999,
          title: 'New Chart',
          color: '#abcdef',
          data: [
            { subject: 'X', value: 10, fullMark: 100 },
            { subject: 'Y', value: 20, fullMark: 100 },
            { subject: 'Z', value: 30, fullMark: 100 },
          ],
        },
      ],
      comparisons: [],
    };

    act(() => { result.current.loadProject(newPayload); });

    expect(result.current.analysisTitle).toBe('Loaded Title');
    expect(result.current.analysisDescription).toBe('Loaded Description');
    expect(result.current.charts).toHaveLength(1);
    expect(result.current.charts[0].title).toBe('New Chart');
    expect(result.current.charts[0].data[0].subject).toBe('X');
  });

  it('round-trip: serialize → loadProject yields the same observable state', () => {
    const { result } = renderHook(() => useCharts(), { wrapper: wrap });

    // Mutate first so we're not just round-tripping the defaults.
    act(() => { result.current.setAnalysisTitle('My Profile'); });
    act(() => { result.current.setAnalysisDescription('My description'); });
    act(() => { result.current.updateTraitValue(result.current.charts[0].id, 0, 42); });

    // Duplicate the first chart to get two trait-compatible siblings for the
    // comparison (the three default charts intentionally have disjoint traits).
    const base = result.current.charts[0];
    act(() => { result.current.duplicateChart(base.id); });
    const a = base.id;
    const copy = result.current.charts.find(c => c.id !== a && c.title.endsWith('copy'));
    const b = copy.id;

    act(() => { result.current.addComparison(); });
    act(() => {
      result.current.setComparisonChartIds(result.current.comparisons[0].id, [a, b]);
    });

    const snapshot = result.current.serializeProject();

    // Reset to something different, then load the snapshot back.
    act(() => {
      result.current.loadProject({
        doxa_version: '1.0',
        title: 'temp',
        description: 'temp',
        charts: [],
        comparisons: [],
      });
    });
    expect(result.current.charts).toHaveLength(0);

    act(() => { result.current.loadProject(snapshot); });

    expect(result.current.analysisTitle).toBe('My Profile');
    expect(result.current.analysisDescription).toBe('My description');
    expect(result.current.charts[0].data[0].value).toBe(42);
    expect(result.current.comparisons).toHaveLength(1);
    expect([...result.current.comparisons[0].chartIds].sort((x, y) => x - y))
      .toEqual([a, b].sort((x, y) => x - y));
  });

  it('loadProject bumps loadEpoch so the projects layer can suppress the next autosave', () => {
    const { result } = renderHook(() => useCharts(), { wrapper: wrap });
    const before = result.current.loadEpoch;
    act(() => { result.current.loadProject({ title: 'x', charts: [], comparisons: [] }); });
    expect(result.current.loadEpoch).toBeGreaterThan(before);
  });

  it('loadProject prunes dangling comparison chartIds that no longer exist', () => {
    const { result } = renderHook(() => useCharts(), { wrapper: wrap });
    act(() => {
      result.current.loadProject({
        title: 't',
        description: '',
        charts: [
          { id: 1, title: 'A', color: '#aaaaaa', data: [
            { subject: 'x', value: 1, fullMark: 100 },
            { subject: 'y', value: 2, fullMark: 100 },
            { subject: 'z', value: 3, fullMark: 100 },
          ] },
        ],
        comparisons: [
          { id: 1, title: 'cmp', color: '#aaaaaa', chartIds: [1, 999, 1000], slotSortMode: 'custom', rowSortMode: 'custom', showDelta: false, aggregateColumns: [], aggregateRows: [] },
        ],
      });
    });
    // Only chart id 1 exists — pruneSelection should drop 999 and 1000.
    expect(result.current.comparisons[0].chartIds).toEqual([1]);
  });

  it('loadProject is idempotent under a re-load of the same payload', () => {
    const { result } = renderHook(() => useCharts(), { wrapper: wrap });
    const payload = result.current.serializeProject();
    act(() => { result.current.loadProject(payload); });
    const after1 = result.current.serializeProject();
    act(() => { result.current.loadProject(after1); });
    const after2 = result.current.serializeProject();
    expect(after2).toEqual(after1);
  });

  it('loadProject with null/undefined payload is a safe no-op', () => {
    const { result } = renderHook(() => useCharts(), { wrapper: wrap });
    const before = result.current.serializeProject();
    act(() => { result.current.loadProject(null); });
    act(() => { result.current.loadProject(undefined); });
    expect(result.current.serializeProject()).toEqual(before);
  });
});
