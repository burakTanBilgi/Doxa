import { createContext, useContext, useState } from 'react';

const initialCharts = [
  {
    id: 1,
    title: "Core Layer: Big Five",
    color: "#c73a3a",
    data: [
      { subject: "Openness", value: 70, fullMark: 100 },
      { subject: "Conscientiousness", value: 85, fullMark: 100 },
      { subject: "Extraversion", value: 60, fullMark: 100 },
      { subject: "Agreeableness", value: 75, fullMark: 100 },
      { subject: "Neuroticism", value: 40, fullMark: 100 }
    ]
  },
  {
    id: 2,
    title: "Presentation Layer: Social Dynamics",
    color: "#b8b8b8",
    data: [
      { subject: "Chaos Potential", value: 80, fullMark: 100 },
      { subject: "Manipulation", value: 65, fullMark: 100 },
      { subject: "Secrecy", value: 90, fullMark: 100 },
      { subject: "Empathy", value: 45, fullMark: 100 },
      { subject: "Ego/Confidence", value: 85, fullMark: 100 }
    ]
  }
];

const ChartContext = createContext(null);

export function ChartProvider({ children }) {
  const [charts, setCharts] = useState(initialCharts);

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
    setCharts(prevCharts =>
      prevCharts.map(chart =>
        chart.id === chartId
          ? {
              ...chart,
              data: [
                ...chart.data,
                { subject: traitName.trim(), value: 50, fullMark: 100 }
              ]
            }
          : chart
      )
    );
  };

  const removeTrait = (chartId, subjectIndex) => {
    setCharts(prevCharts =>
      prevCharts.map(chart =>
        chart.id === chartId
          ? {
              ...chart,
              data: chart.data.filter((_, idx) => idx !== subjectIndex)
            }
          : chart
      )
    );
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
    setCharts(prevCharts => prevCharts.filter(chart => chart.id !== chartId));
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
    setCharts(prevCharts =>
      prevCharts.map(chart =>
        chart.id === chartId
          ? {
              ...chart,
              data: chart.data.map((trait, idx) =>
                idx === traitIndex ? { ...trait, subject: newName.trim() } : trait
              )
            }
          : chart
      )
    );
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

  const importCharts = (newCharts, mode = 'replace') => {
    if (mode === 'replace') {
      setCharts(newCharts);
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
      
      return prevCharts.map(chart => {
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
    });
  };

  return (
    <ChartContext.Provider
      value={{
        charts,
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
        importCharts
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
