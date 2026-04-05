import { forwardRef } from 'react';
import { useCharts } from '../context/ChartContext';
import ChartDisplay from './ChartDisplay';

const VisualizationCanvas = forwardRef(function VisualizationCanvas(props, ref) {
  const { charts } = useCharts();

  return (
    <div
      ref={ref}
      className="bg-slate-900 rounded-xl p-6"
    >
      <h2 className="text-2xl font-bold text-white mb-6 text-center">
        Profile Analysis
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts.map(chart => (
          <ChartDisplay key={chart.id} chart={chart} />
        ))}
      </div>
      {charts.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">No charts yet.</p>
          <p className="text-sm mt-2">Add a chart from the control panel to get started.</p>
        </div>
      )}
    </div>
  );
});

export default VisualizationCanvas;
