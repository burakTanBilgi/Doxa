import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { pruneSelection } from '../utils/compareCompatibility';
import { DEFAULT_TITLE, DEFAULT_DESCRIPTION } from './defaultCharts';

const ChartContext = createContext(null);

export function ChartProvider({ children }) {
  const [charts, setCharts] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [analysisTitle, setAnalysisTitle] = useState(DEFAULT_TITLE);
  const [analysisDescription, setAnalysisDescription] = useState(DEFAULT_DESCRIPTION);
  // Bumped on every loadProject() so ProjectsContext can suppress the
  // immediate autosave that would otherwise re-write the row we just read.
  const [loadEpoch, setLoadEpoch] = useState(0);
  const loadEpochRef = useRef(0);

  const pruneAllComparisons = (nextCharts) =>
    setComparisons(prev =>
      prev.map(cmp => ({ ...cmp, chartIds: pruneSelection(nextCharts, cmp.chartIds) }))
    );

  const addComparison = () => {
    setComparisons(prev => {
      const newId = Math.max(0, ...prev.map(c => c.id)) + 1;
      const existingColors = [...prev.map(c => c.color || '#c73a3a'), ...charts.map(c => c.color)];
      return [...prev, {
        id: newId,
        title: `Comparison ${prev.length + 1}`,
        description: '',
        color: generateDuskyColor(existingColors),
        chartIds: [],
        slotSortMode: 'custom',
        rowSortMode: 'custom',
        showDelta: false,
        aggregateColumns: [],
        aggregateRows: [],
      }];
    });
  };

  const removeComparison = (cmpId) => {
    setComparisons(prev => prev.filter(c => c.id !== cmpId));
  };

  const updateComparisonTitle = (cmpId, newTitle) => {
    if (!newTitle.trim()) return;
    setComparisons(prev =>
      prev.map(c => c.id === cmpId ? { ...c, title: newTitle.trim() } : c)
    );
  };

  const updateComparisonColor = (cmpId, newColor) => {
    setComparisons(prev =>
      prev.map(c => c.id === cmpId ? { ...c, color: newColor } : c)
    );
  };

  const setComparisonChartIds = (cmpId, chartIds) => {
    setComparisons(prev =>
      prev.map(c => c.id === cmpId ? { ...c, chartIds: pruneSelection(charts, chartIds) } : c)
    );
  };

  const duplicateComparison = (cmpId) => {
    setComparisons(prev => {
      const idx = prev.findIndex(c => c.id === cmpId);
      if (idx === -1) return prev;
      const source = prev[idx];
      const newId = Math.max(0, ...prev.map(c => c.id)) + 1;
      const copy = {
        id: newId,
        title: `${source.title} copy`,
        description: source.description || '',
        color: source.color || '#c73a3a',
        chartIds: [...source.chartIds],
        slotSortMode: source.slotSortMode || 'custom',
        rowSortMode: source.rowSortMode || 'custom',
        showDelta: source.showDelta === true,
        aggregateColumns: [...(source.aggregateColumns || [])],
        aggregateRows: [...(source.aggregateRows || [])],
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const reorderComparisons = (fromIndex, toIndex) => {
    setComparisons(prev => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  };

  const duplicateChart = (chartId) => {
    setCharts(prev => {
      const idx = prev.findIndex(c => c.id === chartId);
      if (idx === -1) return prev;
      const source = prev[idx];
      const newId = Math.max(0, ...prev.map(c => c.id)) + 1;
      const copy = {
        id: newId,
        title: `${source.title} copy`,
        color: source.color,
        description: source.description || '',
        data: source.data.map(t => ({ ...t })),
        sortMode: source.sortMode || 'custom',
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const setChartSortMode = (chartId, mode) => {
    setCharts(prev => prev.map(c => c.id === chartId ? { ...c, sortMode: mode } : c));
  };

  const setComparisonSlotSortMode = (cmpId, mode) => {
    setComparisons(prev => prev.map(c => c.id === cmpId ? { ...c, slotSortMode: mode } : c));
  };

  const setComparisonRowSortMode = (cmpId, mode) => {
    setComparisons(prev => prev.map(c => c.id === cmpId ? { ...c, rowSortMode: mode } : c));
  };

  const updateChartDescription = (chartId, description) => {
    setCharts(prev => prev.map(c => c.id === chartId ? { ...c, description } : c));
  };

  const updateComparisonDescription = (cmpId, description) => {
    setComparisons(prev => prev.map(c => c.id === cmpId ? { ...c, description } : c));
  };

  const setComparisonShowDelta = (cmpId, value) => {
    setComparisons(prev => prev.map(c => c.id === cmpId ? { ...c, showDelta: !!value } : c));
  };

  const toggleComparisonAggregate = (cmpId, kind, key) => {
    const field = kind === 'rows' ? 'aggregateRows' : 'aggregateColumns';
    setComparisons(prev => prev.map(c => {
      if (c.id !== cmpId) return c;
      const current = c[field] || [];
      const next = current.includes(key)
        ? current.filter(k => k !== key)
        : [...current, key];
      return { ...c, [field]: next };
    }));
  };

  const updateTraitDescription = (chartId, traitIndex, description) => {
    setCharts(prev => prev.map(chart =>
      chart.id === chartId
        ? {
            ...chart,
            data: chart.data.map((trait, idx) =>
              idx === traitIndex ? { ...trait, description } : trait
            ),
          }
        : chart
    ));
  };

  const updateTraitValue = (chartId, subjectIndex, newValue) => {
    setCharts(prevCharts =>
      prevCharts.map(chart =>
        chart.id === chartId
          ? {
              ...chart,
              data: chart.data.map((trait, idx) =>
                idx === subjectIndex ? { ...trait, value: newValue } : trait
              )
            }
          : chart
      )
    );
  };

  const updateChartColor = (chartId, newColor) => {
    setCharts(prevCharts =>
      prevCharts.map(chart =>
        chart.id === chartId ? { ...chart, color: newColor } : chart
      )
    );
  };

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
      pruneAllComparisons(nextCharts);
      return nextCharts;
    });
  };

  const removeTrait = (chartId, subjectIndex) => {
    setCharts(prevCharts => {
      const nextCharts = prevCharts.map(chart =>
        chart.id === chartId
          ? {
              ...chart,
              data: chart.data.filter((_, idx) => idx !== subjectIndex)
            }
          : chart
      );
      pruneAllComparisons(nextCharts);
      return nextCharts;
    });
  };

  // Convert hex to HSL for color comparison
  const hexToHsl = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
      h *= 360;
    }
    return { h, s: s * 100, l: l * 100 };
  };

  // Generate dusky/gloomy colors using HSL, avoiding similar colors
  // Algorithm: Pick hues from moody palette, weight against existing chart hues
  const generateDuskyColor = (existingColors) => {
    const hueRanges = [
      { min: 0, max: 25 },      // Dusty reds/crimsons
      { min: 20, max: 45 },     // Muted oranges/terracotta  
      { min: 180, max: 210 },   // Muted teals/slate blues
      { min: 260, max: 290 },   // Dusty purples/mauves
      { min: 340, max: 360 },   // Deep roses
    ];
    
    // Get existing hues
    const existingHues = existingColors.map(c => hexToHsl(c).h);
    
    // Weight ranges by distance from existing hues (further = higher weight)
    const getMinHueDistance = (hue) => {
      if (existingHues.length === 0) return 180;
      return Math.min(...existingHues.map(eh => {
        const diff = Math.abs(hue - eh);
        return Math.min(diff, 360 - diff); // Handle wraparound
      }));
    };
    
    // Generate candidates and pick the one furthest from existing colors
    let bestHue = 0, bestDistance = -1;
    for (let i = 0; i < 10; i++) {
      const range = hueRanges[Math.floor(Math.random() * hueRanges.length)];
      const candidateHue = Math.floor(Math.random() * (range.max - range.min) + range.min);
      const distance = getMinHueDistance(candidateHue);
      if (distance > bestDistance) {
        bestDistance = distance;
        bestHue = candidateHue;
      }
    }
    
    const saturation = Math.floor(Math.random() * 30 + 25); // 25-55%
    const lightness = Math.floor(Math.random() * 20 + 38);  // 38-58%
    
    // Convert HSL to hex
    const hslToHex = (h, s, l) => {
      s /= 100;
      l /= 100;
      const a = s * Math.min(l, 1 - l);
      const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };
    
    return hslToHex(bestHue, saturation, lightness);
  };

  const addNewChart = () => {
    const newId = Math.max(...charts.map(c => c.id), 0) + 1;
    const existingColors = charts.map(c => c.color);
    const newChart = {
      id: newId,
      title: `New Chart ${newId}`,
      color: generateDuskyColor(existingColors),
      data: [
        { subject: "Trait 1", value: 50, fullMark: 100 },
        { subject: "Trait 2", value: 50, fullMark: 100 },
        { subject: "Trait 3", value: 50, fullMark: 100 }
      ]
    };
    setCharts(prevCharts => [...prevCharts, newChart]);
  };

  const removeChart = (chartId) => {
    setCharts(prevCharts => {
      const nextCharts = prevCharts.filter(chart => chart.id !== chartId);
      pruneAllComparisons(nextCharts);
      return nextCharts;
    });
  };

  const updateChartTitle = (chartId, newTitle) => {
    setCharts(prevCharts =>
      prevCharts.map(chart =>
        chart.id === chartId ? { ...chart, title: newTitle } : chart
      )
    );
  };

  const updateTraitName = (chartId, traitIndex, newName) => {
    if (!newName.trim()) return;
    setCharts(prevCharts => {
      const nextCharts = prevCharts.map(chart =>
        chart.id === chartId
          ? {
              ...chart,
              data: chart.data.map((trait, idx) =>
                idx === traitIndex ? { ...trait, subject: newName.trim() } : trait
              )
            }
          : chart
      );
      pruneAllComparisons(nextCharts);
      return nextCharts;
    });
  };

  const reorderCharts = (fromIndex, toIndex) => {
    setCharts(prevCharts => {
      const result = [...prevCharts];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  };

  const swapCharts = (indexA, indexB) => {
    setCharts(prevCharts => {
      const result = [...prevCharts];
      [result[indexA], result[indexB]] = [result[indexB], result[indexA]];
      return result;
    });
  };

  const reorderTraits = (chartId, fromIndex, toIndex) => {
    setCharts(prevCharts =>
      prevCharts.map(chart => {
        if (chart.id !== chartId) return chart;
        const newData = [...chart.data];
        const [removed] = newData.splice(fromIndex, 1);
        newData.splice(toIndex, 0, removed);
        return { ...chart, data: newData };
      })
    );
  };

  const importCharts = (newCharts, mode = 'replace', newComparisons = []) => {
    if (mode === 'replace') {
      setCharts(newCharts);
      const pruned = newComparisons
        .map((cmp, i) => ({
          id: i + 1,
          title: cmp.title || `Comparison ${i + 1}`,
          description: cmp.description || '',
          color: cmp.color || '#c73a3a',
          chartIds: pruneSelection(newCharts, cmp.chartIds || []),
          slotSortMode: cmp.slotSortMode || 'custom',
          rowSortMode: cmp.rowSortMode || 'custom',
          showDelta: cmp.showDelta === true,
          aggregateColumns: Array.isArray(cmp.aggregateColumns) ? cmp.aggregateColumns : [],
          aggregateRows: Array.isArray(cmp.aggregateRows) ? cmp.aggregateRows : [],
        }))
        .filter(c => c.chartIds.length >= 1);
      setComparisons(pruned);
    } else {
      setCharts(prev => [...prev, ...newCharts.map((c, i) => ({
        ...c,
        id: Math.max(...prev.map(p => p.id), 0) + i + 1
      }))]);
    }
  };

  const transferTrait = (fromChartId, fromIndex, toChartId, toIndex = -1) => {
    setCharts(prevCharts => {
      const fromChart = prevCharts.find(c => c.id === fromChartId);
      if (!fromChart || fromChart.data.length <= 2) return prevCharts; // Keep minimum 2 traits

      const trait = fromChart.data[fromIndex];

      const nextCharts = prevCharts.map(chart => {
        if (chart.id === fromChartId) {
          return {
            ...chart,
            data: chart.data.filter((_, idx) => idx !== fromIndex)
          };
        }
        if (chart.id === toChartId) {
          const newData = [...chart.data];
          if (toIndex === -1 || toIndex >= newData.length) {
            newData.push(trait);
          } else {
            newData.splice(toIndex, 0, trait);
          }
          return { ...chart, data: newData };
        }
        return chart;
      });

      pruneAllComparisons(nextCharts);
      return nextCharts;
    });
  };

  // ---- Project payload (round-trips through Supabase) ----------------------
  // Kept intentionally close to the live in-memory shape so Hakoniwa can read
  // payload.charts directly (id, title, color, data[{subject,value,fullMark}]).
  // `compareSelection` is a flat union of every chart id referenced by any
  // comparison — a convenience for the Hakoniwa embed, derived on serialize.
  const serializeProject = useCallback(() => {
    const compareSelection = Array.from(
      new Set(comparisons.flatMap(c => c.chartIds))
    );
    return {
      doxa_version: '1.0',
      title: analysisTitle,
      description: analysisDescription,
      charts,
      comparisons,
      compareSelection,
    };
  }, [analysisTitle, analysisDescription, charts, comparisons]);

  const loadProject = useCallback((payload) => {
    if (!payload || typeof payload !== 'object') return;
    const nextCharts = Array.isArray(payload.charts) ? payload.charts : [];
    const nextComparisons = Array.isArray(payload.comparisons)
      ? payload.comparisons.map(c => ({
          ...c,
          chartIds: pruneSelection(nextCharts, c.chartIds || []),
        }))
      : [];
    setCharts(nextCharts);
    setComparisons(nextComparisons);
    setAnalysisTitle(typeof payload.title === 'string' ? payload.title : DEFAULT_TITLE);
    setAnalysisDescription(typeof payload.description === 'string' ? payload.description : DEFAULT_DESCRIPTION);
    loadEpochRef.current += 1;
    setLoadEpoch(loadEpochRef.current);
  }, []);

  return (
    <ChartContext.Provider
      value={{
        charts,
        analysisTitle,
        analysisDescription,
        setAnalysisTitle,
        setAnalysisDescription,
        loadProject,
        serializeProject,
        loadEpoch,
        updateTraitValue,
        updateChartColor,
        addTrait,
        removeTrait,
        addNewChart,
        removeChart,
        updateChartTitle,
        updateTraitName,
        reorderCharts,
        swapCharts,
        reorderTraits,
        transferTrait,
        importCharts,
        duplicateChart,
        setChartSortMode,
        comparisons,
        addComparison,
        removeComparison,
        updateComparisonTitle,
        updateComparisonColor,
        setComparisonChartIds,
        duplicateComparison,
        reorderComparisons,
        setComparisonSlotSortMode,
        setComparisonRowSortMode,
        updateChartDescription,
        updateComparisonDescription,
        updateTraitDescription,
        setComparisonShowDelta,
        toggleComparisonAggregate,
      }}
    >
      {children}
    </ChartContext.Provider>
  );
}

export function useCharts() {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error('useCharts must be used within a ChartProvider');
  }
  return context;
}
