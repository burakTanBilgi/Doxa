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

  const addNewChart = () => {
    const newId = Math.max(...charts.map(c => c.id), 0) + 1;
    const colors = ['#c73a3a', '#b8b8b8', '#e05555', '#d0d0d0', '#a82e2e', '#888888'];
    const newChart = {
      id: newId,
      title: `New Chart ${newId}`,
      color: colors[(newId - 1) % colors.length],
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
        reorderTraits
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
