import { useState } from 'react';
import { useCharts } from '../context/ChartContext';
import { Plus, Trash2, X, Palette, ChevronDown, ChevronUp } from 'lucide-react';

function ChartControls({ chart }) {
  const { updateTraitValue, updateChartColor, addTrait, removeTrait, removeChart, updateChartTitle } = useCharts();
  const [newTraitName, setNewTraitName] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(chart.title);

  const handleAddTrait = () => {
    if (newTraitName.trim()) {
      addTrait(chart.id, newTraitName);
      setNewTraitName('');
    }
  };

  const handleTitleSave = () => {
    if (titleInput.trim()) {
      updateChartTitle(chart.id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <div
      className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50"
      style={{ borderLeftColor: chart.color, borderLeftWidth: '4px' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
              className="bg-slate-700 text-white px-2 py-1 rounded text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <h4
              className="text-white font-medium text-sm cursor-pointer hover:text-blue-400 transition-colors"
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit"
            >
              {chart.title}
            </h4>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="color"
              value={chart.color}
              onChange={(e) => updateChartColor(chart.id, e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
              title="Change chart color"
            />
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={() => removeChart(chart.id)}
            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
            title="Delete chart"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="space-y-3 mb-4">
            {chart.data.map((trait, index) => (
              <div key={`${chart.id}-${trait.subject}-${index}`} className="group">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 text-xs font-medium">
                    {trait.subject}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs font-mono w-8 text-right">
                      {trait.value}
                    </span>
                    {chart.data.length > 3 && (
                      <button
                        onClick={() => removeTrait(chart.id, index)}
                        className="p-0.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        title="Remove trait"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={trait.value}
                  onChange={(e) => updateTraitValue(chart.id, index, parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${chart.color} 0%, ${chart.color} ${trait.value}%, #475569 ${trait.value}%, #475569 100%)`
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTraitName}
              onChange={(e) => setNewTraitName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTrait()}
              placeholder="New trait name..."
              className="flex-1 bg-slate-700/50 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
            />
            <button
              onClick={handleAddTrait}
              disabled={!newTraitName.trim()}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ControlPanel() {
  const { charts, addNewChart } = useCharts();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Control Panel</h2>
        <button
          onClick={addNewChart}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Chart
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {charts.map(chart => (
          <ChartControls key={chart.id} chart={chart} />
        ))}
      </div>
    </div>
  );
}
