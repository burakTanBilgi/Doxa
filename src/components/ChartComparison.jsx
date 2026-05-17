import { useMemo } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip
} from 'recharts';
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

      {view.chartType === 'radar' ? <RadarOverlay view={view} /> : <ScatterOverlay view={view} />}

      <DeltaTable view={view} />
    </div>
  );
}

function RadarOverlay({ view }) {
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
